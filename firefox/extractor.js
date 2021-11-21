extractorReceiver = () => {
  const ARTIST_CLASS = 'a.TQQSam9tGsRXGj4aGFSc';
  const IMG_CLASS = 'div.AGotAT_LDWXQc2YQCZES img.lZHD9qKHJOlxxGijUBTE';

  const album = {
    title: document.querySelector('h1').textContent,
    artist: document.querySelector(ARTIST_CLASS).textContent,
    image: document.querySelector(IMG_CLASS).src,
    url: window.location.href.match(/https:\/\/open\.spotify\.com\/\w*\/\w*/)[0],
  };
  navigator.clipboard.writeText(JSON.stringify(album));
};

browser.runtime.onMessage.addListener(extractorReceiver);
