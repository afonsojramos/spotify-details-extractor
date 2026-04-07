# Releasing

All sources live under `src/`. The build emits ready-to-ship artifacts into:

- `dist/chromium/` — MV3 unpacked extension
- `dist/firefox/` — MV3 unpacked extension (web-ext compatible)
- `dist/spicetify/extractor.js` — Spicetify extension
- `dist/bookmarklet/` — `album-details-extractor.js`, `album-details-extractor.url.txt` (the `javascript:` URL), and `install.html` (draggable install page)
- `dist/cli/album-details-extractor` — standalone binary for the host platform

```sh
bun install
bun run build       # → dist/
bun run typecheck   # tsc --noEmit
bun run verify      # smoke-tests both sources against live pages
```

To bump the version in both manifests from the latest git tag:

```sh
bun run bump
```

## Chromium

### Development

Go to `chrome://extensions`, enable **Developer Mode** and **Load Unpacked**, selecting `dist/chromium`. Reload after every `bun run build`.

### Release

```sh
bun run build
bun run chromium:zip    # → dist/album-details-extractor-chromium.zip
```

Upload the zip to the [Chrome Web Store Dev Console](https://chrome.google.com/webstore/devconsole/).

## Firefox

Firefox is MV3 (`browser_specific_settings.gecko.strict_min_version: 121`).

### Development

```sh
bun run firefox:dev     # builds + launches a temporary Firefox profile
```

### Release

```sh
JWT_ISSUER=… JWT_SECRET=… bun run firefox:release
```

This builds and signs in one step. Generate API credentials at <https://addons.mozilla.org/en-GB/developers/addon/api/key/>. The signed `.xpi` lands in `dist/`.

## Spicetify

```sh
bun run spicetify:install   # build + copy extractor.js into ~/.config/spicetify/Extensions
bun run spicetify:setup     # one-time: spicetify config extensions extractor.js
bun run spicetify:dev       # spicetify watch -le for live reload
```

## Bookmarklet

The bookmarklet is built as part of `bun run build`. To share it, attach `dist/bookmarklet/album-details-extractor.url.txt` and `dist/bookmarklet/install.html` to each GitHub release. Users drag the install-page button into their bookmarks bar, or paste the `.url.txt` contents into a new bookmark manually.

## CLI

Local `bun run build` compiles a single-file executable for the current host platform at `dist/cli/album-details-extractor`.

For cross-platform release artifacts (Linux x64, macOS arm64, macOS x64, Windows x64), the release GitHub workflow runs `bun build --compile --target=...` for each target. If you need to build them locally:

```sh
bun build src/cli/index.ts --compile --target=bun-linux-x64   --outfile dist/cli/album-details-extractor-linux-x64
bun build src/cli/index.ts --compile --target=bun-darwin-arm64 --outfile dist/cli/album-details-extractor-darwin-arm64
bun build src/cli/index.ts --compile --target=bun-darwin-x64   --outfile dist/cli/album-details-extractor-darwin-x64
bun build src/cli/index.ts --compile --target=bun-windows-x64  --outfile dist/cli/album-details-extractor-windows-x64.exe
```

Each binary is ~50 MB (Bun runtime baked in). Attach all four to the GitHub release.
