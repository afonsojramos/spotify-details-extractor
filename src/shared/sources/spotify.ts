import type { AlbumInfo, ExtractResult, Source } from "../types";

/**
 * Spotify source. Fetches album metadata via the `/embed/album/{id}` endpoint,
 * which is designed for iframe consumption and always serves full SSR output,
 * regardless of the caller's auth state.
 */
export const spotify: Source = {
  id: "spotify",
  name: "Spotify",

  match(url) {
    return (
      /(^|\.)spotify\.com$/.test(url.hostname) &&
      // Match /album/..., /embed/album/..., and /intl-XX/album/...
      // Spotify serves geo-localised URLs like /intl-pt/album/{id} to users
      // in some regions; they should route exactly like the canonical path.
      /^\/(?:embed\/|intl-[a-z]+\/)?album\//.test(url.pathname)
    );
  },

  async extract(url) {
    const parsed = parseSpotifyUrl(url);
    if (!parsed) return { ok: false, reason: "not-album", detail: "unrecognised url" };
    if (parsed.type !== "album") return { ok: false, reason: "not-album", detail: parsed.type };

    try {
      const res = await fetch(`https://open.spotify.com/embed/album/${parsed.id}`, {
        credentials: "omit",
      });
      if (!res.ok) return { ok: false, reason: "missing-metadata", detail: `HTTP ${res.status}` };
      const html = await res.text();
      return parseEmbedHtml(html, parsed.id);
    } catch (err) {
      return { ok: false, reason: "missing-metadata", detail: (err as Error).message };
    }
  },

  hostPermissions: ["*://*.spotify.com/*"],
  albumLinkPatterns: ["*://open.spotify.com/album/*"],
  contentScriptMatches: ["*://open.spotify.com/*"],
};

/**
 * Pure parser exposed for testing — takes the raw HTML of an
 * `/embed/album/{id}` page and returns the album info.
 */
export function parseEmbedHtml(html: string, id: string): ExtractResult {
  const match = /<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/.exec(html);
  if (!match?.[1]) return { ok: false, reason: "missing-metadata", detail: "no __NEXT_DATA__" };

  let entity: EmbedEntity | undefined;
  try {
    const data = JSON.parse(match[1]) as EmbedNextData;
    entity = data?.props?.pageProps?.state?.data?.entity;
  } catch (err) {
    return { ok: false, reason: "missing-metadata", detail: (err as Error).message };
  }

  if (!entity) return { ok: false, reason: "missing-metadata", detail: "no entity" };
  if (entity.type !== "album") {
    return { ok: false, reason: "not-album", detail: entity.type ?? "unknown" };
  }

  const title = entity.name?.trim();
  const artist = entity.subtitle?.trim();
  const images = entity.visualIdentity?.image ?? [];
  // Prefer the largest available image (typically 640×640).
  const image = images.reduce<string>((best, img) => {
    if (!img?.url) return best;
    const current = images.find((i) => i.url === best);
    if (!best) return img.url;
    return (img.maxWidth ?? 0) > (current?.maxWidth ?? 0) ? img.url : best;
  }, "");

  if (!title || !artist || !image) {
    return { ok: false, reason: "missing-metadata", detail: "entity fields" };
  }

  const album: AlbumInfo = {
    title,
    artist,
    image,
    url: `https://open.spotify.com/album/${id}`,
  };
  return { ok: true, album };
}

/**
 * `https://open.spotify.com/album/ID?...` → `{ type: "album", id: "ID" }`.
 * Also handles the `/embed/album/ID` and `/intl-XX/album/ID` URL shapes.
 */
export function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)spotify\.com$/.test(u.hostname)) return null;
    const match = /^\/(?:embed\/|intl-[a-z]+\/)?([^/]+)\/([^/?#]+)/.exec(u.pathname);
    if (!match) return null;
    return { type: match[1] ?? "", id: match[2] ?? "" };
  } catch {
    return null;
  }
}

// --- __NEXT_DATA__ shapes (narrow — we only touch what we read) ------------

interface EmbedNextData {
  props?: { pageProps?: { state?: { data?: { entity?: EmbedEntity } } } };
}

interface EmbedEntity {
  type?: string;
  name?: string;
  subtitle?: string;
  visualIdentity?: { image?: Array<{ url?: string; maxWidth?: number }> };
}
