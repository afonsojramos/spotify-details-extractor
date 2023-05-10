// @ts-check

// NAME: Spotify Details Extractor
// AUTHOR: afonsojramos
// DESCRIPTION: Extracts album information from Spotify.

/// <reference path="./globals.d.ts" />

(function SpotifyDetailsExtractor() {
  if (!Spicetify.CosmosAsync || !Spicetify.Platform) {
    setTimeout(SpotifyDetailsExtractor, 1000);
    return;
  }

  const cntxMenu = new Spicetify.ContextMenu.Item(
    "Extract Album Info",
    (uris) => {
      try {
        const artists = [];
        document
          .querySelectorAll("section > div:first-child > div > div span > a")
          .forEach((artist) => artists.push(artist.innerHTML));

        const album = {
          title: document.querySelector("h1")?.innerText || "",
          artist:
            artists.length === 1
              ? artists[0]
              : artists.reduce(
                  (artist, artistSum) => `${artist}, ${artistSum}`
                ),
          // @ts-ignore
          image: document.querySelector("section > div > div > div > img").src,
          url: Spicetify.URI.fromString(uris[0])
            .toURL()
            .replace("play", "open"),
        };
        Spicetify.CosmosAsync.put("sp://desktop/v1/clipboard", album);
        success(album.title);
      } catch (e) {
        console.error(e);
        Spicetify.showNotification("Something went wrong. Please try again.");
      }
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
    "download"
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
