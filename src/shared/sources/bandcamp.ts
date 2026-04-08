import type { AlbumInfo, ExtractResult, Source } from "../types";
import { firstMeta } from "./meta";

/**
 * Bandcamp source. Each artist lives on their own subdomain
 * (`{artist}.bandcamp.com/album/{slug}`) and ships SSR'd `og:*` meta
 * tags without auth.
 *
 * Quirks:
 *   - `og:type="album"` (NOT `music.album` like every other source).
 *   - `og:title="Title, by Artist"` — comma + " by " separator.
 *   - No numeric id; the URL itself is the canonical identifier.
 *
 * Because the "id" is the full URL, the Source's albumLinkPatterns and
 * host permissions need a wildcard subdomain match.
 */
export const bandcamp: Source = {
  id: "bandcamp",
  name: "Bandcamp",

  match(url) {
    return url.hostname.endsWith(".bandcamp.com") && url.pathname.startsWith("/album/");
  },

  async extract(url) {
    try {
      const canonical = canonicaliseBandcampUrl(url);
      if (!canonical) return { ok: false, reason: "not-album", detail: "unrecognised url" };

      const res = await fetch(canonical, { credentials: "omit" });
      if (!res.ok) return { ok: false, reason: "missing-metadata", detail: `HTTP ${res.status}` };
      const html = await res.text();
      return parseBandcampHtml(html, canonical);
    } catch (err) {
      return { ok: false, reason: "missing-metadata", detail: (err as Error).message };
    }
  },

  hostPermissions: ["*://*.bandcamp.com/*"],
  albumLinkPatterns: ["*://*.bandcamp.com/album/*"],
  contentScriptMatches: [],
};

/**
 * Strips query/fragment and returns the canonical
 * `https://{artist}.bandcamp.com/album/{slug}` form.
 */
export function canonicaliseBandcampUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!url.hostname.endsWith(".bandcamp.com")) return null;
  const match = /^(\/album\/[^/?#]+)/.exec(url.pathname);
  if (!match) return null;
  return `https://${url.hostname}${match[1]}`;
}

/**
 * Pure parser — takes Bandcamp album HTML and returns album info.
 *
 * Bandcamp uses `og:type="album"` rather than `music.album` — we accept
 * both to be safe. The title/artist come from `og:title="Title, by Artist"`.
 */
export function parseBandcampHtml(html: string, canonicalUrl: string): ExtractResult {
  const ogType = firstMeta(html, "og:type");
  if (ogType !== "album" && ogType !== "music.album") {
    return { ok: false, reason: "not-album", detail: ogType ?? "none" };
  }

  const ogTitle = firstMeta(html, "og:title");
  const ogImage = firstMeta(html, "og:image");
  if (!ogTitle || !ogImage) {
    return { ok: false, reason: "missing-metadata" };
  }

  const parsed = parseBandcampOgTitle(ogTitle);
  if (!parsed) {
    return { ok: false, reason: "missing-metadata", detail: "title format" };
  }

  const album: AlbumInfo = {
    title: parsed.title,
    artist: parsed.artist,
    image: ogImage,
    url: canonicalUrl,
  };
  return { ok: true, album };
}

/**
 * `"Lift Your Skinny Fists..., by Godspeed You Black Emperor!"`
 * → `{ title: "Lift Your Skinny Fists...", artist: "Godspeed You Black Emperor!" }`.
 *
 * Splits on the last occurrence of `", by "` so album titles containing
 * that exact sequence don't confuse the parser. The `og:site_name` meta
 * tag would be a more robust artist source, but `og:title` is universal.
 */
export function parseBandcampOgTitle(ogTitle: string): { title: string; artist: string } | null {
  const idx = ogTitle.lastIndexOf(", by ");
  if (idx === -1) return null;
  const title = ogTitle.slice(0, idx).trim();
  const artist = ogTitle.slice(idx + 5).trim();
  if (!title || !artist) return null;
  return { title, artist };
}
