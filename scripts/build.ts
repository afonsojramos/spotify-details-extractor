#!/usr/bin/env bun
/**
 * Builds targets into ./dist:
 *   dist/chromium/     — MV3 unpacked extension
 *   dist/firefox/      — MV3 unpacked extension (web-ext compatible)
 *   dist/spicetify/    — extractor.js for ~/.spicetify/Extensions
 *   dist/bookmarklet/  — minified IIFE + javascript: URL + install page
 *   dist/cli/          — standalone single-file binary for the host platform
 *
 * Cross-platform CLI binaries are produced by the release workflow; local
 * `bun run build` only compiles for the host.
 */
import { mkdir, rm, cp, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { SOURCES } from "../src/shared/sources";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");

const browserTargets = ["chromium", "firefox"] as const;

/**
 * Copies the manifest and injects `host_permissions` + `content_scripts`
 * generated from the `SOURCES` list. Source manifests deliberately omit
 * these fields so adding a new source only requires editing the source
 * definition, not both manifests.
 */
async function writeBrowserManifest(srcPath: string, outPath: string) {
  const manifest = JSON.parse(await readFile(srcPath, "utf8"));
  manifest.host_permissions = SOURCES.flatMap((s) => [...s.hostPermissions]);
  manifest.content_scripts = SOURCES.filter((s) => s.contentScriptMatches.length > 0).map((s) => ({
    matches: [...s.contentScriptMatches],
    js: [`${s.id}-menu.js`],
    run_at: "document_idle",
  }));
  await writeFile(outPath, JSON.stringify(manifest, null, 2) + "\n");
}

async function buildBrowser(target: (typeof browserTargets)[number]) {
  const src = join(root, "src", target);
  const out = join(dist, target);
  await mkdir(out, { recursive: true });
  await writeBrowserManifest(join(src, "manifest.json"), join(out, "manifest.json"));
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

async function buildBookmarklet() {
  const out = join(dist, "bookmarklet");
  await mkdir(out, { recursive: true });
  const result = await Bun.build({
    entrypoints: [join(root, "src/bookmarklet/index.ts")],
    outdir: out,
    target: "browser",
    format: "iife",
    minify: true,
    naming: "album-details-extractor.js",
  });
  if (!result.success) {
    console.error(result.logs);
    throw new Error("bun build failed for bookmarklet");
  }

  const jsPath = join(out, "album-details-extractor.js");
  const js = await Bun.file(jsPath).text();
  const bookmarkletUrl = `javascript:${encodeURIComponent(js)}`;
  await writeFile(join(out, "album-details-extractor.url.txt"), bookmarkletUrl);

  const installHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Album Details Extractor — Bookmarklet</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; color: #222; }
    h1 { margin-top: 0; }
    a.bookmarklet { display: inline-block; padding: 0.6rem 1rem; background: #222; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
    code { background: #f4f4f4; padding: 0.1rem 0.3rem; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Album Details Extractor</h1>
  <p>Drag the button below to your bookmarks bar. Then, while on any supported album page (Spotify, Qobuz), click the bookmark to copy the album's metadata as JSON.</p>
  <p><a class="bookmarklet" href="${bookmarkletUrl.replace(/"/g, "&quot;")}">Extract Album Info</a></p>
  <p>Supported sources:</p>
  <ul>
    <li><code>open.spotify.com/album/...</code></li>
    <li><code>www.qobuz.com/.../album/...</code></li>
    <li><code>play.qobuz.com/album/...</code></li>
  </ul>
</body>
</html>
`;
  await writeFile(join(out, "install.html"), installHtml);

  console.log("✓ bookmarklet");
}

async function buildCli() {
  const out = join(dist, "cli");
  await mkdir(out, { recursive: true });
  // Local host build only — release workflow builds cross-platform.
  const proc = Bun.spawn(
    [
      "bun",
      "build",
      join(root, "src/cli/index.ts"),
      "--compile",
      "--outfile",
      join(out, "album-details-extractor"),
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  const code = await proc.exited;
  if (code !== 0) throw new Error("bun build --compile failed for cli");
  console.log("✓ cli");
}

await rm(dist, { recursive: true, force: true });
await Promise.all([
  ...browserTargets.map(buildBrowser),
  buildSpicetify(),
  buildBookmarklet(),
  buildCli(),
]);
console.log("\nBuilt to ./dist");
