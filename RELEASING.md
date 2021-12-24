
## Installation and Compilation

## Chromium

### Development

Chromium only requires you to go to `chrome://extensions`, activating **Developer Mode** and `Load Unpacked` by selecting the folder that you have the extension on. No need to zip it or package it in any way. More reference on how to manually install Chrome extensions [here](https://developer.chrome.com/docs/extensions/mv3/getstarted/#manifest).

### Release

In order to release, all you need to do is select `Pack Extension` under `chrome://extensions`, select the folder and that's it! Remeber to save the key somewhere safe to generate new versions of the extension.

Then, if you want, you may upload the `.crx` archive to the [Chrome Web Store Dev Console](https://chrome.google.com/webstore/devconsole/).

## Firefox

Firefox add-ons, before generating a installable `.xpi` file, must be digitally signed by Mozilla, which can be a tiny bit tedious. 

First of all, install the `web-ext` tool with the following `npm install -g web-ext`.

### Development

Development is very streamlined with its own self-contained browser session using the following command `web-ext run -s firefox`.

### Release

In order to release, you first need to build the `.zip` file inside a new `/web-ext-artifacts` directory, which can also be loaded as a temporary extension in Firefox through the `about:debugging` page with the following: `web-ext build -s firefox --overwrite-dest`.

Afterwards, you need to sign the extension. For this you'll need to generate your [addons.mozilla.org credentials](https://addons.mozilla.org/en-GB/developers/addon/api/key/).

Then, simply run the following command `web-ext sign -s firefox --api-key=JWT_ISSUER --api-secret=JWT_SECRET` with the API key and secret parameters that you generated. The new `.xpi` file can also be found in the `/web-ext-artifacts` directory.