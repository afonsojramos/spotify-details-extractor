import { describe, test, expect } from "bun:test";
import {
  bandcamp,
  canonicaliseBandcampUrl,
  parseBandcampHtml,
  parseBandcampOgTitle,
} from "./bandcamp";

describe("bandcamp.match", () => {
  test.each([
    ["artist subdomain album", "https://godspeedyoublackemperor.bandcamp.com/album/foo", true],
    ["short subdomain", "https://x.bandcamp.com/album/foo", true],
    ["track, not album", "https://foo.bandcamp.com/track/bar", false],
    ["bare bandcamp.com", "https://bandcamp.com/discover", false],
    ["other host", "https://example.com/album/foo", false],
  ])("%s → %p", (_label, url, expected) => {
    expect(bandcamp.match(new URL(url))).toBe(expected);
  });
});

describe("canonicaliseBandcampUrl", () => {
  test.each([
    // Input, expected canonical
    [
      "https://foo.bandcamp.com/album/bar",
      "https://foo.bandcamp.com/album/bar",
    ],
    [
      "https://foo.bandcamp.com/album/bar?utm=x",
      "https://foo.bandcamp.com/album/bar",
    ],
    [
      "https://foo.bandcamp.com/album/bar#top",
      "https://foo.bandcamp.com/album/bar",
    ],
  ])("%s → %s", (input, expected) => {
    expect(canonicaliseBandcampUrl(input)).toBe(expected);
  });

  test("non-album path → null", () => {
    expect(canonicaliseBandcampUrl("https://foo.bandcamp.com/track/bar")).toBeNull();
  });

  test("not bandcamp → null", () => {
    expect(canonicaliseBandcampUrl("https://example.com/album/foo")).toBeNull();
  });
});

describe("parseBandcampOgTitle", () => {
  test("simple title + artist", () => {
    expect(parseBandcampOgTitle("Lift Your Skinny Fists, by Godspeed You Black Emperor!")).toEqual({
      title: "Lift Your Skinny Fists",
      artist: "Godspeed You Black Emperor!",
    });
  });

  test("album title containing ', by ' — splits on last occurrence", () => {
    // "Track 1, by Artist1" as a title quoted inside a title — exotic.
    expect(parseBandcampOgTitle("Track 1, by Artist1, by RealArtist")).toEqual({
      title: "Track 1, by Artist1",
      artist: "RealArtist",
    });
  });

  test("no separator → null", () => {
    expect(parseBandcampOgTitle("NoSeparatorHere")).toBeNull();
  });
});

describe("parseBandcampHtml", () => {
  const FIXTURE = `<html><head>
<meta property="og:type" content="album">
<meta property="og:title" content="Lift Your Skinny Fists Like Antennas To Heaven, by Godspeed You Black Emperor!">
<meta property="og:image" content="https://f4.bcbits.com/img/cover.jpg">
<meta property="og:url" content="https://godspeedyoublackemperor.bandcamp.com/album/lift-your-skinny-fists-like-antennas-to-heaven">
</head></html>`;

  test("happy path — url is passed through verbatim (no id normalisation)", () => {
    const canonical =
      "https://godspeedyoublackemperor.bandcamp.com/album/lift-your-skinny-fists-like-antennas-to-heaven";
    expect(parseBandcampHtml(FIXTURE, canonical)).toEqual({
      ok: true,
      album: {
        title: "Lift Your Skinny Fists Like Antennas To Heaven",
        artist: "Godspeed You Black Emperor!",
        image: "https://f4.bcbits.com/img/cover.jpg",
        url: canonical,
      },
    });
  });

  test("accepts og:type=music.album as well", () => {
    const html = FIXTURE.replace('content="album"', 'content="music.album"');
    const result = parseBandcampHtml(html, "https://foo.bandcamp.com/album/bar");
    expect(result.ok).toBe(true);
  });

  test("rejects other og:type values", () => {
    const html = FIXTURE.replace('content="album"', 'content="song"');
    const result = parseBandcampHtml(html, "https://foo.bandcamp.com/album/bar");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-album");
  });
});
