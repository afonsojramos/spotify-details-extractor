import { describe, test, expect } from "bun:test";
import {
  extractQobuzAlbumId,
  parseOgTitle,
  parseOgDescription,
  parseTitleAndArtist,
  parseQobuzHtml,
  qobuz,
} from "./qobuz";

// --- Source.match -----------------------------------------------------------

describe("qobuz.match", () => {
  test.each([
    [
      "www.qobuz.com canonical",
      "https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219",
      true,
    ],
    ["www.qobuz.com bridge", "https://www.qobuz.com/us-en/album/-/cayd4x3o39hma", true],
    ["play.qobuz.com", "https://play.qobuz.com/album/cayd4x3o39hma", true],
    ["open.qobuz.com", "https://open.qobuz.com/album/cayd4x3o39hma", true],
    ["qobuz.com without www", "https://qobuz.com/us-en/album/foo/123", true],
    ["qobuz.com non-album path", "https://www.qobuz.com/us-en/artist/tame-impala", false],
    ["qobuz.com homepage", "https://www.qobuz.com/us-en/", false],
    ["other host", "https://example.com/album/foo", false],
    ["spotify url", "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv", false],
  ])("match(%s) → %p", (_label, url, expected) => {
    expect(qobuz.match(new URL(url))).toBe(expected);
  });
});

// --- extractQobuzAlbumId ----------------------------------------------------

describe("extractQobuzAlbumId", () => {
  test.each([
    // URL, expected id
    ["https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219", "0060254736219"],
    ["https://www.qobuz.com/pt-pt/album/harrys-house-mo-dry/cayd4x3o39hma", "cayd4x3o39hma"],
    ["https://www.qobuz.com/us-en/album/-/cayd4x3o39hma", "cayd4x3o39hma"],
    ["https://play.qobuz.com/album/cayd4x3o39hma", "cayd4x3o39hma"],
    ["https://open.qobuz.com/album/cayd4x3o39hma", "cayd4x3o39hma"],
    ["https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219?utm=x", "0060254736219"],
    [
      "https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219#track-1",
      "0060254736219",
    ],
  ])("%s → %s", (url, expected) => {
    expect(extractQobuzAlbumId(url)).toBe(expected);
  });

  test.each([
    ["malformed url", "not a url"],
    ["no album in path", "https://www.qobuz.com/us-en/artist/tame-impala/123"],
    ["short id (<8 chars)", "https://play.qobuz.com/album/abc"],
    ["empty after album/", "https://play.qobuz.com/album/"],
  ])("%s → null", (_label, url) => {
    expect(extractQobuzAlbumId(url)).toBeNull();
  });
});

// --- parseOgTitle (legacy fallback) -----------------------------------------

describe("parseOgTitle", () => {
  test("simple title and artist", () => {
    expect(parseOgTitle("Currents, Tame Impala - Qobuz")).toEqual({
      title: "Currents",
      artist: "Tame Impala",
    });
  });

  test("trailing whitespace around suffix", () => {
    expect(parseOgTitle("Currents, Tame Impala  -  Qobuz  ")).toEqual({
      title: "Currents",
      artist: "Tame Impala",
    });
  });

  test("album title itself contains a comma — splits on the LAST comma (ambiguous, documented fallback behaviour)", () => {
    // "For the first time, Black Country, New Road" → title ambiguous.
    // parseOgTitle splits on last comma; description parser is the
    // unambiguous path for these.
    expect(parseOgTitle("For the first time, Black Country, New Road - Qobuz")).toEqual({
      title: "For the first time, Black Country",
      artist: "New Road",
    });
  });

  test("returns null when there is no comma", () => {
    expect(parseOgTitle("NoCommaHere - Qobuz")).toBeNull();
  });

  test("returns null when title or artist would be empty", () => {
    expect(parseOgTitle(", Foo - Qobuz")).toBeNull();
    expect(parseOgTitle("Foo, - Qobuz")).toBeNull();
  });
});

// --- parseOgDescription (primary, unambiguous) ------------------------------

describe("parseOgDescription", () => {
  test("matches the English template", () => {
    expect(
      parseOgDescription(
        "Listen to unlimited streaming or download Currents by Tame Impala in Hi-Res quality on Qobuz. Subscriptions from $10.83/month.",
      ),
    ).toEqual({ title: "Currents", artist: "Tame Impala" });
  });

  test("handles album title containing ', '", () => {
    expect(
      parseOgDescription(
        "Listen to unlimited streaming or download For the first time by Black Country, New Road in Hi-Res quality on Qobuz.",
      ),
    ).toEqual({ title: "For the first time", artist: "Black Country, New Road" });
  });

  test("handles album title containing ' by ' via greedy backtracking", () => {
    // "Track by Track" by "Foo" — greedy .+ backtracks to the last " by "
    // before " in Hi-Res", giving the correct split.
    expect(
      parseOgDescription(
        "Listen to unlimited streaming or download Track by Track by Foo in Hi-Res quality on Qobuz.",
      ),
    ).toEqual({ title: "Track by Track", artist: "Foo" });
  });

  test("returns null when the description is in a non-English locale", () => {
    expect(
      parseOgDescription("Ouça ilimitado ou baixe Currents de Tame Impala em Hi-Res na Qobuz."),
    ).toBeNull();
  });

  test("returns null for empty or malformed descriptions", () => {
    expect(parseOgDescription("")).toBeNull();
    expect(parseOgDescription("Listen to Currents")).toBeNull();
  });
});

