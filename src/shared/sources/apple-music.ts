import type { AlbumInfo, ExtractResult, Source } from "../types";
import { firstMeta } from "./meta";

/**
 * Apple Music source. `music.apple.com/{locale}/album/{slug}/{id}` serves
 * SSR'd meta tags without auth, and — crucially — ships a clean
 * `apple:title` (just the title, no decoration) and `apple:description`
 * following the same "Listen to {TITLE} by {ARTIST} on Apple Music."
 * template Qobuz uses, which makes parsing trivial.
 *
 * The `/us/album/{id}` URL shape (no slug) redirects to the canonical
 * `/us/album/{slug}/{id}` so we can fetch with just the id.
 */
export const appleMusic: Source = {
  id: "apple-music",
  name: "Apple Music",

  match(url) {
    if (url.hostname !== "music.apple.com") return false;
    // Accepted path shapes (anchored to avoid matching `/album/` buried deep
    // in a non-album path like `/us/playlist/.../album/.../123`):
    //   /album/{id}
    //   /{locale}/album/{id}
    //   /{locale}/album/{slug}/{id}
    return /^\/(?:[a-z]{2}\/)?album\/(?:[^/]+\/)?\d+\/?$/.test(url.pathname);
  },

  async extract(url) {
    const id = extractAppleMusicAlbumId(url);
    if (!id) return { ok: false, reason: "not-album", detail: "no album id in url" };

    try {
      // Fetch via the id-only form; Apple redirects to the canonical slug URL.
      const res = await fetch(`https://music.apple.com/us/album/${id}`, {
        credentials: "omit",
        redirect: "follow",
      });
      if (!res.ok) return { ok: false, reason: "missing-metadata", detail: `HTTP ${res.status}` };
      const html = await res.text();
      return parseAppleMusicHtml(html, id);
    } catch (err) {
      return { ok: false, reason: "missing-metadata", detail: (err as Error).message };
    }
  },

  hostPermissions: ["*://music.apple.com/*"],
  albumLinkPatterns: ["*://music.apple.com/*/album/*", "*://music.apple.com/album/*"],
  contentScriptMatches: [],
};

/**
 * Extract the numeric id from any Apple Music album URL. Requires an
 * `/album/` path segment before the id so artist URLs like
 * `/us/artist/tame-impala/428463` don't get accepted.
 */
export function extractAppleMusicAlbumId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const match = /\/album\/(?:[^/]+\/)?(\d+)(?:[/?#]|$)/.exec(url.pathname);
  return match?.[1] ?? null;
}

/**
 * Pure parser — takes Apple Music album HTML and returns album info.
 * Uses `apple:title` for the clean title, `apple:description` for the
 * artist extraction (same English template as Qobuz), `og:image` for
 * the cover, and falls back to `og:title` parsing if `apple:*` is missing.
 */
export function parseAppleMusicHtml(html: string, id: string): ExtractResult {
  const ogType = firstMeta(html, "og:type");
  if (ogType !== "music.album") {
    return { ok: false, reason: "not-album", detail: ogType ?? "none" };
  }

  const title =
    firstMeta(html, "apple:title") ?? parseTitleFromOgTitle(firstMeta(html, "og:title"));
  const artist =
    parseArtistFromAppleDescription(firstMeta(html, "apple:description")) ??
    parseArtistFromOgTitle(firstMeta(html, "og:title"));
  const image = firstMeta(html, "og:image");

  if (!title || !artist || !image) {
    return { ok: false, reason: "missing-metadata" };
  }

  const album: AlbumInfo = {
    title,
    artist,
    image,
    url: `https://music.apple.com/album/${id}`,
  };
  return { ok: true, album };
}

/**
 * `"Listen to Currents by Tame Impala on Apple Music. 2015. 13 Songs."`
 * → `"Tame Impala"`. Greedy `.+` before ` by ` lets the title contain
 * "by" — backtracking from the " on Apple Music" anchor wins.
 */
export function parseArtistFromAppleDescription(description: string | null): string | null {
  if (!description) return null;
  // Anchored at the start so free-text descriptions that happen to contain
  // "Listen to X by Y on Apple Music" can't bleed in.
  const match = /^Listen to .+ by (.+) on Apple Music/.exec(description);
  return match?.[1]?.trim() ?? null;
}

/**
 * Fallback: og:title is `"Currents by Tame Impala on Apple Music"`.
 * Same greedy-backtracking trick.
 */
function parseTitleFromOgTitle(ogTitle: string | null): string | null {
  if (!ogTitle) return null;
  const match = /^(.+?) by .+ on Apple Music$/.exec(ogTitle);
  return match?.[1]?.trim() ?? null;
}

function parseArtistFromOgTitle(ogTitle: string | null): string | null {
  if (!ogTitle) return null;
  const match = /^.+ by (.+) on Apple Music$/.exec(ogTitle);
  return match?.[1]?.trim() ?? null;
}
