import { describe, test, expect } from "bun:test";
import {
  deezer,
  extractDeezerAlbumId,
  parseDeezerHtml,
  parseArtistFromDeezerDescription,
} from "./deezer";

describe("deezer.match", () => {
  test.each([
    ["www.deezer.com/album/...", "https://www.deezer.com/album/10709540", true],
    ["deezer.com/album/... (no www)", "https://deezer.com/album/10709540", true],
    ["locale prefix", "https://www.deezer.com/es/album/10709540", true],
    ["playlist", "https://www.deezer.com/playlist/123", false],
    ["other host", "https://example.com/album/123", false],
  ])("%s → %p", (_label, url, expected) => {
    expect(deezer.match(new URL(url))).toBe(expected);
  });
});

describe("extractDeezerAlbumId", () => {
  test.each([
    ["https://www.deezer.com/album/10709540", "10709540"],
    ["https://www.deezer.com/es/album/10709540", "10709540"],
    ["https://deezer.com/album/10709540?utm=x", "10709540"],
  ])("%s → %s", (url, expected) => {
    expect(extractDeezerAlbumId(url)).toBe(expected);
  });
});

describe("parseArtistFromDeezerDescription", () => {
  test.each([
    // locale, input, expected
    ["en", "Tame Impala - album - 2015 - 13 songs", "Tame Impala"],
    ["es", "Tame Impala - álbum - 2015 - 13 canciones", "Tame Impala"],
    ["fr", "Tame Impala - album - 2015 - 13 chansons", "Tame Impala"],
    ["pt", "Tame Impala - álbum - 2015 - 13 músicas", "Tame Impala"],
    [
      "multi-word artist",
      "Black Country, New Road - album - 2022 - 9 songs",
      "Black Country, New Road",
    ],
  ])("%s locale: %s → %s", (_locale, description, expected) => {
    expect(parseArtistFromDeezerDescription(description)).toBe(expected);
  });

  test("no separator → null", () => {
    expect(parseArtistFromDeezerDescription("No separator here")).toBeNull();
  });

  test("null input → null", () => {
    expect(parseArtistFromDeezerDescription(null)).toBeNull();
  });
});

describe("parseDeezerHtml", () => {
  const FIXTURE = `<html><head>
<meta property="og:type" content="music.album">
<meta property="og:title" content="Currents">
<meta property="og:description" content="Tame Impala - album - 2015 - 13 songs">
<meta property="og:image" content="https://cdn-images.dzcdn.net/cover.jpg">
<meta property="og:url" content="https://www.deezer.com/album/10709540">
</head></html>`;

  test("happy path", () => {
    expect(parseDeezerHtml(FIXTURE, "10709540")).toEqual({
      ok: true,
      album: {
        title: "Currents",
        artist: "Tame Impala",
        image: "https://cdn-images.dzcdn.net/cover.jpg",
        url: "https://www.deezer.com/album/10709540",
      },
    });
  });

  test("handles Spanish locale description", () => {
    const html = FIXTURE.replace(
      "Tame Impala - album - 2015 - 13 songs",
      "Tame Impala - álbum - 2015 - 13 canciones",
    );
    const result = parseDeezerHtml(html, "10709540");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.album.artist).toBe("Tame Impala");
  });

  test("rejects non-album og:type", () => {
    const html = FIXTURE.replace("music.album", "music.playlist");
    const result = parseDeezerHtml(html, "10709540");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-album");
  });
});
