import { scanPage } from "../services/scanner"
import { clearConfig } from "./storage"
import { clearWorkspaceHandle } from "./filesystem"

const SERVER_URL = "http://localhost:3721"

export async function scanCurrentPage(): Promise<{ screenshot: string }> {
  return scanPage()
}

export async function extractPageText(): Promise<{
  title: string
  url: string
  text: string
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab")

  const extracted: {
    title: string
    url: string
    text: string
    company: string | null
  } = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE" })

  return {
    title: extracted.title,
    url: extracted.url,
    text: extracted.text,
  }
}

export async function resetSession(): Promise<void> {
  await clearWorkspaceHandle()
  await clearConfig()
}

export async function requestProfile(path: string, apiKey: string): Promise<string> {
  const res = await fetch(`${SERVER_URL}/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, apiKey }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? "Profile request failed")
  }

  const data = await res.json()
  return data.profile
}

export async function requestResumeWrite(
  path: string,
  apiKey: string
): Promise<{ result: string; steps: number }> {
  const res = await fetch(`${SERVER_URL}/api/write-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, apiKey }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? "Resume write failed")
  }

  return res.json()
}

export async function requestPostingAnalysis(
  text: string,
  apiKey: string
): Promise<{ result: string; steps: number }> {
  const res = await fetch(`${SERVER_URL}/api/analyze-posting`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, apiKey }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? "Posting analysis failed")
  }

  return res.json()
}
