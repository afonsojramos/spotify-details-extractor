import { describe, test, expect } from "bun:test";
import { firstMeta, allMetas, decodeEntities } from "./meta";

describe("firstMeta / allMetas", () => {
  const HTML = `<html><head>
<meta property="og:type" content="music.album">
<meta property="og:type" content="article">
<meta property="og:title" content="Foo">
<meta content="Bar" name="og:description">
</head></html>`;

  test("returns first matching content (property=... first)", () => {
    expect(firstMeta(HTML, "og:title")).toBe("Foo");
  });

  test("returns first matching content (content=... before property=...)", () => {
    expect(firstMeta(HTML, "og:description")).toBe("Bar");
  });

  test("allMetas returns all occurrences", () => {
    expect(allMetas(HTML, "og:type")).toEqual(["music.album", "article"]);
  });

  test("nothing matching → null / empty", () => {
    expect(firstMeta(HTML, "og:nope")).toBeNull();
    expect(allMetas(HTML, "og:nope")).toEqual([]);
  });
});

describe("decodeEntities", () => {
  test.each([
    // Each: [input, expected]
    ["plain text", "plain text"],
    // Lowercase accented
    ["ROSAL&iacute;A", "ROSALíA"],
    ["caf&eacute;", "café"],
    ["cora&ccedil;&atilde;o", "coração"],
    // Uppercase accented — the regression that triggered this fix
    ["ROSAL&Iacute;A", "ROSALÍA"],
    ["&Aacute;lbum", "Álbum"],
    ["&Eacute;&Iacute;&Oacute;&Uacute;", "ÉÍÓÚ"],
    // Punctuation
    ["&amp; &quot;x&quot; &#39;y&#39;", "& \"x\" 'y'"],
    ["&mdash; &ndash;", "— –"],
    ["&hellip;", "…"],
    // Numeric refs
    ["&#233;", "é"],
    ["&#x00e9;", "é"],
    ["&#x27;hi&#x27;", "'hi'"],
    // Ordering: amp last so we don't double-decode
    ["AT&amp;T", "AT&T"],
  ])("decode %j → %j", (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });
});
