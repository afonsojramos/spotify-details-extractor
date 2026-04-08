import { describe, test, expect } from "bun:test";
import { parseSpotifyUrl, parseEmbedHtml, collectAlbumArtists, spotify } from "./spotify";

// Spotify's non-breaking-space separator between track-subtitle artists.
const SEP = "\u002c\u00a0";

// --- Source.match -----------------------------------------------------------

describe("spotify.match", () => {
  test.each([
    ["canonical album", "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv", true],
    ["intl-pt album", "https://open.spotify.com/intl-pt/album/79dL7FLiJFOO0EoehUHQBv", true],
    ["intl-es album", "https://open.spotify.com/intl-es/album/79dL7FLiJFOO0EoehUHQBv", true],
    ["embed album", "https://open.spotify.com/embed/album/79dL7FLiJFOO0EoehUHQBv", true],
    ["album with query", "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv?highlight=x", true],
    ["show (podcast)", "https://open.spotify.com/show/5xrGlmos4BtbmZR7g4wAzK", false],
    ["track", "https://open.spotify.com/track/2X485T9Z5Ly0xyaghN73ed", false],
    ["playlist", "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", false],
    ["other host", "https://example.com/album/foo", false],
  ])("match(%s) → %p", (_label, url, expected) => {
    expect(spotify.match(new URL(url))).toBe(expected);
  });
});

// --- parseSpotifyUrl --------------------------------------------------------

describe("parseSpotifyUrl", () => {
  test.each([
    [
      "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv",
      { type: "album", id: "79dL7FLiJFOO0EoehUHQBv" },
    ],
    [
      "https://open.spotify.com/embed/album/79dL7FLiJFOO0EoehUHQBv",
      { type: "album", id: "79dL7FLiJFOO0EoehUHQBv" },
    ],
    [
      "https://open.spotify.com/intl-pt/album/79dL7FLiJFOO0EoehUHQBv",
      { type: "album", id: "79dL7FLiJFOO0EoehUHQBv" },
    ],
    [
      "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv?highlight=spotify:track:abc",
      { type: "album", id: "79dL7FLiJFOO0EoehUHQBv" },
    ],
    [
      "https://open.spotify.com/show/5xrGlmos4BtbmZR7g4wAzK",
      { type: "show", id: "5xrGlmos4BtbmZR7g4wAzK" },
    ],
    [
      "https://open.spotify.com/track/2X485T9Z5Ly0xyaghN73ed",
      { type: "track", id: "2X485T9Z5Ly0xyaghN73ed" },
    ],
  ])("%s → %o", (url, expected) => {
    expect(parseSpotifyUrl(url)).toEqual(expected);
  });

  test.each([
    ["not a url", "not a url"],
    ["wrong host", "https://example.com/album/foo"],
  ])("%s → null", (_label, url) => {
    expect(parseSpotifyUrl(url)).toBeNull();
  });
});

// --- collectAlbumArtists ----------------------------------------------------

