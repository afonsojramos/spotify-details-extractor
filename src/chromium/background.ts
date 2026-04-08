// Shared MV3 background — works in both Chromium and Firefox 121+.
// Firefox polyfills the `chrome.*` namespace, so the same source compiles for both.
export {};

import { extractAlbumFromUrl } from "../shared/extractor";
import { SOURCES, routeUrl } from "../shared/sources";

function isAlbumUrl(url: string | undefined): boolean {
  return !!url && !!routeUrl(url);
}

// --- Context menu entries --------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  for (const source of SOURCES) {
    // Browser context menu on album links anywhere on the web.
    chrome.contextMenus?.create({
      id: `extract-album-link-${source.id}`,
      title: "Extract Album Info",
      contexts: ["link"],
      targetUrlPatterns: [...source.albumLinkPatterns],
    });
    // Browser context menu on the page itself when already on an album.
    chrome.contextMenus?.create({
      id: `extract-album-page-${source.id}`,
      title: "Extract Album Info",
      contexts: ["page"],
      documentUrlPatterns: [...source.albumLinkPatterns],
    });
  }
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (tab?.id == null) return;
  const menuId = String(info.menuItemId);
  const url = menuId.startsWith("extract-album-link-")
    ? info.linkUrl
    : menuId.startsWith("extract-album-page-")
      ? tab.url
      : undefined;
  if (url) void handleExtract(tab.id, url);
});

// --- Toolbar button --------------------------------------------------------

chrome.action?.onClicked.addListener((tab) => {
  if (tab?.id != null && tab.url && isAlbumUrl(tab.url)) {
    void handleExtract(tab.id, tab.url);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !chrome.action) return;
    if (isAlbumUrl(tab.url)) {
      void chrome.action.enable(tabId);
    } else {
      void chrome.action.disable(tabId);
    }
  });
});

// --- Messages from in-page content scripts --------------------------------

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && typeof msg === "object" && msg.kind === "ade:extract" && sender.tab?.id != null) {
    void handleExtract(sender.tab.id, msg.url);
  }
});

// --- Core flow -------------------------------------------------------------

async function handleExtract(tabId: number, url: string) {
  // No pre-processing: each source owns its own URL parsing and query/fragment
  // handling. Spotify tolerates `?highlight=` via its embed endpoint; Qobuz
  // extracts the id from the path segments.
  const result = await extractAlbumFromUrl(url);

  if (!result.ok) {
    notify(
      result.reason === "not-album" ? "This isn't an album page." : "Couldn't read album metadata.",
    );
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (json: string) => navigator.clipboard.writeText(json),
      args: [JSON.stringify(result.album)],
    });
    notify(`Copied "${result.album.title}" to clipboard.`);
  } catch (err) {
    notify(`Clipboard write failed: ${(err as Error).message}`);
  }
}

function notify(message: string) {
  chrome.notifications?.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Album Details Extractor",
    message,
  });
}