// --- parseTitleAndArtist (composition) --------------------------------------

describe("parseTitleAndArtist", () => {
  test("prefers og:description when available", () => {
    // og:title would split at last comma (wrong); og:description is right.
    expect(
      parseTitleAndArtist(
        "For the first time, Black Country, New Road - Qobuz",
        "Listen to unlimited streaming or download For the first time by Black Country, New Road in Hi-Res quality on Qobuz.",
      ),
    ).toEqual({ title: "For the first time", artist: "Black Country, New Road" });
  });

  test("falls back to og:title when og:description is null", () => {
    expect(parseTitleAndArtist("Currents, Tame Impala - Qobuz", null)).toEqual({
      title: "Currents",
      artist: "Tame Impala",
    });
  });

  test("falls back to og:title when og:description doesn't match the template", () => {
    expect(
      parseTitleAndArtist(
        "Currents, Tame Impala - Qobuz",
        "Some random description that doesn't match",
      ),
    ).toEqual({ title: "Currents", artist: "Tame Impala" });
  });
});

// --- parseQobuzHtml (end-to-end with synthetic HTML) ------------------------

describe("parseQobuzHtml", () => {
  test("happy path with og:description — url is the play.qobuz.com listener form", () => {
    const html = buildHtml({
      ogType: ["article", "music.album"],
      ogTitle: "Currents, Tame Impala - Qobuz",
      ogDescription:
        "Listen to unlimited streaming or download Currents by Tame Impala in Hi-Res quality on Qobuz.",
      ogImage: "https://static.qobuz.com/images/covers/19/62/0060254736219_600.jpg",
    });
    expect(parseQobuzHtml(html, "0060254736219")).toEqual({
      ok: true,
      album: {
        title: "Currents",
        artist: "Tame Impala",
        image: "https://static.qobuz.com/images/covers/19/62/0060254736219_600.jpg",
        url: "https://play.qobuz.com/album/0060254736219",
      },
    });
  });

  test("alphanumeric id produces play.qobuz.com url", () => {
    const html = buildHtml({
      ogType: ["music.album"],
      ogTitle: "Birding, deary - Qobuz",
      ogDescription:
        "Listen to unlimited streaming or download Birding by deary in Hi-Res quality on Qobuz.",
      ogImage: "https://static.qobuz.com/images/covers/2s/vj/oa6soz3d1vj2s_600.jpg",
    });
    const result = parseQobuzHtml(html, "oa6soz3d1vj2s");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.album.url).toBe("https://play.qobuz.com/album/oa6soz3d1vj2s");
  });

  test("rejects when og:type lacks music.album", () => {
    const html = buildHtml({
      ogType: ["article"],
      ogTitle: "Homepage - Qobuz",
      ogDescription: null,
      ogImage: "https://static.qobuz.com/img.jpg",
    });
    const result = parseQobuzHtml(html, "homepage");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-album");
  });

  test("returns missing-metadata when og:image is absent", () => {
    const html = buildHtml({
      ogType: ["music.album"],
      ogTitle: "Currents, Tame Impala - Qobuz",
      ogDescription: null,
      ogImage: null,
    });
    const result = parseQobuzHtml(html, "0060254736219");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing-metadata");
  });

  test("decodes HTML entities in title/artist", () => {
    const html = buildHtml({
      ogType: ["music.album"],
      ogTitle: "Caf&eacute;, Art&iacute;sta - Qobuz",
      ogDescription: null,
      ogImage: "https://static.qobuz.com/img.jpg",
    });
    const result = parseQobuzHtml(html, "123");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.album.title).toBe("Café");
      expect(result.album.artist).toBe("Artísta");
    }
  });

  test("handles attribute order content-before-property", () => {
    const html = `<html><head>
<meta content="music.album" property="og:type">
<meta content="Foo, Bar - Qobuz" property="og:title">
<meta content="https://static.qobuz.com/img.jpg" property="og:image">
</head></html>`;
    const result = parseQobuzHtml(html, "foobar123");
    expect(result).toEqual({
      ok: true,
      album: {
        title: "Foo",
        artist: "Bar",
        image: "https://static.qobuz.com/img.jpg",
        url: "https://play.qobuz.com/album/foobar123",
      },
    });
  });

  test("picks music.album even when article appears first (double og:type quirk)", () => {
    const html = buildHtml({
      ogType: ["article", "music.album"],
      ogTitle: "X, Y - Qobuz",
      ogDescription: null,
      ogImage: "https://static.qobuz.com/img.jpg",
    });
    const result = parseQobuzHtml(html, "xyz123");
    expect(result.ok).toBe(true);
  });
});

// --- Test helper ------------------------------------------------------------

interface HtmlFixture {
  ogType: string[];
  ogTitle: string;
  ogDescription: string | null;
  ogImage: string | null;
}

function buildHtml(f: HtmlFixture): string {
  const metas = [
    ...f.ogType.map((t) => `<meta property="og:type" content="${t}">`),
    `<meta property="og:title" content="${f.ogTitle}">`,
    f.ogDescription != null ? `<meta property="og:description" content="${f.ogDescription}">` : "",
    f.ogImage != null ? `<meta property="og:image" content="${f.ogImage}">` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `<!doctype html><html><head>${metas}</head><body></body></html>`;
}
