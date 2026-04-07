import { describe, test, expect } from "bun:test";
import { parseSpotifyUrl, parseEmbedHtml, spotify } from "./spotify";

// --- Source.match -----------------------------------------------------------

describe("spotify.match", () => {
  test.each([
    ["canonical album", "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv", true],
    ["intl album", "https://open.spotify.com/intl-pt/album/79dL7FLiJFOO0EoehUHQBv", false], // not /album/ at position 1
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

// --- parseEmbedHtml ---------------------------------------------------------

describe("parseEmbedHtml", () => {
  test("happy path with Currents payload", () => {
    const html = buildEmbedHtml({
      type: "album",
      name: "Currents",
      subtitle: "Tame Impala",
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
            },
          },
        },
      },
    },
  };
  return `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></head><body></body></html>`;
}
