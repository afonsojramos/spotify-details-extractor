// Bookmarklet entry. Compiled as a minified IIFE, URL-encoded, and
// prefixed with `javascript:` by the build script.
import { extractAlbumFromUrl } from "../shared/extractor";

(async () => {
  try {
    const result = await extractAlbumFromUrl(window.location.href);
    if (!result.ok) {
      alert(
        `Album Details Extractor: ${
          result.reason === "not-album"
            ? "This isn't a supported album page."
            : "Couldn't read album metadata."
        }`,
      );
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(result.album));
    alert(`Copied "${result.album.title}" to clipboard.`);
  } catch (err) {
    alert(`Album Details Extractor: ${(err as Error).message}`);
  }
})();