describe("collectAlbumArtists", () => {
  test("single artist with comma in name (Tyler, The Creator) — trackList uses regular comma-space, no NBSP", () => {
    // Every track subtitle is the literal "Tyler, The Creator". Splitting on
    // NBSP-separator leaves it intact; the comma-space inside the name is
    // NOT a separator.
    expect(
      collectAlbumArtists({
        type: "album",
        subtitle: "Tyler, The Creator",
        trackList: [
          { subtitle: "Tyler, The Creator" },
          { subtitle: "Tyler, The Creator" },
          { subtitle: "Tyler, The Creator" },
        ],
      }),
    ).toBe("Tyler, The Creator");
  });

  test("duo where every track lists both artists via NBSP separator (Watch the Throne)", () => {
    // entity.subtitle collapses to JAŸ-Z but both artists appear on 100% of tracks.
    expect(
      collectAlbumArtists({
        type: "album",
        subtitle: "JAŸ-Z",
        trackList: [
          { subtitle: `JAŸ-Z${SEP}Kanye West${SEP}Frank Ocean` },
          { subtitle: `JAŸ-Z${SEP}Kanye West${SEP}Beyoncé` },
          { subtitle: `JAŸ-Z${SEP}Kanye West` },
          { subtitle: `JAŸ-Z${SEP}Kanye West${SEP}Otis Redding` },
        ],
      }),
    ).toBe("JAŸ-Z, Kanye West");
  });

  test("collaborator on 16/17 tracks qualifies at 80% threshold (Piñata-style)", () => {
    const tracks = Array.from({ length: 17 }, (_, i) => ({
      // Freddie Gibbs on every track; Madlib on all but the first (interlude).
      subtitle: i === 0 ? "Freddie Gibbs" : `Freddie Gibbs${SEP}Madlib`,
    }));
    expect(
      collectAlbumArtists({ type: "album", subtitle: "Freddie Gibbs", trackList: tracks }),
    ).toBe("Freddie Gibbs, Madlib");
  });

  test("track-level guest features (1/17) are excluded", () => {
    const tracks = Array.from({ length: 17 }, (_, i) => ({
      subtitle:
        i === 0
          ? `Freddie Gibbs${SEP}Madlib${SEP}Danny Brown`
          : i === 1
            ? `Freddie Gibbs${SEP}Madlib${SEP}Mac Miller`
            : `Freddie Gibbs${SEP}Madlib`,
    }));
    expect(
      collectAlbumArtists({ type: "album", subtitle: "Freddie Gibbs", trackList: tracks }),
    ).toBe("Freddie Gibbs, Madlib");
  });

  test("solo album (Nonagon Infinity) — single artist, no NBSP", () => {
    expect(
      collectAlbumArtists({
        type: "album",
        subtitle: "King Gizzard & The Lizard Wizard",
        trackList: Array.from({ length: 9 }, () => ({
          subtitle: "King Gizzard & The Lizard Wizard",
        })),
      }),
    ).toBe("King Gizzard & The Lizard Wizard");
  });

  test("first-seen order is preserved", () => {
    // Alphabetical would give "A, B, C" — scan order gives "C, A, B".
    expect(
      collectAlbumArtists({
        type: "album",
        subtitle: "C",
        trackList: [
          { subtitle: `C${SEP}A${SEP}B` },
          { subtitle: `C${SEP}A${SEP}B` },
        ],
      }),
    ).toBe("C, A, B");
  });

  test("empty trackList falls back to entity.subtitle", () => {
    expect(
      collectAlbumArtists({ type: "album", subtitle: "Solo Artist", trackList: [] }),
    ).toBe("Solo Artist");
  });

  test("missing trackList falls back to entity.subtitle", () => {
    expect(collectAlbumArtists({ type: "album", subtitle: "Solo Artist" })).toBe("Solo Artist");
  });

  test("empty track subtitles are ignored, fall back to subtitle if nothing collected", () => {
    expect(
      collectAlbumArtists({
        type: "album",
        subtitle: "Fallback",
        trackList: [{ subtitle: "" }, { subtitle: undefined }],
      }),
    ).toBe("Fallback");
  });

  test("small album (2 tracks) requires 100% (ceil of 1.6)", () => {
    // Guest on 1/2 tracks = 50% → excluded.
    expect(
      collectAlbumArtists({
        type: "album",
        subtitle: "Primary",
        trackList: [
          { subtitle: `Primary${SEP}Guest` },
          { subtitle: "Primary" },
        ],
      }),
    ).toBe("Primary");
  });
});

// --- parseEmbedHtml ---------------------------------------------------------

describe("parseEmbedHtml", () => {
  test("happy path with Currents payload", () => {
    const html = buildEmbedHtml({
      type: "album",
      name: "Currents",
      subtitle: "Tame Impala",
      tracks: Array.from({ length: 13 }, () => ({ subtitle: "Tame Impala" })),
      images: [
        { url: "https://image-cdn/sm.jpg", maxWidth: 64 },
        { url: "https://image-cdn/md.jpg", maxWidth: 300 },
        { url: "https://image-cdn/lg.jpg", maxWidth: 640 },
      ],
    });
    expect(parseEmbedHtml(html, "79dL7FLiJFOO0EoehUHQBv")).toEqual({
      ok: true,
      album: {
        title: "Currents",
        artist: "Tame Impala",
        image: "https://image-cdn/lg.jpg",
        url: "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv",
      },
    });
  });

  test("rejects when entity.type is not album", () => {
    const html = buildEmbedHtml({
      type: "episode",
      name: "Some Episode",
      subtitle: "Some Show",
      images: [{ url: "https://image-cdn/img.jpg", maxWidth: 640 }],
    });
    const result = parseEmbedHtml(html, "foo");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-album");
  });

  test("returns missing-metadata when __NEXT_DATA__ is absent", () => {
    const html = "<html><head></head><body>no data</body></html>";
    const result = parseEmbedHtml(html, "foo");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing-metadata");
  });
});

interface EmbedFixture {
  type: string;
  name: string;
  subtitle: string;
  images: Array<{ url: string; maxWidth: number }>;
  tracks?: Array<{ subtitle: string }>;
}

function buildEmbedHtml(f: EmbedFixture): string {
  const data = {
    props: {
      pageProps: {
        state: {
          data: {
            entity: {
              type: f.type,
              name: f.name,
              subtitle: f.subtitle,
              visualIdentity: { image: f.images },
              trackList: f.tracks ?? [],
            },
          },
        },
      },
    },
  };
  return `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></head><body></body></html>`;
}
