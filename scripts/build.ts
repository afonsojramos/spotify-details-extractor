#!/usr/bin/env bun
/**
 * Builds all three targets into ./dist:
 *   dist/chromium/  — MV3 unpacked extension
 *   dist/firefox/   — MV3 unpacked extension (web-ext compatible)
 *   dist/spicetify/ — extractor.js for ~/.spicetify/Extensions
 *
 * Each browser target gets manifest.json + icons copied verbatim and
 * background.ts/content.ts bundled by Bun.
 */
import { mkdir, rm, cp } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");

const targets = ["chromium", "firefox"] as const;

async function buildBrowser(target: (typeof targets)[number]) {
  const src = join(root, "src", target);
  const out = join(dist, target);
  await mkdir(out, { recursive: true });
  await cp(join(src, "manifest.json"), join(out, "manifest.json"));
  await cp(join(src, "icons"), join(out, "icons"), { recursive: true });

  const result = await Bun.build({
    entrypoints: [
      join(src, "background.ts"),
      join(src, "spotify-menu.ts"),
      join(src, "qobuz-menu.ts"),
    ],
    outdir: out,
    target: "browser",
    minify: false,
    naming: "[name].js",
  });
  if (!result.success) {
    console.error(result.logs);
    throw new Error(`bun build failed for ${target}`);
  }
  console.log(`✓ ${target}`);
}

async function buildSpicetify() {
  const out = join(dist, "spicetify");
  await mkdir(out, { recursive: true });
  const result = await Bun.build({
    entrypoints: [join(root, "src/spicetify/extension.ts")],
    outdir: out,
    target: "browser",
    format: "iife",
    minify: false,
    naming: "extractor.js",
  });
  if (!result.success) {
    console.error(result.logs);
    throw new Error("bun build failed for spicetify");
  }
  console.log("✓ spicetify");
}

await rm(dist, { recursive: true, force: true });
await Promise.all([...targets.map(buildBrowser), buildSpicetify()]);
console.log("\nBuilt to ./dist");
