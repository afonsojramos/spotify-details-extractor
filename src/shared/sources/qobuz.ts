import type { AlbumInfo, ExtractResult, Source } from "../types";

/**
 * Qobuz source. `play.qobuz.com` is a pure React shell with no metadata,
 * but `www.qobuz.com/{locale}/album/{slug}/{id}` is fully server-rendered
 * with `og:*` meta tags. Better still, `www.qobuz.com/us-en/album/-/{id}`
 * with a placeholder slug **redirects** to the canonical URL — so given
 * an album ID from any source URL shape, we normalise to that bridge URL
 * and follow the redirect.
 *
 * Qobuz pages ship **two** `og:type` meta tags (`article` and `music.album`);
 * we scan all matches, not just the first.
 */
export const qobuz: Source = {
  id: "qobuz",
  name: "Qobuz",

  match(url) {
    const host = url.hostname;
    const isQobuzHost =
      host === "www.qobuz.com" ||
      host === "play.qobuz.com" ||
      host === "open.qobuz.com" ||
      host === "qobuz.com";
    return isQobuzHost && /\/album\//.test(url.pathname);
  },

  async extract(url) {
    const id = extractQobuzAlbumId(url);
    if (!id) return { ok: false, reason: "not-album", detail: "no album id in url" };

    try {
      // Always fetch via us-en so `og:description` is in English — we anchor
      // our title/artist parser on that format below.
      const res = await fetch(`https://www.qobuz.com/us-en/album/-/${id}`, {
        credentials: "omit",
        redirect: "follow",
      });
      if (!res.ok) return { ok: false, reason: "missing-metadata", detail: `HTTP ${res.status}` };
      const html = await res.text();
      return parseQobuzHtml(html, id);
    } catch (err) {
      return { ok: false, reason: "missing-metadata", detail: (err as Error).message };
    }
  },

  hostPermissions: ["*://*.qobuz.com/*"],
  albumLinkPatterns: [
    "*://www.qobuz.com/*/album/*",
    "*://play.qobuz.com/album/*",
    "*://open.qobuz.com/album/*",
  ],
  contentScriptMatches: ["*://play.qobuz.com/*"],
};

/**
 * Pulls the album id from any of the Qobuz URL shapes we care about:
 *   - www.qobuz.com/{locale}/album/{slug}/{id}
 *   - www.qobuz.com/album/-/{id}       (our own bridge URL)
 *   - play.qobuz.com/album/{id}
 *   - open.qobuz.com/album/{id}
 *
 * Ids are either 13-digit UPCs or opaque alphanumerics like `cayd4x3o39hma`.
 */
export function extractQobuzAlbumId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const albumIdx = segments.indexOf("album");
  if (albumIdx === -1) return null;
  for (let i = segments.length - 1; i > albumIdx; i--) {
    const candidate = segments[i]!;
    if (/^[A-Za-z0-9]{8,}$/.test(candidate)) return candidate;
  }
  return null;
}

/**
 * Pure parser exposed for testing — takes a Qobuz album HTML page and
 * reads the `og:*` meta tags via regex. Handles Qobuz's double `og:type`
 * quirk (two meta tags, one `article` and one `music.album`).
 *
 * Title/artist resolution priority:
 *   1. `og:description` matching the English template
 *      `"Listen to unlimited streaming or download <TITLE> by <ARTIST> in Hi-Res..."`.
 *      Robust against album/artist names containing commas.
 *   2. `og:title` with `lastIndexOf(",")` as the split point — fallback for
 *      cases where the description doesn't match the template.
 *
 * The output `url` is the listener-facing `play.qobuz.com/album/{id}` form,
 * mirroring Spotify's `open.spotify.com/album/{id}`. We still fetch the
 * catalog page (`www.qobuz.com/.../album/{slug}/{id}`) for metadata, but
 * that's an implementation detail; end users write `play.qobuz.com` URLs
 * into their JSON databases.
 *
 * Regex is intentional: this parser runs in both browser (content script)
 * and Bun (CLI) contexts, and Bun doesn't ship a DOMParser.
 */
