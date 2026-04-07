// Shared MV3 background — works in both Chromium and Firefox 121+.
// Firefox polyfills the `chrome.*` namespace, so the same source compiles for both.
export {};

import { extractAlbumInfoFromUrl } from "../shared/extractor";

const ALBUM_URL = /^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]+/;

// --- Context menu entries --------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  // Appears in the *browser's* right-click menu when hovering an album link
  // anywhere on the web (Twitter, a blog, wherever). Works cross-origin
  // because `activeTab` is granted on menu invocation.
  chrome.contextMenus?.create({
    id: "extract-album-link",
    title: "Extract Album Info",
    contexts: ["link"],
    targetUrlPatterns: ["*://open.spotify.com/album/*"],
  });

  // Fallback: right-click on the page itself when already on an album.
  // Firefox needs Shift+Right-Click because Spotify swallows right-click.
  chrome.contextMenus?.create({
    id: "extract-album-page",
    title: "Extract Album Info",
    contexts: ["page"],
    documentUrlPatterns: ["https://open.spotify.com/album/*"],
  });
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (tab?.id == null) return;
  const url =
    info.menuItemId === "extract-album-link"
      ? info.linkUrl
      : info.menuItemId === "extract-album-page"
        ? tab.url
        : undefined;
  if (url) void handleExtract(tab.id, url);
});

// --- Toolbar button --------------------------------------------------------

chrome.action?.onClicked.addListener((tab) => {
  if (tab?.id != null && tab.url && ALBUM_URL.test(tab.url)) {
    void handleExtract(tab.id, tab.url);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !chrome.action) return;
    if (tab.url && ALBUM_URL.test(tab.url)) {
      void chrome.action.enable(tabId);
    } else {
      void chrome.action.disable(tabId);
    }
  });
});

// --- Messages from the in-page Spotify menu injection ---------------------

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && typeof msg === "object" && msg.kind === "sde:extract" && sender.tab?.id != null) {
    void handleExtract(sender.tab.id, msg.url);
  }
});

// --- Core flow -------------------------------------------------------------

async function handleExtract(tabId: number, rawUrl: string) {
  const url = rawUrl.split("?")[0]!.split("#")[0]!;
  const result = await extractAlbumInfoFromUrl(url);

  if (!result.ok) {
    notify(
      result.reason === "not-album"
        ? "This isn't a Spotify album."
        : "Couldn't read album metadata.",
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
    title: "Spotify Details Extractor",
    message,
  });
}
