import { describe, test, expect } from "bun:test";
import {
  appleMusic,
  extractAppleMusicAlbumId,
  parseAppleMusicHtml,
  parseArtistFromAppleDescription,
} from "./apple-music";

describe("appleMusic.match", () => {
  test.each([
    ["locale + slug + id", "https://music.apple.com/us/album/currents/1440838039", true],
    ["id only", "https://music.apple.com/album/1440838039", true],
    ["different locale", "https://music.apple.com/pt/album/currents/1440838039", true],
    ["no numeric id", "https://music.apple.com/us/artist/tame-impala/428463", false],
    ["song, not album", "https://music.apple.com/us/song/let-it-happen/1440838060", false],
    ["other host", "https://example.com/album/123", false],
  ])("%s → %p", (_label, url, expected) => {
    expect(appleMusic.match(new URL(url))).toBe(expected);
  });
});

describe("extractAppleMusicAlbumId", () => {
  test.each([
    ["https://music.apple.com/us/album/currents/1440838039", "1440838039"],
    ["https://music.apple.com/album/1440838039", "1440838039"],
    ["https://music.apple.com/us/album/currents/1440838039?foo=bar", "1440838039"],
  ])("%s → %s", (url, expected) => {
    expect(extractAppleMusicAlbumId(url)).toBe(expected);
  });

  test("trailing non-numeric segment → null", () => {
    expect(extractAppleMusicAlbumId("https://music.apple.com/us/album/currents")).toBeNull();
  });
});

describe("parseArtistFromAppleDescription", () => {
  test("English template", () => {
    expect(
      parseArtistFromAppleDescription(
        "Listen to Currents by Tame Impala on Apple Music. 2015. 13 Songs. Duration: 51 minutes.",
      ),
    ).toBe("Tame Impala");
  });

  test("title containing ' by ' — greedy regex finds the last ' by '", () => {
    expect(
      parseArtistFromAppleDescription(
        "Listen to Track by Track by Some Artist on Apple Music. 2020. 10 Songs.",
      ),
    ).toBe("Some Artist");
  });

  test("null input → null", () => {
    expect(parseArtistFromAppleDescription(null)).toBeNull();
  });
});

describe("parseAppleMusicHtml", () => {
  const FIXTURE = `<html><head>
<meta name="apple:content_id" content="1440838039">
<meta name="apple:title" content="Currents">
<meta name="apple:description" content="Listen to Currents by Tame Impala on Apple Music. 2015. 13 Songs.">
<meta property="og:type" content="music.album">
<meta property="og:title" content="Currents by Tame Impala on Apple Music">
<meta property="og:image" content="https://is1-ssl.mzstatic.com/cover.jpg">
<meta property="og:url" content="https://music.apple.com/us/album/currents/1440838039">
</head></html>`;

  test("happy path — uses apple:title + apple:description", () => {
    expect(parseAppleMusicHtml(FIXTURE, "1440838039")).toEqual({
      ok: true,
      album: {
        title: "Currents",
        artist: "Tame Impala",
        image: "https://is1-ssl.mzstatic.com/cover.jpg",
        url: "https://music.apple.com/album/1440838039",
      },
    });
  });

  test("falls back to og:title when apple:* is absent", () => {
    const html = `<html><head>
<meta property="og:type" content="music.album">
<meta property="og:title" content="Currents by Tame Impala on Apple Music">
<meta property="og:image" content="https://is1-ssl.mzstatic.com/cover.jpg">
</head></html>`;
    const result = parseAppleMusicHtml(html, "1440838039");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.album.title).toBe("Currents");
      expect(result.album.artist).toBe("Tame Impala");
    }
  });

  test("rejects non-album og:type", () => {
    const html = FIXTURE.replace("music.album", "music.song");
    const result = parseAppleMusicHtml(html, "1440838039");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-album");
  });
});
