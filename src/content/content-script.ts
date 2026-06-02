interface ScanMessage {
  type: "SCAN_PAGE"
}

interface ScanResponse {
  title: string
  url: string
  text: string
}

const MAX_CHARS = 12000

function extractText(): ScanResponse {
  const title = document.title.trim()
  const body = document.body.innerText

  const cleaned = body
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .slice(0, MAX_CHARS)
    .trim()

  console.log(
    `[content] Extracted ${cleaned.length} chars from "${title}"`
  )

  return { title, url: location.href, text: cleaned }
}

chrome.runtime.onMessage.addListener(
  (message: ScanMessage, _sender, sendResponse) => {
    if (message.type === "SCAN_PAGE") {
      sendResponse(extractText())
    }
    return true
  }
)
