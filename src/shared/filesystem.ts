const DB_NAME = "resume-adjuster"
const DB_VERSION = 1
const HANDLE_STORE = "directory-handles"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(HANDLE_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function pickWorkspaceFolder(): Promise<string | null> {
  if ("showDirectoryPicker" in window) {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: "read" })
      const db = await openDB()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, "readwrite")
        tx.objectStore(HANDLE_STORE).put(handle, "workspace")
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
      return handle.name
    } catch (err) {
      const e = err as DOMException
      if (e.name === "AbortError") return null
      throw err
    }
  }

  return fallbackFileInput()
}

function fallbackFileInput(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.webkitdirectory = true
    input.style.display = "none"
    document.body.appendChild(input)

    input.onchange = async () => {
      const files = input.files
      input.remove()
      if (files && files.length > 0) {
        const path = files[0]!.webkitRelativePath
        const root = path.split("/")[0] ?? path
        resolve(root)
      } else {
        resolve(null)
      }
    }

    input.oncancel = () => {
      input.remove()
      resolve(null)
    }

    input.click()
  })
}

export async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readonly")
    const req = tx.objectStore(HANDLE_STORE).get("workspace")
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export async function getWorkspaceHandle(): Promise<FileSystemDirectoryHandle | null> {
  return getStoredHandle()
}

export async function clearWorkspaceHandle(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite")
    tx.objectStore(HANDLE_STORE).delete("workspace")
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

const READABLE_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".csv", ".yaml", ".yml",
  ".html", ".xml", ".log", ".typ", ".tex", ".typst",
])

const MAX_FILE_CHARS = 1500
const MAX_TOTAL_FILES = 10
const PRIORITY_NAMES = [
  "resume", "cv", "cover", "job", "posting", "career",
  "profile", "about", "skills", "experience", "portfolio",
]

export async function readWorkspaceFiles(): Promise<
  { name: string; content: string }[]
> {
  console.log("[fs] ▶ readWorkspaceFiles — getting stored handle")
  const handle = await getWorkspaceHandle()
  if (!handle) {
    console.error("[fs] ✗ No workspace handle stored")
    throw new Error(
      "No workspace folder selected.\n→ Run onboarding again to pick a workspace folder."
    )
  }
  console.log(`[fs] Reading from workspace: "${handle.name}"`)

  try {
    const perms = handle as any
    const current = typeof perms.queryPermission === "function"
      ? (await perms.queryPermission({ mode: "read" }))
      : "granted"

    if (current !== "granted") {
      console.log(`[fs] Permission is "${current}", requesting...`)
      if (typeof perms.requestPermission !== "function") {
        throw new Error(
          "Browser does not support File System Access permission API.\n→ Try Chrome 86+ or re-pick the folder in onboarding."
        )
      }
      const requested = await perms.requestPermission({ mode: "read" })
      if (requested !== "granted") {
        throw new Error(
          `Workspace permission denied (${requested}).\n→ Click 'Profile me' and allow access to the folder.`
        )
      }
      console.log("[fs] Permission granted after request")
    }
  } catch (e) {
    if (e instanceof Error) throw e
    throw new Error(`File System Access error\n→ ${String(e)}`)
  }

  console.log("[fs] Walking directory...")

  const allFiles: { name: string; content: string }[] = []

  async function walk(dir: FileSystemDirectoryHandle) {
    for await (const [name, entry] of dir.entries()) {
      if (entry.kind === "directory" && !name.startsWith(".")) {
        await walk(entry as FileSystemDirectoryHandle)
      } else if (entry.kind === "file" && !name.startsWith(".")) {
        const ext = name.toLowerCase().slice(name.lastIndexOf("."))
        if (READABLE_EXTENSIONS.has(ext)) {
          try {
            const file = await (entry as FileSystemFileHandle).getFile()
            const text = (await file.text()).slice(0, MAX_FILE_CHARS).trim()
            if (text.length > 0) {
              allFiles.push({ name, content: text })
            }
          } catch {
            // skip unreadable
          }
        }
      }
    }
  }

  await walk(handle)

  const priorityScore = (name: string): number => {
    const lower = name.toLowerCase()
    for (let i = 0; i < PRIORITY_NAMES.length; i++) {
      if (lower.includes(PRIORITY_NAMES[i]!)) return PRIORITY_NAMES.length - i
    }
    return 0
  }

  const sorted = allFiles.sort(
    (a, b) => priorityScore(b.name) - priorityScore(a.name)
  )

  const result = sorted.slice(0, MAX_TOTAL_FILES)
  console.log(`[fs] ◀ Found ${allFiles.length} files, returning ${result.length}: ${result.map(f => f.name).join(", ") || "(none)"}`)
  return result
}
