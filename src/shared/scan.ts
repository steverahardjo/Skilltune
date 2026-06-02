import { scanPage } from "../services/scanner"
import { clearConfig } from "./storage"
import { clearWorkspaceHandle } from "./filesystem"

const SERVER_URL = "http://localhost:3721"

export async function scanCurrentPage(): Promise<{ screenshot: string }> {
  return scanPage()
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
