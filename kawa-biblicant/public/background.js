const PDF_REGEX = /\.pdf($|[?#])/i;
const ARXIV_REGEX = /https?:\/\/arxiv\.org\/(abs|pdf)\//i;

function isPdfUrl(url) {
  return PDF_REGEX.test(url) || ARXIV_REGEX.test(url);
}

chrome.action.onClicked.addListener(async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const runtimeUrl = chrome.runtime.getURL("");
  const isViewerTab =
    activeTab?.url && activeTab.url.startsWith(runtimeUrl) && activeTab.url.includes("viewer.html");

  if (activeTab?.url && isPdfUrl(activeTab.url) && !isViewerTab) {
    const encoded = encodeURIComponent(activeTab.url);
    const targetUrl = chrome.runtime.getURL(`viewer.html?src=${encoded}`);
    if (activeTab.id != null) {
      chrome.tabs.update(activeTab.id, { url: targetUrl });
    } else {
      chrome.tabs.create({ url: targetUrl });
    }
    return;
  }

  const targetUrl = chrome.runtime.getURL("index.html");
  chrome.tabs.create({ url: targetUrl });
});
