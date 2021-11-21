const BUTTON_CLASS = 'qiSIbTMb4HOiTFObpGVJ';
const ARTIST_CLASS = 'a.TQQSam9tGsRXGj4aGFSc';
const IMG_CLASS = 'div.AGotAT_LDWXQc2YQCZES img.lZHD9qKHJOlxxGijUBTE';
const BUTTONS_DIV_CLASS = 'div.sPISrQTumIiljBRDArJN';

var downloadSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
downloadSVG.setAttribute('viewBox', '0 0 485 485');
downloadSVG.setAttribute('width', '24');
downloadSVG.setAttribute('height', '24');
downloadSVG.setAttribute('role', 'img');
downloadSVG.setAttribute('style', 'fill: currentcolor');

var bar = document.createElementNS('http://www.w3.org/2000/svg', 'path');
bar.setAttributeNS(
  null,
  'd',
  'M426.5,458h-368C51,458,45,464,45,471.5S51,485,58.5,485h368c7.5,0,13.5-6,13.5-13.5S434,458,426.5,458z'
);
downloadSVG.appendChild(bar);

var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
arrow.setAttributeNS(
  null,
  'd',
  'M233,378.7c2.5,2.5,6,4,9.5,4s7-1.4,9.5-4l107.5-107.5c5.3-5.3,5.3-13.8,0-19.1c-5.3-5.3-13.8-5.3-19.1,0L256,336.5v-323 C256,6,250,0,242.5,0S229,6,229,13.5v323l-84.4-84.4c-5.3-5.3-13.8-5.3-19.1,0s-5.3,13.8,0,19.1L233,378.7z'
);
downloadSVG.appendChild(arrow);

var downloadButton = document.createElement('button');
downloadButton.setAttribute('class', BUTTON_CLASS);
downloadButton.setAttribute('type', 'button');
downloadButton.setAttribute('aria-label', 'Download');
downloadButton.appendChild(downloadSVG);

downloadButton.onclick = () => {
  const album = {
    title: document.querySelector('h1').textContent,
    artist: document.querySelector(ARTIST_CLASS).textContent,
    image: document.querySelector(IMG_CLASS).src,
    url: window.location.href.match(/https:\/\/open\.spotify\.com\/\w*\/\w*/)[0],
  };
  navigator.clipboard.writeText(JSON.stringify(album));
};

while (!document.querySelector(BUTTONS_DIV_CLASS)) {
  setTimeout(() => {
    console.log('waiting...');
  }, 50);
}

document.querySelector(BUTTONS_DIV_CLASS).appendChild(downloadButton);
