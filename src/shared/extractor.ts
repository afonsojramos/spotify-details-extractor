import type { AlbumInfo, ExtractResult } from "./types";

/**
 * Fetches album metadata via Spotify's embed endpoint.
 *
 * Why the embed endpoint:
 *   - `open.spotify.com/album/{id}` returns a minimal SPA shell when the
 *     caller is logged in (no og:* tags), so scraping the live page is
 *     unreliable.
 *   - `open.spotify.com/embed/album/{id}` is designed for iframe consumption,
 *     always serves full SSR output, and requires no auth. It ships a
 *     `<script id="__NEXT_DATA__">` blob with the entity we need.
 *
 * Returns ok=false with reason="not-album" for podcasts/episodes/shows.
 */
export async function extractAlbumInfoFromUrl(url: string): Promise<ExtractResult> {
  const parsed = parseSpotifyUrl(url);
  if (!parsed) return { ok: false, reason: "not-album", detail: "unrecognised url" };
  if (parsed.type !== "album") return { ok: false, reason: "not-album", detail: parsed.type };

  try {
    const res = await fetch(`https://open.spotify.com/embed/album/${parsed.id}`, {
      credentials: "omit",
    });
    if (!res.ok) return { ok: false, reason: "missing-metadata", detail: `HTTP ${res.status}` };
    const html = await res.text();
    return extractAlbumInfoFromEmbedHtml(html, parsed.id);
  } catch (err) {
    return { ok: false, reason: "missing-metadata", detail: (err as Error).message };
  }
}

/**
 * Pure parser exposed for testing — takes the raw HTML of an
 * `/embed/album/{id}` page and returns the album info.
 */
export function extractAlbumInfoFromEmbedHtml(html: string, id: string): ExtractResult {
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

/** `https://open.spotify.com/album/ID?...` → { type: "album", id: "ID" } */
export function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)spotify\.com$/.test(u.hostname)) return null;
    const match = /^\/(?:embed\/)?([^/]+)\/([^/?#]+)/.exec(u.pathname);
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
