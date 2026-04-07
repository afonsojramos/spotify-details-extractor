export interface AlbumInfo {
  title: string;
  artist: string;
  image: string;
  url: string;
}

export type ExtractResult =
  | { ok: true; album: AlbumInfo }
  | { ok: false; reason: "not-album" | "missing-metadata"; detail?: string };

/**
 * A pluggable album source (Spotify, Qobuz, ...). Each source owns its own
 * URL matching, extraction, and the MV3 manifest patterns it needs.
 */
export interface Source {
  readonly id: "spotify" | "qobuz";
  readonly name: string;
  /** Does this URL belong to this source? */
  match(url: URL): boolean;
  /** Fetch and parse album metadata for a URL `match` returned true on. */
  extract(url: string): Promise<ExtractResult>;
  /** MV3 `host_permissions` patterns required for network fetches. */
  readonly hostPermissions: readonly string[];
  /** MV3 `contextMenus.targetUrlPatterns` for album links. */
  readonly albumLinkPatterns: readonly string[];
  /** MV3 `content_scripts.matches` for in-app menu injection, if any. */
  readonly contentScriptMatches: readonly string[];
}
