import type { Source } from "../types";
import { spotify } from "./spotify";
import { qobuz } from "./qobuz";

export const SOURCES: readonly Source[] = [spotify, qobuz];

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

export { spotify, qobuz };
