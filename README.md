<h3 align="center"><img src="https://user-images.githubusercontent.com/19473034/147307719-faf4a334-6e5d-4153-8d47-c03c83276e57.png" width="150px"></h3>
<h1 align="center"> Spotify Details Extractor 🎶 </h1>

Simple browser extension to extract Spotify details from an album page in a specific JSON object. You can find it in any context menu/extension bar near you!

## How to trigger it

The browser extensions (Chromium and Firefox) support four different ways to extract album info — pick whichever fits your flow:

1. **Spotify's own right-click menu** — right-click any album card, row, or tile inside the Spotify Web App. An **Extract Album Info** entry is injected into Spotify's native context menu.
2. **Browser right-click on an album link** — right-click any `open.spotify.com/album/...` link *anywhere on the web* (a blog post, a tweet, a Slack message). An **Extract Album Info** entry appears in your browser's own context menu, courtesy of `contexts: ["link"]`.
3. **Browser right-click on the album page** — right-click the page background while on an album. On Firefox you'll need **Shift+Right-Click** because Spotify swallows the normal right-click.
4. **Toolbar button** — click the extension icon in your browser's toolbar. It's only enabled on album pages; on other sites the icon is greyed out.

The Spicetify version exposes a single entry in Spotify desktop's native context menu, also labelled **Extract Album Info**.

## Installation

<table align="center">
  <tr>
    <th>
      Browser Download
    </th>
    <th>
      Usage Example
    </th>
  </tr>
  <tr>
    <td align="center">
      <a href="https://addons.mozilla.org/en-GB/firefox/addon/spotify-details-extractor/"><img width="300" src="https://github.com/afonsojramos/spotify-details-extractor/assets/19473034/79153f53-0f0f-48e0-aea5-e4cd6d41d8e7"></a>
    </td>
    <td align="center">
      <img src="https://user-images.githubusercontent.com/19473034/147307876-bc991613-cbe9-472d-9eb3-0389a4defd6e.png">
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://chrome.google.com/webstore/detail/spotify-details-extractor/kfpkjhjengocbiaipfcbdhpjbaenkanb?hl=en">
        <img  width="300" src="https://github.com/afonsojramos/spotify-details-extractor/assets/19473034/32948c57-0467-4e0d-8f25-e74814b91355">
      </a>
    </td>
    <td align="center">
      <img src="https://user-images.githubusercontent.com/19473034/147306510-e4beba47-4dff-4097-a9cf-c6584e575706.png">
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://spicetify.app">
        <img width="300" src="https://github.com/afonsojramos/spotify-details-extractor/assets/19473034/6bd6b76e-18c4-474a-b256-fd02e5bf9069">
      </a>
      <br/>
      <a href="https://github.com/spicetify/spicetify-marketplace">Spicetify Marketplace</a> or <a href="https://spicetify.app/docs/advanced-usage/extensions">manually</a>.
    </td>
    <td align="center">
      <img src="https://user-images.githubusercontent.com/19473034/147316727-77960f1e-2e61-4922-bfaa-3a9c6f15811f.png">
    </td>
  </tr>
</table>

## Manual Installation

### Firefox

Navigate to `about:addons`, select **Install Add-on From File...** and choose the `.xpi` extension that you've downloaded from the [GitHub releases page](https://github.com/afonsojramos/spotify-details-extractor/releases/latest).

### Chromium

Navigate to `chrome://extensions` and drag the `.crx` extension that you've downloaded from the [GitHub releases page](https://github.com/afonsojramos/spotify-details-extractor/releases/latest).

### Spicetify

Navigate to `~/.config/spicetify/Extensions` and download `extractor.js` that can be found in the [GitHub releases page](https://github.com/afonsojramos/spotify-details-extractor/releases/latest). Then, using `spicetify config extensions extractor.js`, enable the extension.

## Motivation

Currently, my personal website uses a [JSON Database](https://github.com/afonsojramos/afonsojramos.me/blob/main/data/music.json) to store the details of my favorite albums of the year.

Each entry is constructed by the following JSON schema:

```json
{
  "title": "For the first time",
  "artist": "Black Country, New Road",
  "image": "https://i.scdn.co/image/ab67616d00001e020ffaa4f75b2297d36ff1e0ad",
  "url": "https://open.spotify.com/album/2PfgptDcfJTFtoZIS3AukX"
}
```

The resulting page can be seen in [afonsojramos.me/music](afonsojramos.me/music).

<p align="center"><img src="https://user-images.githubusercontent.com/19473034/142782818-40620f75-f867-44b6-84ac-5cafcabbfcc9.png"><p>

However, the process of extracting the details from the album page is quite tedious as I have to **manually** copy the album's URL, and extract the album's title, artist and image URL. All of this requires the opening of the developer's console and makes the process rather slow.

Therefore, I decided to create a browser extension that will **extract the details** from the album page, store them in the desired JSON object, and **automatically copy it to the clipboard**.

## Implementation

Initially, I was going to create an extension that would create an in-page button that would trigger the events. I was somewhat successful in this (it works perfectly on Spicetify), but on Spotify's Web App things are a bit more complicated as it meant interacting with the page's DOM, which I preferred not to do as it would be more prone to errors.

With this in mind, `v2` shifted to a simple context menu on Firefox and the extension button on Chromium, due to the latter not supporting context menus. These proved to be way more reliable and faster than the previous approach.

## More
🌟 Like it? Gimme some love!    
[![Github Stars badge](https://img.shields.io/github/stars/afonsojramos/spotify-details-extractor?logo=github&style=social)](https://github.com/afonsojramos/spotify-details-extractor/)

If you find any bugs, please [create a new issue](https://github.com/afonsojramos/spotify-details-extractor/issues/new/choose) on the GitHub repo. Podcast and show pages are filtered out automatically.    
![https://github.com/afonsojramos/spotify-details-extractor/issues](https://img.shields.io/github/issues/afonsojramos/spotify-details-extractor?logo=github)
