export async function captureScreenshot(): Promise<string> {
  const dataUrl = await chrome.tabs.captureVisibleTab(
    undefined as any,
    { format: "png" } as chrome.tabs.CaptureVisibleTabOptions
  )
  return dataUrl
}

export async function saveCapture(
  dataUrl: string,
  filename: string
): Promise<boolean> {
  if (!chrome?.downloads?.download) return false
  try {
    const parts = dataUrl.split(",")
    const mime = parts[0]!.match(/:(.*?);/)![1]!
    const byteChars = atob(parts[1]!)
    const bytes = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      bytes[i] = byteChars.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: mime })
    const url = URL.createObjectURL(blob)
    await chrome.downloads.download({ url, filename, saveAs: false })
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

export async function scanPage(): Promise<{ screenshot: string }> {
  const screenshot = await captureScreenshot()

  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const filename = `resume_adjuster/${date}_job_posting.png`

  saveCapture(screenshot, filename).catch(() => {})

  return { screenshot }
}
