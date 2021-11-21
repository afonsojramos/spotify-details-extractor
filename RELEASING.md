
## Installation and Compilation

## Chrome

1. [Check the latest release page](https://github.com/aquelemiguel/yt-restore-dislikes/releases/latest). Download and unzip `chromium.zip`.
2. Once you've generated your API key, open `chromium/script.js` and replace the `YT_API_KEY` variable with your own key (paste between the double quotes).
3. Navigate to your browser's extensions page. It's `chrome://extensions` for Chrome and `edge://extensions` for Edge and **enable developer mode**.
4. Click **Load Unpacked** and, in your unzipped folder, select the `/chromium` directory.

More reference on how to manually install Chrome extensions [here](https://developer.chrome.com/docs/extensions/mv3/getstarted/#manifest).

## Firefox

Firefox add-ons, before generating a installable `.xpi` file, must be digitally signed by Mozilla, which can be a tiny bit tedious. 

First of all, install the `web-ext` tool with the following `npm install -g web-ext`.

### Development

Development is very streamlined with its own self-contained browser session using the following command `web-ext run -s firefox`.

### Release

In order to release, you first need to build the `.zip` file inside a new `/web-ext-artifacts` directory, which can also be loaded as a temporary extension in Firefox through the `about:debugging` page with the following: `web-ext build -s firefox --overwrite-dest`.

Afterwards, you need to sign the extension. For this you'll need to generate your [addons.mozilla.org credentials](https://addons.mozilla.org/en-GB/developers/addon/api/key/).

Then, simply run the following command `web-ext sign --api-key=JWT_ISSUER --api-secret=JWT_SECRET` with the API key and secret parameters that you generated. The new `.xpi` file can also be found in the `/web-ext-artifacts` directory.