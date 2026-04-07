import { extractAlbumInfoFromUrl } from "../shared/extractor";

(async () => {
  // Strip fragments/query params (e.g. ?highlight=spotify:track:...)
  const canonical = window.location.origin + window.location.pathname;
  const result = await extractAlbumInfoFromUrl(canonical);

  if (!result.ok) {
    const message =
      result.reason === "not-album"
        ? "This page isn't a Spotify album."
        : "Couldn't read album metadata from this page.";
    chrome.runtime.sendMessage({ kind: "extract:error", message });
    return;
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(result.album));
    chrome.runtime.sendMessage({ kind: "extract:ok", title: result.album.title });
  } catch (err) {
    chrome.runtime.sendMessage({
      kind: "extract:error",
      message: `Clipboard write failed: ${(err as Error).message}`,
    });
  }
})();
