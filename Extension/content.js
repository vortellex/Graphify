function getPageText() {
  const content = document.querySelector('#mw-content-text');
  if (!content) return '';
  const paragraphs = content.querySelectorAll('p');
  let text = '';
  paragraphs.forEach(p => {
    text += p.innerText + ' ';
  });
  return text.slice(0, 5000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getText") {
    sendResponse({ text: getPageText() });
  }
});