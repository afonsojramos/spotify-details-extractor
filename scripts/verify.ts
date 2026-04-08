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
    label: "Qobuz / Currents — www.qobuz.com catalog URL input, play.qobuz.com output (UPC id normalisation)",
    url: "https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      url: "https://play.qobuz.com/album/0060254736219",
      imagePattern: /^https:\/\/static\.qobuz\.com\/images\/covers\/19\/62\/0060254736219_600\.jpg$/,
    },
  },
  {
    label: "Qobuz / MM..FOOD by MF DOOM (play.qobuz.com, alphanumeric id)",
    url: "https://play.qobuz.com/album/xdog3b38odmxa",
    expected: {
      title: "MM..FOOD (20th Anniversary Edition)",
      artist: "MF DOOM",
      url: "https://play.qobuz.com/album/xdog3b38odmxa",
      imagePattern: /^https:\/\/static\.qobuz\.com\/images\/covers\/xa\/dm\/xdog3b38odmxa_600\.jpg$/,
    },
  },
  {
    label: "Qobuz / homepage (should reject)",
    url: "https://www.qobuz.com/us-en/",
    expected: null,
  },
  {
    label: "Qobuz / Ants From Up There by Black Country, New Road (comma in artist name)",
    url: "https://play.qobuz.com/album/lh3e4dd8zia0b",
    expected: {
      title: "Ants From Up There",
      artist: "Black Country, New Road",
      url: "https://play.qobuz.com/album/lh3e4dd8zia0b",
      imagePattern: /^https:\/\/static\.qobuz\.com\/images\/covers\/0b\/ia\/lh3e4dd8zia0b_600\.jpg$/,
    },
  },
  {
    label: "Qobuz / El Mal Querer by ROSALÍA (accented character in artist)",
    url: "https://play.qobuz.com/album/wrwhmzvgkncta",
    expected: {
      title: "El Mal Querer",
      artist: "ROSALÍA",
      url: "https://play.qobuz.com/album/wrwhmzvgkncta",
      imagePattern: /^https:\/\/static\.qobuz\.com\/images\/covers\/ta\/nc\/wrwhmzvgkncta_600\.jpg$/,
    },
  },
  {
    label: "Spotify / Watch The Throne (Deluxe) by JAŸ-Z + Kanye West (multi-artist via trackList aggregation, Ÿ Unicode)",
    url: "https://open.spotify.com/album/2P2Xwvh2xWXIZ1OWY9S9o5",
    expected: {
      title: "Watch The Throne (Deluxe)",
      // entity.subtitle is just "JAŸ-Z"; collectAlbumArtists walks the
      // trackList (both artists on 100% of tracks) to recover Kanye West.
      artist: "JAŸ-Z, Kanye West",
      url: "https://open.spotify.com/album/2P2Xwvh2xWXIZ1OWY9S9o5",
      imagePattern: /^https:\/\/image-cdn-[a-z]+\.spotifycdn\.com\/image\/ab67616d0000b2735c837cc621c1ec82bf3c81ac$/,
    },
  },
  {
    label: "Spotify / IGOR by Tyler, The Creator (single artist whose name contains a comma)",
    url: "https://open.spotify.com/album/5zi7WsKlIiUXv09tbGLKsE",
    expected: {
      title: "IGOR",
      artist: "Tyler, The Creator",
      url: "https://open.spotify.com/album/5zi7WsKlIiUXv09tbGLKsE",
      imagePattern: /^https:\/\/image-cdn-[a-z]+\.spotifycdn\.com\/image\/ab67616d0000b27330a635de2bb0caa4e26f6abb$/,
    },
  },
  {
    label: "Spotify / Ella and Louis (multi-artist, both on every track)",
    url: "https://open.spotify.com/album/176VGwd7ODjJVxT0DkQA7A",
    expected: {
      title: "Ella and Louis",
      // entity.subtitle uses "&" as the joiner; our aggregator normalises to
      // comma-joined output by scanning the trackList.
      artist: "Ella Fitzgerald, Louis Armstrong",
      url: "https://open.spotify.com/album/176VGwd7ODjJVxT0DkQA7A",
      imagePattern: /^https:\/\/image-cdn-[a-z]+\.spotifycdn\.com\/image\/ab67616d0000b273ec269c4766bd515d0faf4a56$/,
    },
  },
  {
    label: "Spotify / intl-pt URL (geo-localised prefix, canonical url in output)",
    url: "https://open.spotify.com/intl-pt/album/2P2Xwvh2xWXIZ1OWY9S9o5",
    expected: {
      title: "Watch The Throne (Deluxe)",
      artist: "JAŸ-Z, Kanye West",
      url: "https://open.spotify.com/album/2P2Xwvh2xWXIZ1OWY9S9o5",
      imagePattern: /^https:\/\/image-cdn-[a-z]+\.spotifycdn\.com\/image\/ab67616d0000b2735c837cc621c1ec82bf3c81ac$/,
    },
  },
  {
    label: "Tidal / Currents by Tame Impala",
    url: "https://tidal.com/browse/album/47696788",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      url: "https://tidal.com/album/47696788",
      imagePattern: /^https:\/\/resources\.tidal\.com\/images\/.+\/640x640\.jpg$/,
    },
  },
  {
    label: "Apple Music / Currents by Tame Impala",
    url: "https://music.apple.com/us/album/currents/1440838039",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      url: "https://music.apple.com/album/1440838039",
      imagePattern: /^https:\/\/is\d+-ssl\.mzstatic\.com\/image\/thumb\/.+\.jpg\/.+$/,
    },
  },
  {
    label: "Deezer / Currents by Tame Impala (locale-agnostic description parser)",
    url: "https://www.deezer.com/album/10709540",
    expected: {
      title: "Currents",
      artist: "Tame Impala",
      url: "https://www.deezer.com/album/10709540",
      imagePattern: /^https:\/\/cdn-images\.dzcdn\.net\/images\/cover\/.+\/\d+x\d+\.jpg$/,
    },
  },
  {
    label: "Bandcamp / Lift Your Skinny Fists by Godspeed You Black Emperor!",
    url: "https://godspeedyoublackemperor.bandcamp.com/album/lift-your-skinny-fists-like-antennas-to-heaven",
    expected: {
      title: "Lift Your Skinny Fists Like Antennas To Heaven",
      artist: "Godspeed You Black Emperor!",
      url: "https://godspeedyoublackemperor.bandcamp.com/album/lift-your-skinny-fists-like-antennas-to-heaven",
      imagePattern: /^https:\/\/f\d+\.bcbits\.com\/img\/.+\.jpg$/,
    },
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
