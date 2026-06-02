declare var DEV_MODE: boolean

chrome.runtime.onInstalled.addListener(() => {
  console.log("Resume Adjuster installed")
})

if (DEV_MODE) {
  const PORT = 8734
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  function connect() {
    try {
      ws = new WebSocket(`ws://localhost:${PORT}`)
      ws.onopen = () => {
        console.log("[dev] Connected to dev server")
        clearTimeout(reconnectTimer)
      }
      ws.onmessage = (e) => {
        if (e.data === "reload") {
          console.log("[dev] Reload signal received")
          chrome.runtime.reload()
        }
      }
      ws.onclose = () => {
        console.log("[dev] Disconnected, reconnecting in 2s...")
        reconnectTimer = setTimeout(connect, 2000)
      }
      ws.onerror = () => {
        ws?.close()
      }
    } catch {
      reconnectTimer = setTimeout(connect, 2000)
    }
  }

  connect()
}
