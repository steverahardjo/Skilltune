import { watch } from "node:fs"
import { $, serve } from "bun"
import { rm, exists } from "node:fs/promises"
import { join } from "node:path"

const EXT_DIR = "extension"
const SRC_DIR = "src"
const PORT = 8734

const clients = new Set<{ ws: WebSocket }>()

serve({
  port: PORT,
  fetch(req, s) {
    if (s.upgrade(req)) return
    return new Response("Resume Adjuster dev server", { status: 200 })
  },
  websocket: {
    open(ws) {
      clients.add({ ws })
      console.log(`[dev] WS client connected (${clients.size} total)`)
    },
    close(ws) {
      for (const c of clients) {
        if (c.ws === ws) { clients.delete(c); break }
      }
      console.log(`[dev] WS client disconnected (${clients.size} total)`)
    },
    message() {},
  },
})

function broadcastReload() {
  if (clients.size === 0) {
    console.log("[dev] No extension connected — reload manually in chrome://extensions")
    return
  }
  for (const client of clients) {
    client.ws.send("reload")
  }
  console.log(`[dev] Reload signal sent to ${clients.size} client(s)`)
}

async function rebuild() {
  console.log("\n[dev] Rebuilding...")
  const start = performance.now()

  for (const sub of ["popup", "background", "content"]) {
    await rm(join(EXT_DIR, sub), { recursive: true, force: true })
  }

  try {
    await $`bun build ${SRC_DIR}/popup/index.html \
      --outdir=${EXT_DIR}/popup \
      --target=browser \
      --define 'DEV_MODE="true"'`

    await $`bun build ${SRC_DIR}/background/service-worker.ts \
      --outdir=${EXT_DIR}/background \
      --target=browser \
      --define 'DEV_MODE="true"'`

    await $`bun build ${SRC_DIR}/content/content-script.ts \
      --outdir=${EXT_DIR}/content \
      --target=browser`

    if (await exists(join(SRC_DIR, "options"))) {
      await $`bun build ${SRC_DIR}/options/index.html \
        --outdir=${EXT_DIR}/options \
        --target=browser \
        --define 'DEV_MODE="true"'`
    }

    const elapsed = (performance.now() - start).toFixed(0)
    console.log(`[dev] Build OK (${elapsed}ms)`)
    broadcastReload()
  } catch (e) {
    const elapsed = (performance.now() - start).toFixed(0)
    console.error(`[dev] Build FAILED (${elapsed}ms):`, e)
  }
}

// Initial build
await rebuild()

// Watch for changes
let debounce: Timer | undefined
watch(SRC_DIR, { recursive: true }, (_event, filename) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    console.log(`[dev] Change: ${filename}`)
    rebuild()
  }, 200)
})

console.log(`\n[dev] Watching src/ for changes...`)
console.log(`[dev] WebSocket reload server on ws://localhost:${PORT}`)
console.log(`[dev] Load extension/ in chrome://extensions`)
