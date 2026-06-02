interface ScanMessage {
  type: "SCAN_PAGE"
}

interface ScanResponse {
  title: string
  url: string
  text: string
  company: string | null
}

function extractJobContent(): ScanResponse {
  const title = document.title.replace(/ [-|] .*$/, "").trim()

  let company: string | null = null
  const metaCompany =
    document.querySelector<HTMLMetaElement>('meta[name="company"]')?.content ??
    document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content

  if (metaCompany) company = metaCompany

  const selectors = [
    '[data-automation="job-description"]',
    ".job-description",
    ".description",
    '[class*="job-description"]',
    '[class*="posting"]',
    "article",
    "main",
    '[role="main"]',
  ]

  let text = ""
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el && el.textContent && el.textContent.trim().length > 200) {
      text = el.textContent.trim()
      break
    }
  }

  if (!text) {
    text = document.body.innerText
  }

  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")

  const CROP = 20000
  const words = text.split(/\s+/).filter(Boolean).length
  const cropped = text.length > CROP
  text = text.slice(0, CROP)
  if (cropped) {
    console.log(`[content] Cropped from ${text.length + (CROP - text.length) || "?"} to ${CROP} chars (~${words} words)`)
  } else {
    console.log(`[content] Extracted ${text.length} chars, ~${words} words`)
  }

  return { title, url: location.href, text, company }
}

chrome.runtime.onMessage.addListener(
  (message: ScanMessage, _sender, sendResponse) => {
    if (message.type === "SCAN_PAGE") {
      const result = extractJobContent()
      sendResponse(result)
    }
    return true
  }
)
