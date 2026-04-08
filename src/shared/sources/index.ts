import type { Source } from "../types";
import { spotify } from "./spotify";
import { qobuz } from "./qobuz";
import { tidal } from "./tidal";
import { appleMusic } from "./apple-music";
import { deezer } from "./deezer";
import { bandcamp } from "./bandcamp";

export const SOURCES: readonly Source[] = [spotify, qobuz, tidal, appleMusic, deezer, bandcamp];

/**
 * Route a URL to the source that owns it, or null if no source matches.
 * Malformed URLs return null rather than throwing.
 */
export function routeUrl(raw: string): Source | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  return SOURCES.find((s) => s.match(url)) ?? null;
}

export { spotify, qobuz, tidal, appleMusic, deezer, bandcamp };
