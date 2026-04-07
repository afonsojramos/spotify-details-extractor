# Releasing

All sources live under `src/`. The build emits ready-to-load extensions into
`dist/{chromium,firefox,spicetify}`.

```sh
bun install
bun run build       # → dist/
bun run typecheck   # tsc --noEmit
bun run verify      # smoke-tests extractor against live Spotify
```

To bump the version in both manifests from the latest git tag:

```sh
bun run bump
```

## Chromium

### Development

Go to `chrome://extensions`, enable **Developer Mode** and **Load Unpacked**,
selecting `dist/chromium`. Reload after every `bun run build`.

### Release

```sh
bun run build
bun run chromium:zip    # → dist/spotify-details-extractor-chromium.zip
```

Upload the zip to the [Chrome Web Store Dev Console](https://chrome.google.com/webstore/devconsole/).

## Firefox

Firefox is now MV3 (`browser_specific_settings.gecko.strict_min_version: 121`).

### Development

```sh
bun run firefox:dev     # builds + launches a temporary Firefox profile
```

### Release

```sh
JWT_ISSUER=… JWT_SECRET=… bun run firefox:release
```

This builds and signs in one step. Generate API credentials at
<https://addons.mozilla.org/en-GB/developers/addon/api/key/>. The signed `.xpi`
lands in `dist/`.

## Spicetify

```sh
bun run spicetify:install   # build + copy extractor.js into ~/.config/spicetify/Extensions
bun run spicetify:setup     # one-time: spicetify config extensions extractor.js
bun run spicetify:dev       # spicetify watch -le for live reload
```
