browser.webNavigation.onCompleted.addListener(
  (currentTab) => {
    browser.tabs.executeScript(currentTab.tabId, {
      file: 'extractor.js',
    });
  },
  {
    url: [{ hostContains: 'spotify.com' }],
  }
);
