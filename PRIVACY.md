# Privacy Policy

_Last updated: 2026-04-08_

**Album Details Extractor** does not collect, store, transmit, sell, or share any personal data.

## What the extension does

When you explicitly invoke it — by clicking the toolbar button, picking an entry from a context menu, triggering it from a site's own right-click menu, running the bookmarklet, or invoking the CLI — the extension:

1. Reads the album URL you are interacting with (Spotify or Qobuz).
2. Fetches publicly-available album metadata (title, artist, cover art URL, canonical album URL) from the source's own public endpoints:
   - Spotify: `https://open.spotify.com/embed/album/{id}`
   - Qobuz: `https://www.qobuz.com/us-en/album/-/{id}` (which redirects to the canonical album page)
3. Writes a JSON object containing that metadata to your local clipboard.

That's it. The extension does nothing in the background, nothing on startup, and nothing between explicit user invocations.

## What is _not_ collected

- No browsing history
- No personal identifiers
- No Spotify account data
- No cookies, local storage, or authentication tokens
- No analytics, telemetry, or crash reports
- No data of any kind sent to the author or any third party

## Network access

The only network requests the extension makes are to Spotify's embed endpoint and Qobuz's album pages, and only when you explicitly invoke an extraction. These requests contain no user-identifying information beyond what your browser sends on any ordinary request to those URLs.

## Permissions

The extension requests the minimum permissions required for its single purpose:

- **`scripting`** — to write the extracted JSON to your clipboard (required because Manifest V3 service workers cannot access the Clipboard API directly).
- **`tabs`** — to detect when you are on a Spotify album page and enable or disable the toolbar icon accordingly.
- **`contextMenus`** — to add "Extract Album Info" entries to the browser right-click menu.
- **`notifications`** — to show a brief success or failure notification after you invoke an extraction.
- **`activeTab`** — to copy to the clipboard of the current tab when you explicitly invoke the context menu on a Spotify album link on any page.
- **Host permission `*://*.spotify.com/*`** — to fetch album metadata from Spotify's own embed endpoint.
- **Host permission `*://*.qobuz.com/*`** — to fetch album metadata from Qobuz's own public album pages.

None of these permissions are used for any purpose other than the one stated above.

## Open source

The full source code of this extension is available at <https://github.com/afonsojramos/album-details-extractor>. You are welcome to inspect, audit, fork, or redistribute it under the repository's license.

## Contact

If you have questions or concerns about this policy, please open an issue at <https://github.com/afonsojramos/album-details-extractor/issues>.
