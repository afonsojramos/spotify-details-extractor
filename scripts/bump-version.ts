#!/usr/bin/env bun
/**
 * Sets the version field in both manifests to the latest git tag.
 * Replaces the old BSD-`sed`-only npm scripts.
 */
import { $ } from "bun";

const tag = (await $`git describe --tags --abbrev=0`.text()).trim().replace(/^v/, "");
if (!tag) throw new Error("No git tag found");

for (const path of ["src/chromium/manifest.json", "src/firefox/manifest.json"]) {
  const file = Bun.file(path);
  const json = await file.json();
  json.version = tag;
  await Bun.write(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${path} → ${tag}`);
}
