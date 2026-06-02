import { scanPage } from "../services/scanner"
import { clearConfig } from "./storage"
import { clearWorkspaceHandle } from "./filesystem"

async function apiCall<T>(
  endpoint: string,
  body: Record<string, string>,
  label: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "API_CALL", endpoint, body },
      (response) => {
        const err = chrome.runtime.lastError
        if (err) {
          reject(
            new Error(
              `Service worker error\n→ ${label} (${endpoint})\n→ ${err.message}`
            )
          )
          return
        }

        if (!response) {
          reject(
            new Error(
              `No response from service worker\n→ ${label} (${endpoint})\n→ Is the extension loaded?`
            )
          )
          return
        }

        if (!response.ok) {
          const detail =
            response.data?.error ?? JSON.stringify(response.data)
          reject(
            new Error(
              `Server returned ${response.status}\n→ ${label} (${endpoint})\n→ ${detail}`
            )
          )
          return
        }

        resolve(response.data)
      }
    )
  })
}

export async function scanCurrentPage(): Promise<{ screenshot: string }> {
  return scanPage()
}

export async function extractPageText(): Promise<{
  title: string
  url: string
  text: string
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("extractPageText: No active tab")

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

export async function requestProfile(
  files: { name: string; content: string }[],
  apiKey: string
): Promise<string> {
  const data = await apiCall<{ profile: string }>(
    "/api/profile",
    { files: JSON.stringify(files), apiKey },
    "Profile agent"
  )
  return data.profile
}

export async function requestResumeWrite(
  apiKey: string
): Promise<{ result: string; steps: number }> {
  return apiCall("/api/write-resume", { apiKey }, "Resume writer")
}

export async function requestPostingAnalysis(
  text: string,
  apiKey: string
): Promise<{ result: string; steps: number }> {
  return apiCall(
    "/api/analyze-posting",
    { text, apiKey },
    "Posting analysis"
  )
}
