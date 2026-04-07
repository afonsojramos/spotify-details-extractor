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
      const res = await fetch(`https://www.qobuz.com/us-en/album/-/${id}`, {
        credentials: "omit",
        // Let fetch follow the redirect to the canonical slug URL.
        redirect: "follow",
      });
      if (!res.ok) return { ok: false, reason: "missing-metadata", detail: `HTTP ${res.status}` };
      const html = await res.text();
      return parseQobuzHtml(html);
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

  // Last path segment that looks like an id.
  const segments = url.pathname.split("/").filter(Boolean);
  const albumIdx = segments.indexOf("album");
  if (albumIdx === -1) return null;
  // The last segment after "album" that matches the id shape.
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
 * Regex is intentional: this parser runs in both browser (content script)
 * and Bun (CLI) contexts, and Bun doesn't ship a DOMParser.
 */
export function parseQobuzHtml(html: string): ExtractResult {
  const types = allMetas(html, "og:type");
  if (!types.includes("music.album")) {
    return { ok: false, reason: "not-album", detail: types.join(",") || "none" };
  }

  const ogTitle = firstMeta(html, "og:title");
  const ogImage = firstMeta(html, "og:image");
  const ogUrl = firstMeta(html, "og:url");

  if (!ogTitle || !ogImage || !ogUrl) {
    return { ok: false, reason: "missing-metadata" };
  }

  const parsed = parseOgTitle(ogTitle);
  if (!parsed) {
    return { ok: false, reason: "missing-metadata", detail: "title format" };
  }

  const album: AlbumInfo = {
    title: parsed.title,
    artist: parsed.artist,
    image: ogImage,
    url: ogUrl,
  };
  return { ok: true, album };
}

function allMetas(html: string, property: string): string[] {
  // Matches <meta property="KEY" content="VAL" /> with either attribute order.
  const pattern = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escapeRegex(property)}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapeRegex(property)}["']`,
    "gi",
  );
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const value = match[1] ?? match[2];
    if (value) values.push(decodeEntities(value.trim()));
  }
  return values;
}

function firstMeta(html: string, property: string): string | null {
  return allMetas(html, property)[0] ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/**
 * `"Currents, Tame Impala - Qobuz"` → `{ title: "Currents", artist: "Tame Impala" }`.
 *
 * The " - Qobuz" suffix is always present; the split between title and artist
 * is the last comma before the suffix. Using the last comma handles album
 * titles that themselves contain commas.
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
