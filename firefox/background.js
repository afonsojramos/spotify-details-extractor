browser.contextMenus.create({
  id: 'extract-album',
  title: 'Extract Album Info',
  documentUrlPatterns: ['https://open.spotify.com/*'],
});

function messageTab(tabs) {
  browser.tabs.sendMessage(tabs[0].id, {
    replacement: 'Extracting!',
  });
}

function onExecuted() {
  let querying = browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  querying.then(messageTab);
}

browser.contextMenus.onClicked.addListener(function (info, _tab) {
  if (info.menuItemId == 'extract-album') {
    let executing = browser.tabs.executeScript({
      file: 'extractor.js',
    });
    executing.then(onExecuted);
  }
});
