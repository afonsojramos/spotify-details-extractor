#!/usr/bin/env bun
/**
 * Integration tests: exercises both Spotify and Qobuz extractors against
 * real, live album pages and asserts the *exact* extracted JSON against
 * a pinned expected shape.
 *
 * The `image` field is declared as a regex rather than a string because
 * Spotify's CDN hostnames rotate (`image-cdn-ak` vs `image-cdn-fa` etc.)
 * between runs. Title, artist, and canonical URL are matched exactly.
 *
 * Run: bun run scripts/verify.ts
 */
import { extractAlbumFromUrl } from "../src/shared/extractor";
import type { ExtractResult } from "../src/shared/types";

interface ExpectedAlbum {
  title: string;
  artist: string;
  url: string;
  imagePattern: RegExp;
}

interface Case {
  label: string;
  url: string;
  /** `null` means the extractor should reject the URL as non-album. */
  expected: ExpectedAlbum | null;
}

const cases: Case[] = [
  {
    label: "Spotify / Nonagon Infinity by King Gizzard & The Lizard Wizard",
    url: "https://open.spotify.com/album/4imRDpzmb4zwvxKhNzJhxr",
    expected: {
      title: "Nonagon Infinity",
      artist: "King Gizzard & The Lizard Wizard",
      url: "https://open.spotify.com/album/4imRDpzmb4zwvxKhNzJhxr",
      imagePattern: /^https:\/\/image-cdn-[a-z]+\.spotifycdn\.com\/image\/ab67616d0000b27392cd8ca03552bdf6dd5e8934$/,
    },
  },
  {
    label: "Spotify / Currents by Tame Impala (with ?highlight= query)",
    url: "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv?highlight=spotify:track:2X485T9Z5Ly0xyaghN73ed",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      url: "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv",
      imagePattern: /^https:\/\/image-cdn-[a-z]+\.spotifycdn\.com\/image\/ab67616d0000b2739e1cfc756886ac782e363d79$/,
    },
  },
  {
    label: "Spotify / Más Influências podcast (should reject)",
    url: "https://open.spotify.com/show/5xrGlmos4BtbmZR7g4wAzK",
    expected: null,
  },
  {
    label: "Qobuz / Currents by Tame Impala (canonical URL, UPC id)",
    url: "https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      url: "https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219",
      imagePattern: /^https:\/\/static\.qobuz\.com\/images\/covers\/19\/62\/0060254736219_600\.jpg$/,
    },
  },
  {
    label: "Qobuz / MM..FOOD by MF DOOM (play.qobuz.com bridge, alphanumeric id)",
    url: "https://play.qobuz.com/album/xdog3b38odmxa",
    expected: {
      title: "MM..FOOD (20th Anniversary Edition)",
      artist: "MF DOOM",
      url: "https://www.qobuz.com/us-en/album/mmfood-mf-doom/xdog3b38odmxa",
      imagePattern: /^https:\/\/static\.qobuz\.com\/images\/covers\/xa\/dm\/xdog3b38odmxa_600\.jpg$/,
    },
  },
  {
    label: "Qobuz / homepage (should reject)",
    url: "https://www.qobuz.com/us-en/",
    expected: null,
  },
];

let failed = 0;
for (const tc of cases) {
  const result = await extractAlbumFromUrl(tc.url);
  const mismatches = check(tc.expected, result);
  const passed = mismatches.length === 0;
  console.log(`${passed ? "✓" : "✗"} ${tc.label}`);
  if (!passed) {
    for (const m of mismatches) console.log(`    ${m}`);
    console.log(`    got: ${JSON.stringify(result)}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${cases.length} case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} cases passed`);

/** Returns a list of human-readable mismatch messages (empty == pass). */
function check(expected: ExpectedAlbum | null, actual: ExtractResult): string[] {
  const errors: string[] = [];

  if (expected === null) {
    if (actual.ok) errors.push("expected rejection, got album");
    else if (actual.reason !== "not-album") errors.push(`expected reason="not-album", got "${actual.reason}"`);
    return errors;
  }

  if (!actual.ok) {
    errors.push(`expected album, got ${actual.reason} (${actual.detail ?? "no detail"})`);
    return errors;
  }

  const a = actual.album;
  if (a.title !== expected.title) errors.push(`title: expected "${expected.title}", got "${a.title}"`);
  if (a.artist !== expected.artist) errors.push(`artist: expected "${expected.artist}", got "${a.artist}"`);
  if (a.url !== expected.url) errors.push(`url: expected "${expected.url}", got "${a.url}"`);
  if (!expected.imagePattern.test(a.image)) {
    errors.push(`image: expected match ${expected.imagePattern}, got "${a.image}"`);
  }
  return errors;
}
