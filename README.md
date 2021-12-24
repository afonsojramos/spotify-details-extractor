<h3 align="center"><img src="https://user-images.githubusercontent.com/19473034/147307719-faf4a334-6e5d-4153-8d47-c03c83276e57.png" width="150px"></h3>
<h1 align="center"> Spotify Details Extractor 🎶 </h1>

Simple browser extension to extract Spotify details from an album page in a specific JSON object. You can find it in any context menu/extension bar near you!

<p align="center"><table><tr>
<td valign="center"><img src="https://user-images.githubusercontent.com/19473034/147307876-bc991613-cbe9-472d-9eb3-0389a4defd6e.png"></td>
<td><img src="https://user-images.githubusercontent.com/19473034/147306510-e4beba47-4dff-4097-a9cf-c6584e575706.png"></td>
</tr></table><p align="center">

**PS**: This extension is actually not that intrusive and will actually only show up in the context menu when you are in the Spotify Web App. Furthermore, since they capture the user's `Right Click`, you need to press `Shift` + `Right Click` for it to show up.

## Installation

### Firefox

Navigate to `about:addons`, select **Install Add-on From File...** and choose the `.xpi` extension that you've downloaded from the [GitHub releases page](https://github.com/afonsojramos/spotify-details-extractor/releases/latest).

### Chromium

Navigate to `chrome://extensions` and drag the `.crx` extension that you've downloaded from the [GitHub releases page](https://github.com/afonsojramos/spotify-details-extractor/releases/latest).

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

![image](https://user-images.githubusercontent.com/19473034/142782818-40620f75-f867-44b6-84ac-5cafcabbfcc9.png)

However, the process of extracting the details from the album page is quite tedious as I have to **manually** copy the album's URL, extract the album's title, artist and image URL. All of this requires the opening of the developer's console and makes the process rather slow.

Therefore, I decided to create a browser extension that will **extract the details** from the album page, store them in the desired JSON object, and **automatically copy it to the clipboard**.

## Implementation

Initially, I was going to create an extension that would create a in-page button that would trigger the events. I was somewhat successful in this, but the process of creating said button that would align with spotify's design language meant more waiting time for page loads, and less reliability, as sometimes the page would say that alledgedly it was loaded, however, not all elements were already created, which led to failures in creating the button.

With this in mind, on v2 I shifted to a simple context menu that would trigger said events. This also proved to be way more reliable and faster than the previous approach.

## Publishing

As this extension is purely meant to be self-serving, I don't think that it is necessary to publish this extension in any of the browser stores as it is not meant to be used by anyone. But if you do find it useful, feel free to install it from the [GitHub releases page](https://github.com/afonsojramos/spotify-details-extractor/releases/latest)!
