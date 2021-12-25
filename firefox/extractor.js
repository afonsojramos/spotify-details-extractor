extractorReceiver = () => {
  artists = [];
  document.querySelectorAll('div > h2 + span + div > a').forEach((artist) => artists.push(artist.innerHTML));

  album = {
    title: document.querySelector('h1').innerText,
    artist:
      document.querySelector('div > h2 + span + div > div > a')?.innerText ||
      artists.reduce((artist, artistSum) => `${artist}, ${artistSum}`),
    image: document.querySelector('section > div > div > div > img').src,
    url: window.location.href.match(/https:\/\/open\.spotify\.com\/\w*\/\w*/)[0],
  };

  navigator.clipboard.writeText(JSON.stringify(album));
};

browser.runtime.onMessage.addListener(extractorReceiver);
