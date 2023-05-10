artists = [];
document
  .querySelectorAll("section > div:first-child > div > div span > a")
  .forEach((artist) => artists.push(artist.innerHTML));

album = {
  title: document.querySelector("h1").innerText,
  artist:
    artists.length === 1
      ? artists[0]
      : artists.reduce((artist, artistSum) => `${artist}, ${artistSum}`),
  image: document.querySelector("section > div > div > div > img").src,
  url: window.location.href.match(/https:\/\/open\.spotify\.com\/\w*\/\w*/)[0],
};

navigator.clipboard.writeText(JSON.stringify(album));
