import { scanPage } from "../services/scanner"
import { clearConfig } from "./storage"
import type { WriteResumeResponse } from "./types"

async function apiCall<T>(
  endpoint: string,
  body: Record<string, string>,
  label: string
): Promise<T> {
  console.log(`[apiCall] ▶ ${label} ${endpoint}`)
  console.log(
    `[apiCall] body keys:`,
    Object.keys(body)
  )
  console.log(
    `[apiCall] body sizes:`,
    Object.entries(body)
      .map(([k, v]) => `${k}=${v.length}chars`)
      .join(", ")
  )

  try {
    const response = await chrome.runtime.sendMessage({
      type: "API_CALL",
      endpoint,
      body,
    })

    console.log(
      `[apiCall] ◀ ${label} ok=${response?.ok} status=${response?.status}`
    )
    if (response?.data?.error)
      console.log(`[apiCall] ◀ error:`, response.data.error)

    if (!response) {
      throw new Error(
        `Service worker did not respond\n→ ${label} (${endpoint})\n→ Possible: extension not reloaded after changes, or service worker is inactive\n→ Fix: go to chrome://extensions, click reload`
      )
    }

    if (!response.ok) {
      const detail = response.data?.error ?? JSON.stringify(response.data)
      throw new Error(
        `Server returned HTTP ${response.status}\n→ ${label} (${endpoint})\n→ ${detail}`
      )
    }

    return response.data
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[apiCall] ✗ ${label} — ${msg}`)

    if (
      msg.includes("receiving end does not exist") ||
      msg.includes("Could not establish connection")
    ) {
      throw new Error(
        `Service worker not reachable\n→ ${label}\n→ Fix: reload extension in chrome://extensions`
      )
    }

    throw e
  }
}

export async function scanCurrentPage(): Promise<{ screenshot: string }> {
  console.log("[scan] ▶ Starting screenshot capture")
  try {
    const result = await scanPage()
    console.log("[scan] ◀ Screenshot captured successfully")
    return result
  } catch (e) {
    console.error("[scan] ✗", e)
    throw e
  }
}

export async function extractPageText(): Promise<{
  title: string
  url: string
  text: string
}> {
  console.log("[scan] ▶ Extracting page text via content script")
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("[scan] ✗ No active tab")
  console.log(`[scan] Active tab: id=${tab.id} url=${tab.url}`)

  try {
    const extracted = await chrome.tabs.sendMessage(tab.id, {
      type: "SCAN_PAGE",
    })
    console.log(
      `[scan] ◀ Extracted ${extracted.text.length} chars from page "${extracted.title}"`
    )
    return { title: extracted.title, url: extracted.url, text: extracted.text }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("receiving end does not exist")) {
      throw new Error(
        `Content script not loaded on this page\n→ Navigate to the job posting page, then reopen the extension popup\n→ Or: reload the extension in chrome://extensions`
      )
    }
    throw e
  }
}

export async function resetSession(): Promise<void> {
  await clearConfig()
}

export async function requestCreateSkill(
  resumePath: string,
  name: string,
  targetRoles: string,
  industry: string,
  apiKey: string
): Promise<{ skillCreated: boolean }> {
  return apiCall(
    "/api/create-skill",
    { resumePath, name, targetRoles, industry, apiKey },
    "Create skill"
  )
}

export async function requestPostingAnalysis(
  text: string,
  apiKey: string
): Promise<{ analysis: string; steps: number }> {
  return apiCall(
    "/api/analyze-posting",
    { text, apiKey },
    "Posting analysis"
  )
}

export async function requestResumeWrite(
  analysis: string,
  apiKey: string
): Promise<WriteResumeResponse> {
  return apiCall(
    "/api/write-resume",
    { analysis, apiKey },
    "Resume writer"
  )
}
