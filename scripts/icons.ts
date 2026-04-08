#!/usr/bin/env bun
/**
 * Rasterises assets/logo.svg into the 32/48/96/128 PNGs required by both
 * extension targets (chromium + firefox).
 *
 * Requires `rsvg-convert` (librsvg2-tools) on PATH — we don't bundle a
 * JS-side rasteriser because icon regen is a once-per-design-change chore.
 *
 * Run: bun run icons
 */
import { cp } from "node:fs/promises";
import { join } from "node:path";

const SIZES = [32, 48, 96, 128] as const;
const ROOT = new URL("..", import.meta.url).pathname;
const SVG = join(ROOT, "assets/logo.svg");

for (const size of SIZES) {
  const out = join(ROOT, `src/chromium/icons/icon${size}.png`);
  const proc = Bun.spawn(["rsvg-convert", "-w", String(size), "-h", String(size), SVG, "-o", out], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`rsvg-convert failed for size ${size}`);
  await cp(out, join(ROOT, `src/firefox/icons/icon${size}.png`));
  console.log(`✓ icon${size}.png`);
}
