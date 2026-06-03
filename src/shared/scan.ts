import { captureScreenshot, saveCapture } from "../services/scanner"
import { clearConfig } from "./storage"
import type { WriteResumeResponse, JobScoreResponse } from "./types"

async function apiCall<T>(
  endpoint: string,
  body: Record<string, string>,
  label: string
): Promise<T> {
  console.log(`[apiCall] ▶ ${label} ${endpoint}`)

  try {
    const response = await chrome.runtime.sendMessage({
      type: "API_CALL",
      endpoint,
      body,
    })

    if (!response) {
      throw new Error(`Service worker did not respond\n→ Reload extension in chrome://extensions`)
    }

    if (!response.ok) {
      const detail = response.data?.error ?? JSON.stringify(response.data)
      throw new Error(`Server returned HTTP ${response.status}\n→ ${detail}`)
    }

    return response.data
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[apiCall] ✗ ${label} — ${msg}`)
    throw e
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "API_CALL",
      endpoint: "/api/health",
      body: {},
    })
    return response?.ok && response?.data?.ok === true
  } catch {
    return false
  }
}

export async function scanCurrentPage(): Promise<{ screenshot: string }> {
  const screenshot = await captureScreenshot()
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  saveCapture(screenshot, `resume_adjuster/${date}_job_posting.png`).catch(() => {})
  return { screenshot }
}

export async function extractPageText(): Promise<{
  title: string
  url: string
  text: string
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab")

  try {
    const extracted = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE" })
    return { title: extracted.title, url: extracted.url, text: extracted.text }
  } catch {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title
        const body = document.body.innerText
        const cleaned = body
          .replace(/\n{3,}/g, "\n\n")
          .replace(/ {2,}/g, " ")
          .slice(0, 12000)
          .trim()
        return { title, url: location.href, text: cleaned }
      },
    })
    const data = results[0]?.result
    if (!data || !data.text) throw new Error("No text found on this page")
    return { title: data.title, url: data.url, text: data.text }
  }
}

export async function resetSession(): Promise<void> {
  await clearConfig()
}

export async function requestPostingAnalysis(
  text: string,
): Promise<{ analysis: string }> {
  return apiCall("/api/analyze-posting", { text }, "Posting analysis")
}

export async function requestResumeWrite(
  resumePath: string,
  analysis: string,
): Promise<WriteResumeResponse> {
  return apiCall("/api/write-resume", { resumePath, analysis }, "Resume writer")
}

export async function requestJobScore(
  resumePath: string,
  analysis: string,
): Promise<JobScoreResponse> {
  return apiCall("/api/job-score", { resumePath, analysis }, "Job score")
}
