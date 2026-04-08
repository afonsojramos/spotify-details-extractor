import type { AlbumInfo, ExtractResult, Source } from "../types";
import { firstMeta } from "./meta";

/**
 * Deezer source. `deezer.com/album/{id}` serves SSR'd `og:*` meta tags
 * without auth. The page is geo-redirected to `deezer.com/{locale}/album/{id}`
 * and `og:description` is **locale-dependent** — e.g.
 *   en: "Tame Impala - album - 2015 - 13 songs"
 *   es: "Tame Impala - álbum - 2015 - 13 canciones"
 *   fr: "Tame Impala - album - 2015 - 13 chansons"
 *
 * We sidestep the locale problem by splitting `og:description` on the
 * universal " - " separator and taking the first segment as the artist
 * name (locale-agnostic because the separator is a hyphen, not a word).
 *
 * `og:title` is just the album title, no artist.
 */
export const deezer: Source = {
  id: "deezer",
  name: "Deezer",

  match(url) {
    const host = url.hostname;
    const isDeezerHost = host === "www.deezer.com" || host === "deezer.com";
    return isDeezerHost && /\/album\/\d+/.test(url.pathname);
  },

  async extract(url) {
    const id = extractDeezerAlbumId(url);
    if (!id) return { ok: false, reason: "not-album", detail: "no album id in url" };

    try {
      const res = await fetch(`https://www.deezer.com/album/${id}`, {
        credentials: "omit",
        redirect: "follow",
      });
      if (!res.ok) return { ok: false, reason: "missing-metadata", detail: `HTTP ${res.status}` };
      const html = await res.text();
      return parseDeezerHtml(html, id);
    } catch (err) {
      return { ok: false, reason: "missing-metadata", detail: (err as Error).message };
    }
  },

  hostPermissions: ["*://*.deezer.com/*"],
  albumLinkPatterns: ["*://www.deezer.com/*/album/*", "*://www.deezer.com/album/*", "*://deezer.com/album/*"],
  contentScriptMatches: [],
};

/** Extract the numeric album id from any Deezer URL shape. */
export function extractDeezerAlbumId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const match = /\/album\/(\d+)/.exec(url.pathname);
  return match?.[1] ?? null;
}

/**
 * Pure parser — takes Deezer album HTML and returns album info.
 * Extracts artist from og:description via the locale-agnostic " - " split.
 */
export function parseDeezerHtml(html: string, id: string): ExtractResult {
  const ogType = firstMeta(html, "og:type");
  if (ogType !== "music.album") {
    return { ok: false, reason: "not-album", detail: ogType ?? "none" };
  }

  const title = firstMeta(html, "og:title");
  const image = firstMeta(html, "og:image");
  const description = firstMeta(html, "og:description");
  const artist = parseArtistFromDeezerDescription(description);

  if (!title || !image || !artist) {
    return { ok: false, reason: "missing-metadata" };
  }

  const album: AlbumInfo = {
    title,
    artist,
    image,
    url: `https://www.deezer.com/album/${id}`,
  };
  return { ok: true, album };
}

/**
 * `"Tame Impala - album - 2015 - 13 songs"` → `"Tame Impala"`.
 *
 * First ` - ` separates artist from the metadata tail. Works across
 * locales because ` - ` (space-hyphen-space) is language-independent.
 */
export function parseArtistFromDeezerDescription(description: string | null): string | null {
  if (!description) return null;
  const idx = description.indexOf(" - ");
  if (idx === -1) return null;
  const artist = description.slice(0, idx).trim();
  return artist || null;
}
