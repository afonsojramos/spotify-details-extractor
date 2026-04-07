#!/usr/bin/env bun
/**
 * Smoke-tests the extractor against live Spotify embed pages.
 * Run: bun run scripts/verify.ts
 */
import { extractAlbumInfoFromUrl } from "../src/shared/extractor";

const cases: Array<{ label: string; url: string; expectAlbum: boolean }> = [
  {
    label: "Album / Carly Rae Jepsen",
    url: "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
    expectAlbum: true,
  },
  {
    label: "Album / Tame Impala (with ?highlight)",
    url: "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv?highlight=spotify:track:2X485T9Z5Ly0xyaghN73ed",
    expectAlbum: true,
  },
  {
    label: "Album / Harry Styles",
    url: "https://open.spotify.com/album/5r36AJ6VOJtp00oxSkBZ5h",
    expectAlbum: true,
  },
  {
    label: "Podcast show (should reject)",
    url: "https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk",
    expectAlbum: false,
  },
];

let failed = 0;
for (const tc of cases) {
  const result = await extractAlbumInfoFromUrl(tc.url);
  const passed = result.ok === tc.expectAlbum;
  console.log(`${passed ? "✓" : "✗"} ${tc.label}`);
  console.log("  ", JSON.stringify(result));
  if (!passed) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log("\nAll cases passed");
