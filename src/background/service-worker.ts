declare var DEV_MODE: boolean

const SERVER_URL = "http://localhost:3721"

chrome.runtime.onInstalled.addListener(() => {
  console.log("Resume Adjuster installed")
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "API_CALL") {
    const { endpoint, body } = message as {
      endpoint: string
      body: Record<string, string>
    }
    const url = `${SERVER_URL}${endpoint}`
    console.log(`[sw] ▶ POST ${url}`)

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json()
        console.log(`[sw] ◀ ${endpoint} → HTTP ${res.status} ok=${res.ok}`)
        if (!res.ok) console.log(`[sw] ◀ error body:`, JSON.stringify(data).slice(0, 200))
        sendResponse({ ok: res.ok, status: res.status, data })
      })
      .catch((e) => {
        console.error(`[sw] ✗ ${endpoint} → ${e.message}`)
        sendResponse({
          ok: false,
          status: 0,
          data: {
            error: `Cannot reach server at ${SERVER_URL}\n→ ${e.message}\n→ Is "python3 server/app.py" running?`,
          },
        })
      })
    return true
  }

  return false
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