export function parseQobuzHtml(html: string, id: string): ExtractResult {
  const types = allMetas(html, "og:type");
  if (!types.includes("music.album")) {
    return { ok: false, reason: "not-album", detail: types.join(",") || "none" };
  }

  const ogTitle = firstMeta(html, "og:title");
  const ogImage = firstMeta(html, "og:image");
  const ogDescription = firstMeta(html, "og:description");

  if (!ogTitle || !ogImage) {
    return { ok: false, reason: "missing-metadata" };
  }

  const parsed = parseTitleAndArtist(ogTitle, ogDescription);
  if (!parsed) {
    return { ok: false, reason: "missing-metadata", detail: "title format" };
  }

  const album: AlbumInfo = {
    title: parsed.title,
    artist: parsed.artist,
    image: ogImage,
    url: `https://play.qobuz.com/album/${id}`,
  };
  return { ok: true, album };
}

/**
 * Extract title and artist, preferring `og:description` (unambiguous English
 * template) and falling back to `og:title` (which can be ambiguous when the
 * album title or artist name contains commas).
 */
export function parseTitleAndArtist(
  ogTitle: string,
  ogDescription: string | null,
): { title: string; artist: string } | null {
  if (ogDescription) {
    const fromDesc = parseOgDescription(ogDescription);
    if (fromDesc) return fromDesc;
  }
  return parseOgTitle(ogTitle);
}

/**
 * `"Listen to unlimited streaming or download TITLE by ARTIST in Hi-Res quality on Qobuz..."`
 *
 * Greedy `(.+)` captures the longest run before " by ", which means if the
 * title contains " by " (e.g. "Track by Track"), backtracking from the
 * " in Hi-Res" anchor still gives us the correct split on the LAST " by ".
 * The remaining pathological case (an artist name itself ending in " by X")
 * is vanishingly rare and not worth the complexity to catch.
 */
export function parseOgDescription(
  ogDescription: string,
): { title: string; artist: string } | null {
  const match = /download (.+) by (.+) in Hi-Res quality on Qobuz/.exec(ogDescription);
  if (!match || !match[1] || !match[2]) return null;
  return { title: match[1].trim(), artist: match[2].trim() };
}

/**
 * `"Currents, Tame Impala - Qobuz"` → `{ title: "Currents", artist: "Tame Impala" }`.
 *
 * Uses the **last** comma as the split point. Wrong for the pathological case
 * where both title and artist contain commas (e.g. "Foo, Bar" by "Black Country,
 * New Road") — in those cases the description parser is the correct path.
 * This fallback exists only for pages where og:description is missing or in
 * a non-English locale.
 */
export function parseOgTitle(ogTitle: string): { title: string; artist: string } | null {
  const withoutSuffix = ogTitle.replace(/\s*-\s*Qobuz\s*$/, "").trim();
  const lastComma = withoutSuffix.lastIndexOf(",");
  if (lastComma === -1) return null;
  const title = withoutSuffix.slice(0, lastComma).trim();
  const artist = withoutSuffix.slice(lastComma + 1).trim();
  if (!title || !artist) return null;
  return { title, artist };
}

// --- Meta tag extraction ----------------------------------------------------

/**
 * Returns every `content` value for meta tags matching `property=X` or
 * `name=X`, in document order. Two regex passes handle both attribute
 * orders (`property` before `content` and vice versa).
 */
function allMetas(html: string, property: string): string[] {
  const esc = escapeRegex(property);
  const propFirst = new RegExp(
    `<meta\\b[^>]*?(?:property|name)=["']${esc}["'][^>]*?content=["']([^"']*)["']`,
    "gi",
  );
  const contentFirst = new RegExp(
    `<meta\\b[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${esc}["']`,
    "gi",
  );
  const values: string[] = [];
  for (const re of [propFirst, contentFirst]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      if (match[1]) values.push(decodeEntities(match[1].trim()));
    }
  }
  return values;
}

function firstMeta(html: string, property: string): string | null {
  return allMetas(html, property)[0] ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Minimal HTML-entity decoder. Covers the small set that realistically
 * appears in album/artist metadata (quotes, apostrophes, ampersands,
 * dashes, accented Latin characters from European artist names) plus
 * the generic numeric-ref escape hatch.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê")
    .replace(/&agrave;/g, "à")
    .replace(/&acirc;/g, "â")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&ocirc;/g, "ô")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&ccedil;/g, "ç")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
