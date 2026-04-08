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

## Store submission (Chrome Web Store + AMO)

Both stores require per-permission justifications on update submission. The text below is kept in-repo so reviewers can cross-reference it with the manifest and the privacy policy.

### Single-purpose description

> Extracts the title, artist, cover art URL, and canonical URL of an album into a JSON object and copies it to the clipboard.

### Data-usage certifications (Chrome Web Store only)

All three checkboxes apply — tick them:

- "I do not sell or transfer user data to third parties, outside of the approved use cases"
- "I do not use or transfer user data for purposes that are unrelated to my item's single purpose"
- "I do not use or transfer user data to determine creditworthiness or for lending purposes"

### Permission justifications

Paste each block verbatim into the corresponding field on the CWS / AMO form.

#### `scripting`

> Injects a small inline function into the active tab to write the extracted album JSON to the clipboard via `navigator.clipboard.writeText`. Clipboard writes are not possible directly from an MV3 background service worker, so `chrome.scripting.executeScript` with an inline function is the standard MV3 pattern used here.

#### `tabs`

> Used to read the active tab's URL to detect when the user is on a supported album page, and to enable or disable the toolbar button accordingly. No tab content or history is read.

#### `contextMenus`

> Adds "Extract Album Info" entries to the browser context menu — one for each supported streaming source, shown when right-clicking an album link anywhere on the web (`contexts: ["link"]` with `targetUrlPatterns` limited to each source's album URLs), and a matching entry for the page background while already on an album page.

#### `notifications`

> Shows a small success notification with the copied album title after extraction, and a failure notification if the page isn't a supported album or clipboard write fails. No notifications are shown outside of user-initiated extraction actions.

#### `activeTab`

> Required because the "Extract Album Info" context-menu entries are available on supported album links across the whole web (e.g. in a blog post or a tweet). When the user explicitly clicks that entry, `activeTab` grants the extension one-time access to the current tab so it can write the extracted JSON to the clipboard. No access is taken until the user explicitly invokes the menu item.

#### Host permission `*://*.spotify.com/*`

> Required to fetch `https://open.spotify.com/embed/album/{id}` from the background service worker, which returns Spotify's own structured album metadata (title, artist, cover art). No other Spotify endpoints are accessed. No data is sent anywhere — the extracted JSON goes directly to the user's clipboard.

#### Host permission `*://*.qobuz.com/*`

> Required to fetch `https://www.qobuz.com/us-en/album/-/{id}` from the background service worker (which redirects to the canonical Qobuz catalog page) to read the album's title, artist, and cover art from Qobuz's own Open Graph meta tags. No other Qobuz endpoints are accessed. No data is sent anywhere — the extracted JSON goes directly to the user's clipboard.

#### Host permission `*://*.tidal.com/*`

> Required to fetch `https://tidal.com/browse/album/{id}` from the background service worker, which returns Tidal's own public album metadata (title, artist, cover art). No other Tidal endpoints are accessed. No data is sent anywhere — the extracted JSON goes directly to the user's clipboard.

#### Host permission `*://music.apple.com/*`

> Required to fetch `https://music.apple.com/us/album/{id}` from the background service worker, which returns Apple Music's own public album metadata (title, artist, cover art) via Open Graph and `apple:*` meta tags. No other Apple Music endpoints are accessed. No data is sent anywhere — the extracted JSON goes directly to the user's clipboard.

#### Host permission `*://*.deezer.com/*`

> Required to fetch `https://www.deezer.com/album/{id}` from the background service worker, which returns Deezer's own public album metadata (title, artist, cover art) via Open Graph meta tags. No other Deezer endpoints are accessed. No data is sent anywhere — the extracted JSON goes directly to the user's clipboard.

#### Host permission `*://*.bandcamp.com/*`

> Required to fetch `https://{artist}.bandcamp.com/album/{slug}` from the background service worker. Bandcamp uses per-artist subdomains for every release, so a wildcard subdomain match is unavoidable. Only album pages are read, and only their public Open Graph meta tags. No data is sent anywhere — the extracted JSON goes directly to the user's clipboard.

### Review expectations

- **AMO will flag the Bandcamp wildcard subdomain** (`*://*.bandcamp.com/*`) for human review because of the `*.*` pattern. The Bandcamp rationale above explicitly explains why (per-artist subdomains).
- **CWS will re-review** on any new host permission, typically 3–14 days.
- **All requests use `credentials: "omit"`** — worth mentioning if a reviewer asks about cookie handling. The privacy policy calls this out explicitly.
- **Privacy policy URL** — `https://github.com/afonsojramos/album-details-extractor/blob/main/PRIVACY.md`.
