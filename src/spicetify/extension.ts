// NAME: Spotify Details Extractor
// AUTHOR: afonsojramos
// DESCRIPTION: Extracts album information from Spotify and copies it to the clipboard.

/// <reference path="./globals.d.ts" />

import type { AlbumInfo } from "../shared/types";

(function SpotifyDetailsExtractor() {
  if (!Spicetify.CosmosAsync || !Spicetify.Platform) {
    setTimeout(SpotifyDetailsExtractor, 1000);
    return;
  }

  const item = new Spicetify.ContextMenu.Item(
    "Extract Album Info",
    async (uris) => {
      try {
        const uri = uris[0];
        if (!uri) return;
        const album = await fetchAlbum(uri);
        if (!album) {
          Spicetify.showNotification("Couldn't read album metadata.");
          return;
        }
        const json = JSON.stringify(album);
        try {
          await navigator.clipboard.writeText(json);
        } catch {
          // Fallback for contexts where clipboard API is gated
          await Spicetify.Platform.ClipboardAPI?.copy?.(json);
        }
        Spicetify.showNotification(`Copied ${album.title}'s info to the clipboard!`);
      } catch (e) {
        console.error(e);
        Spicetify.showNotification("Something went wrong. Please try again.");
      }
    },
    (uris) => {
      if (uris.length !== 1 || !uris[0]) return false;
      try {
        const uri = Spicetify.URI.fromString(uris[0]);
        return uri.type === Spicetify.URI.Type.ALBUM || uri.type === Spicetify.URI.Type.COLLECTION;
      } catch {
        return false;
      }
    },
    "download",
  );
  item.register();

  async function fetchAlbum(uri: string): Promise<AlbumInfo | null> {
    const parsed = Spicetify.URI.fromString(uri);
    const id = parsed.id;
    if (!id) return null;

    // Use Spicetify's internal GraphQL — same endpoint the Spotify client uses
    // to render the album page. No rate limit, no auth hassle.
    const gql = (Spicetify as unknown as {
      GraphQL: {
        Request: (def: unknown, vars: Record<string, unknown>) => Promise<{ data?: unknown }>;
        Definitions: { getAlbum: unknown };
      };
    }).GraphQL;

    const response = await gql.Request(gql.Definitions.getAlbum, {
      uri: `spotify:album:${id}`,
      locale: "",
      offset: 0,
      limit: 50,
    });

    const album = (response?.data as { albumUnion?: AlbumUnion } | undefined)?.albumUnion;
    if (!album?.name) return null;

    const artist = (album.artists?.items ?? [])
      .map((a) => a.profile?.name)
      .filter((n): n is string => !!n)
      .join(", ");
    const image = album.coverArt?.sources?.[0]?.url ?? "";
    const url = parsed.toURL().replace("play", "open");

    if (!artist || !image) return null;
    return { title: album.name, artist, image, url };
  }

  interface AlbumUnion {
    name: string;
    artists?: { items?: Array<{ profile?: { name?: string } }> };
    coverArt?: { sources?: Array<{ url?: string }> };
  }
})();
