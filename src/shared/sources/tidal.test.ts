import { describe, test, expect } from "bun:test";
import { tidal, extractTidalAlbumId, parseTidalHtml, parseTidalOgTitle } from "./tidal";

describe("tidal.match", () => {
  test.each([
    ["tidal.com/album/...", "https://tidal.com/album/47696788", true],
    ["tidal.com/browse/album/...", "https://tidal.com/browse/album/47696788", true],
    ["listen.tidal.com/album/...", "https://listen.tidal.com/album/47696788", true],
    ["tidal.com track", "https://tidal.com/track/47696789", false],
    ["tidal.com home", "https://tidal.com/", false],
    ["other host", "https://example.com/album/123", false],
  ])("%s → %p", (_label, url, expected) => {
    expect(tidal.match(new URL(url))).toBe(expected);
  });
});

describe("extractTidalAlbumId", () => {
  test.each([
    ["https://tidal.com/album/47696788", "47696788"],
    ["https://tidal.com/browse/album/47696788", "47696788"],
    ["https://listen.tidal.com/album/47696788?utm=x", "47696788"],
  ])("%s → %s", (url, expected) => {
    expect(extractTidalAlbumId(url)).toBe(expected);
  });

  test("no album in path → null", () => {
    expect(extractTidalAlbumId("https://tidal.com/browse/track/47696789")).toBeNull();
  });
});

describe("parseTidalOgTitle", () => {
  test("simple artist + title", () => {
    expect(parseTidalOgTitle("Tame Impala - Currents")).toEqual({
      artist: "Tame Impala",
      title: "Currents",
    });
  });

  test("title containing ' - ' uses first occurrence as separator", () => {
    expect(parseTidalOgTitle("U2 - Achtung Baby - Deluxe Edition")).toEqual({
      artist: "U2",
      title: "Achtung Baby - Deluxe Edition",
    });
  });

  test("no separator → null", () => {
    expect(parseTidalOgTitle("No Separator Here")).toBeNull();
  });
});

describe("parseTidalHtml", () => {
  const FIXTURE = `<html><head>
<meta property="og:type" content="music.album">
<meta property="og:title" content="Tame Impala - Currents">
<meta property="og:image" content="https://resources.tidal.com/cover.jpg">
<meta property="og:url" content="https://tidal.com/album/47696788">
</head></html>`;

  test("happy path", () => {
    expect(parseTidalHtml(FIXTURE, "47696788")).toEqual({
      ok: true,
      album: {
        title: "Currents",
        artist: "Tame Impala",
        image: "https://resources.tidal.com/cover.jpg",
        url: "https://tidal.com/album/47696788",
      },
    });
  });

  test("rejects homepage fallback (og:url doesn't contain /album/{id})", () => {
    const html = `<html><head>
<meta property="og:type" content="music.album">
<meta property="og:title" content="TIDAL - High Fidelity Music Streaming">
<meta property="og:image" content="https://tidal.com/img/FB.png">
<meta property="og:url" content="https://tidal.com/">
</head></html>`;
    const result = parseTidalHtml(html, "99999999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-album");
  });

  test("rejects non-album og:type", () => {
    const html = FIXTURE.replace("music.album", "website");
    const result = parseTidalHtml(html, "47696788");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-album");
  });
});
