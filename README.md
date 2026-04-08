<h3 align="center"><img src="./assets/logo.png" width="180px"></h3>
<h1 align="center"> Album Details Extractor 🎶 </h1>

<p align="center">
  <a href="https://github.com/afonsojramos/album-details-extractor/actions/workflows/integration.yml"><img src="https://github.com/afonsojramos/album-details-extractor/actions/workflows/integration.yml/badge.svg" alt="Integration tests"></a>
  <a href="https://github.com/afonsojramos/album-details-extractor/releases/latest"><img src="https://img.shields.io/github/v/release/afonsojramos/album-details-extractor?logo=github" alt="Latest release"></a>
  <a href="https://github.com/afonsojramos/album-details-extractor/issues"><img src="https://img.shields.io/github/issues/afonsojramos/album-details-extractor?logo=github" alt="Issues"></a>
</p>

Extract album metadata from **Spotify** or **Qobuz** into a compact JSON object and drop it on your clipboard. Five interfaces, one shared extractor, one consistent output.

## Quick start

Right-click any album (in Spotify's web app, on a random blog, in Qobuz, wherever) and pick **Extract Album Info**. The following lands in your clipboard:

```json
{
  "title": "Currents",
  "artist": "Tame Impala",
  "image": "https://image-cdn-ak.spotifycdn.com/image/ab67616d0000b2739e1cfc756886ac782e363d79",
  "url": "https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv"
}
```

Same shape for Spotify and Qobuz — the destination (a blog, a JSON database, a `music.json` file) doesn't care which store the album came from.

## Supported sources

| Source  | URL shapes                                                                                  |
| ------- | ------------------------------------------------------------------------------------------- |
| Spotify | `open.spotify.com/album/{id}` (web + embed + with `?highlight=` query)                      |
| Qobuz   | `www.qobuz.com/{locale}/album/{slug}/{id}`, `play.qobuz.com/album/{id}`, `open.qobuz.com/…` |

Podcasts, shows, tracks, and playlists are rejected with a friendly notification instead of producing bogus JSON.

## Interfaces

Five ways to trigger extraction — pick whichever fits your flow. They all share the same extractor core and output identical JSON.

### 1. Browser extension (Chromium / Firefox)

Four triggers inside the extension:

- **The site's own right-click menu.** An **Extract Album Info** entry is injected into Spotify's and Qobuz's native context menus when you right-click an album card or row.
- **Browser right-click on an album link** — works _anywhere on the web_ (a blog post, a tweet, a Slack message) thanks to MV3's `contexts: ["link"]`.
- **Browser right-click on the album page** — right-click the page background while on an album. Firefox needs **Shift+Right-Click** on Spotify because Spotify swallows the normal right-click.
- **Toolbar button** — click the extension icon. Auto-greyed-out on non-album pages.

### 2. Bookmarklet

A one-line `javascript:` URL you save as a bookmark. Click it on any supported album page and the JSON lands in your clipboard. **Zero install friction, nothing to review.** Install by downloading `install.html` from the [latest release](https://github.com/afonsojramos/album-details-extractor/releases/latest) and dragging the "Extract Album Info" button to your bookmarks bar.

### 3. CLI (standalone binary)

A single-file executable, no runtime required. Grab the build for your platform from the [latest release](https://github.com/afonsojramos/album-details-extractor/releases/latest):

```sh
album-details-extractor https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv
album-details-extractor https://www.qobuz.com/us-en/album/currents-tame-impala/0060254736219
album-details-extractor https://play.qobuz.com/album/cayd4x3o39hma
```

Prints the JSON to stdout. Exit codes: `0` success, `1` extraction failed, `64` usage error.

### 4. Spicetify

The Spicetify variant exposes an **Extract Album Info** entry in Spotify desktop's native context menu. Spotify only — Qobuz has no Spicetify equivalent.

## Installation

<table align="center">
  <tr>
    <th>Install</th>
    <th>How</th>
  </tr>
  <tr>
    <td align="center">
      <a href="https://addons.mozilla.org/en-GB/firefox/addon/spotify-details-extractor/"><img width="300" src="https://github.com/afonsojramos/album-details-extractor/assets/19473034/79153f53-0f0f-48e0-aea5-e4cd6d41d8e7"></a>
    </td>
    <td>Browser context menu and toolbar button on Firefox. MV3 (requires Firefox 121+).</td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://chrome.google.com/webstore/detail/spotify-details-extractor/kfpkjhjengocbiaipfcbdhpjbaenkanb?hl=en">
        <img width="300" src="https://github.com/afonsojramos/album-details-extractor/assets/19473034/32948c57-0467-4e0d-8f25-e74814b91355">
      </a>
    </td>
    <td>Same on Chrome / Edge / Brave / Vivaldi / any Chromium browser.</td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://spicetify.app">
        <img width="300" src="https://github.com/afonsojramos/album-details-extractor/assets/19473034/6bd6b76e-18c4-474a-b256-fd02e5bf9069">
      </a>
    </td>
    <td>Spicetify desktop extension via <a href="https://github.com/spicetify/spicetify-marketplace">Marketplace</a> or <a href="https://spicetify.app/docs/advanced-usage/extensions">manually</a>.</td>
  </tr>
  <tr>
    <td align="center"><b>Bookmarklet</b></td>
    <td>Download <code>install.html</code> from the <a href="https://github.com/afonsojramos/album-details-extractor/releases/latest">latest release</a> and drag the button to your bookmarks bar.</td>
  </tr>
  <tr>
    <td align="center"><b>CLI binary</b></td>
    <td>Download <code>album-details-extractor-{linux,darwin,windows}-*</code> from the <a href="https://github.com/afonsojramos/album-details-extractor/releases/latest">latest release</a> and put it on your <code>$PATH</code>.</td>
  </tr>
</table>

### Manual installation

**Firefox** — `about:addons` → **Install Add-on From File…** → pick the `.xpi` from the [latest release](https://github.com/afonsojramos/album-details-extractor/releases/latest).

**Chromium** — `chrome://extensions` → enable **Developer mode** → **Load unpacked** and select the unzipped `album-details-extractor-chromium.zip` from the [latest release](https://github.com/afonsojramos/album-details-extractor/releases/latest).

**Spicetify** — download `album-details-extractor-spicetify.js` from the [latest release](https://github.com/afonsojramos/album-details-extractor/releases/latest), drop it into `~/.config/spicetify/Extensions/`, then run `spicetify config extensions album-details-extractor-spicetify.js && spicetify apply`.

## Motivation

My personal website uses a [TypeScript data file](https://github.com/afonsojramos/afonsojramos.me/blob/main/src/content/music.ts) to track my favourite albums of the year. Each entry looks like this:

```json
{
  "title": "For the first time",
  "artist": "Black Country, New Road",
  "image": "https://i.scdn.co/image/ab67616d00001e020ffaa4f75b2297d36ff1e0ad",
  "url": "https://open.spotify.com/album/2PfgptDcfJTFtoZIS3AukX"
}
```

The resulting page is [afonsojramos.me/music](https://afonsojramos.me/music).

Copying each album's title, artist, image URL, and canonical URL by hand — opening DevTools, digging through the React tree — is slow and tedious. Album Details Extractor automates the whole thing into a single click, context-menu entry, bookmark, or CLI invocation.

<p align="center"><img src="https://user-images.githubusercontent.com/19473034/142782818-40620f75-f867-44b6-84ac-5cafcabbfcc9.png"></p>

## For developers

Sources live under `src/`, split into a tiny plugin interface (`src/shared/types.ts`), source modules (`src/shared/sources/{spotify,qobuz}.ts`), a router (`src/shared/sources/index.ts`), and five thin interface wrappers. Adding a new source (Tidal, Bandcamp, Apple Music) means writing one new file in `src/shared/sources/` and registering it — every interface picks it up automatically.

```sh
bun install
bun run build        # → dist/{chromium,firefox,spicetify,bookmarklet,cli}
bun run typecheck    # tsc --noEmit
bun test             # unit tests (pure parsers)
bun run verify       # integration tests against live Spotify + Qobuz
```

See [`RELEASING.md`](./RELEASING.md) for publish workflow and [`PRIVACY.md`](./PRIVACY.md) for the privacy policy.

## More

🌟 Like it? Gimme some love!

[![Github Stars badge](https://img.shields.io/github/stars/afonsojramos/album-details-extractor?logo=github&style=social)](https://github.com/afonsojramos/album-details-extractor/)

Found a bug or a source that breaks? [Open an issue](https://github.com/afonsojramos/album-details-extractor/issues/new/choose).
