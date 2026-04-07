import type { ExtractResult } from "./types";
import { routeUrl } from "./sources";

/**
 * High-level entry point: routes a URL to the owning source and delegates
 * extraction. Returns `{ ok: false, reason: "not-album" }` if no source
 * recognises the URL.
 */
export async function extractAlbumFromUrl(url: string): Promise<ExtractResult> {
  const source = routeUrl(url);
  if (!source) {
    return { ok: false, reason: "not-album", detail: "unsupported source" };
  }
  return source.extract(url);
}

// Backwards-compat alias — used by callers written against the v3 API.
export const extractAlbumInfoFromUrl = extractAlbumFromUrl;
