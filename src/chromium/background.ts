export {};
// Shared MV3 background — works in both Chromium and Firefox 121+.
// Firefox polyfills the `chrome.*` namespace, so the same source compiles for both.

const SPOTIFY_URL = /^https:\/\/open\.spotify\.com\/(album|playlist)\//;

function isSpotifyAlbumUrl(url: string | undefined): boolean {
  return !!url && SPOTIFY_URL.test(url);
}

async function runExtractor(tabId: number) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

// --- Toolbar button (Chromium-style) ---------------------------------------
chrome.action?.onClicked.addListener((tab) => {
  if (tab.id != null && isSpotifyAlbumUrl(tab.url)) {
    void runExtractor(tab.id);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !chrome.action) return;
    if (isSpotifyAlbumUrl(tab.url)) {
      void chrome.action.enable(tabId);
    } else {
      void chrome.action.disable(tabId);
    }
  });
});

// --- Context menu (Firefox-style; harmless on Chromium) --------------------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: "extract-album",
    title: "Extract Album Info",
    contexts: ["page"],
    documentUrlPatterns: ["https://open.spotify.com/*"],
  });
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "extract-album" && tab?.id != null) {
    void runExtractor(tab.id);
  }
});

// --- Notifications ---------------------------------------------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || typeof msg !== "object") return;
  if (msg.kind === "extract:ok") {
    notify("Spotify Details Extractor", `Copied "${msg.title}" to clipboard.`);
  } else if (msg.kind === "extract:error") {
    notify("Spotify Details Extractor", msg.message ?? "Extraction failed.");
  }
});

function notify(title: string, message: string) {
  chrome.notifications?.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
  });
}
