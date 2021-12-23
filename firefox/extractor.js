extractorReceiver = () => {
  const album = {
    title: document.querySelector('h1').textContent,
    artist: document.querySelector('div > h2 + span + div > div > a').textContent,
    image: document.querySelector('section > div > div > div > img').src,
    url: window.location.href.match(/https:\/\/open\.spotify\.com\/\w*\/\w*/)[0],
  };
  navigator.clipboard.writeText(JSON.stringify(album));
};

browser.runtime.onMessage.addListener(extractorReceiver);
