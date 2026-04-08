import type { AlbumInfo, ExtractResult, Source } from "../types";
import { firstMeta } from "./meta";

/**
 * Tidal source. `tidal.com/browse/album/{id}` and `tidal.com/album/{id}`
 * both serve SSR'd `og:*` meta tags without auth. The embed variant
 * (`/browse/album/...`) is the reliable fetch target — direct `/album/...`
 * occasionally returns the homepage fallback.
 *
 * og:title format: "Artist - Title" — the artist comes FIRST and is
 * separated by " - " from the title. We split on the first occurrence.
 *
 * Homepage fallback detection: when an album id doesn't exist, Tidal
 * returns the homepage (og:url = "https://tidal.com/") instead of 404.
 * We reject any response whose og:url doesn't match `/album/{id}`.
 */
export const tidal: Source = {
  id: "tidal",
  name: "Tidal",

  match(url) {
    const host = url.hostname;
    const isTidalHost = host === "tidal.com" || host === "listen.tidal.com";
    return isTidalHost && /\/album\/\d+/.test(url.pathname);
  },

  async extract(url) {
    const id = extractTidalAlbumId(url);
    if (!id) return { ok: false, reason: "not-album", detail: "no album id in url" };

    try {
      const res = await fetch(`https://tidal.com/browse/album/${id}`, {
        credentials: "omit",
      });
      if (!res.ok) return { ok: false, reason: "missing-metadata", detail: `HTTP ${res.status}` };
      const html = await res.text();
      return parseTidalHtml(html, id);
    } catch (err) {
      return { ok: false, reason: "missing-metadata", detail: (err as Error).message };
    }
  },

  hostPermissions: ["*://*.tidal.com/*"],
  albumLinkPatterns: [
    "*://tidal.com/album/*",
    "*://tidal.com/browse/album/*",
    "*://listen.tidal.com/album/*",
  ],
  contentScriptMatches: [],
};

/**
 * Pulls the numeric album id from any Tidal URL shape:
 *   - tidal.com/album/{id}
 *   - tidal.com/browse/album/{id}
 *   - listen.tidal.com/album/{id}
 */
export function extractTidalAlbumId(raw: string): string | null {
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
 * Pure parser — takes the HTML of a Tidal album page and returns the
 * album info. Regex-based so it works in both browser and Bun contexts.
 */
export function parseTidalHtml(html: string, id: string): ExtractResult {
  const ogType = firstMeta(html, "og:type");
  if (ogType !== "music.album") {
    return { ok: false, reason: "not-album", detail: ogType ?? "none" };
  }

  const ogUrl = firstMeta(html, "og:url") ?? "";
  // Homepage fallback detection: Tidal serves the homepage when an id
  // doesn't exist, and og:url points at "https://tidal.com/" rather than
  // /album/{id}.
  if (!/\/album\/\d+/.test(ogUrl)) {
    return { ok: false, reason: "not-album", detail: "homepage fallback" };
  }

  const ogTitle = firstMeta(html, "og:title");
  const ogImage = firstMeta(html, "og:image");
  if (!ogTitle || !ogImage) {
    return { ok: false, reason: "missing-metadata" };
  }

  const parsed = parseTidalOgTitle(ogTitle);
  if (!parsed) {
    return { ok: false, reason: "missing-metadata", detail: "title format" };
  }

  const album: AlbumInfo = {
    title: parsed.title,
    artist: parsed.artist,
    image: ogImage,
    url: `https://tidal.com/album/${id}`,
  };
  return { ok: true, album };
}

/**
 * `"U2 - Achtung Baby"` → `{ artist: "U2", title: "Achtung Baby" }`.
 *
 * Splits on the first occurrence of " - " so that album titles containing
 * " - " themselves don't confuse the parser (artist names rarely do).
 */
export function parseTidalOgTitle(ogTitle: string): { title: string; artist: string } | null {
  const idx = ogTitle.indexOf(" - ");
  if (idx === -1) return null;
  const artist = ogTitle.slice(0, idx).trim();
  const title = ogTitle.slice(idx + 3).trim();
  if (!artist || !title) return null;
  return { artist, title };
}

