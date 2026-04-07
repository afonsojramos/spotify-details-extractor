#!/usr/bin/env bun
/**
 * Smoke-tests both Spotify and Qobuz extractors against live pages.
 * Both source paths now use runtime-independent parsing (no DOMParser),
 * so we can call the router directly from Bun.
 *
 * Run: bun run scripts/verify.ts
 */
import { extractAlbumFromUrl } from "../src/shared/extractor";

interface Case {
  label: string;
  url: string;
  expectAlbum: boolean;
}

const cases: Case[] = [
  {
    label: "Spotify / Carly Rae Jepsen",
    url: "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
    expectAlbum: true,
  },
  {
    label: "Spotify / Tame Impala (with ?highlight)",
    url: "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv?highlight=spotify:track:2X485T9Z5Ly0xyaghN73ed",
    expectAlbum: true,
  },
  {
    label: "Spotify / podcast show (should reject)",
    url: "https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk",
    expectAlbum: false,
  },
  {
    label: "Qobuz / Tame Impala canonical",
    url: "https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219",
    expectAlbum: true,
  },
  {
    label: "Qobuz / play.qobuz.com bridge",
    url: "https://play.qobuz.com/album/cayd4x3o39hma",
    expectAlbum: true,
  },
  {
    label: "Qobuz / non-album homepage",
    url: "https://www.qobuz.com/us-en/",
    expectAlbum: false,
  },
];

let failed = 0;
for (const tc of cases) {
  const result = await extractAlbumFromUrl(tc.url);
  // For "expect not-album", only treat reason="not-album" as success.
  const passed = tc.expectAlbum
    ? result.ok
    : !result.ok && result.reason === "not-album";
  console.log(`${passed ? "✓" : "✗"} ${tc.label}`);
  console.log("  ", JSON.stringify(result));
  if (!passed) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log("\nAll cases passed");
