chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCAN_PAGE") {
    const text = document.body.innerText.slice(0, 8000)
    const title = document.title
    sendResponse({ title, text, url: location.href })
  }
  return true
})
