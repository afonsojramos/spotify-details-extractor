chrome.action.onClicked.addListener((tab) => {
  if (tab.url.match(/https:\/\/open\.spotify\.com\/\w*\/\w*/)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['extractor.js'],
    });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (!tab.url.match(/https:\/\/open\.spotify\.com\/\w*\/\w*/)) chrome.action.disable(tab.id);
  });
});
