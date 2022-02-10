// @ts-check

// NAME: Spotify Details Extractor
// AUTHOR: afonsojramos
// DESCRIPTION: Extracts album information from Spotify.

/// <reference path="globals.d.ts" />

(function SpotifyDetailsExtractor() {
  if (!Spicetify.CosmosAsync || !Spicetify.Platform) {
    setTimeout(SpotifyDetailsExtractor, 1000);
    return;
  }

  const cntxMenu = new Spicetify.ContextMenu.Item(
    'Extract Album Info',
    (uris) => {
      const artists = [];
      document.querySelectorAll('div > h2 + span + div a').forEach((artist) => artists.push(artist.innerHTML));

      const album = {
        title: document.querySelector('h1').innerText,
        artist:
          document.querySelector('div > h2 + span + div > div a')?.innerText ||
          artists.reduce((artist, artistSum) => `${artist}, ${artistSum}`),
        image: document.querySelector('section > div > div > div > img').currentSrc,
        url: Spicetify.URI.fromString(uris[0]).toURL().replace("play","open"),
      };
      Spicetify.CosmosAsync.put('sp://desktop/v1/clipboard', album);
      success(album.title);
    },
    (uris) => {
      if (uris.length === 1) {
        const uriObj = Spicetify.URI.fromString(uris[0]);
        switch (uriObj.type) {
          case Spicetify.URI.Type.ALBUM:
          case Spicetify.URI.Type.COLLECTION:
            return true;
        }
        return false;
      }
      // User selects multiple tracks in a list.
      return false;
    },
    'download'
  );
  cntxMenu.register();

  /**
   * Text of notification when information is extracted successfully.
   * @param {string} title
   */
  function success(title) {
    Spicetify.showNotification(`Copied ${title}'s info to the clipboard!`);
  }
})();
