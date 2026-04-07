export interface AlbumInfo {
  title: string;
  artist: string;
  image: string;
  url: string;
}

export type ExtractResult =
  | { ok: true; album: AlbumInfo }
  | { ok: false; reason: "not-album" | "missing-metadata"; detail?: string };
