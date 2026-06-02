const DB_NAME = "resume-adjuster"
const DB_VERSION = 1
const HANDLE_STORE = "resume-handle"
const HANDLE_KEY = "resume"

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

const SUPPORTED_EXTS = new Set([".pdf", ".typ", ".tex", ".docx"])

function hasSupportedExt(name: string): boolean {
  return SUPPORTED_EXTS.has(name.toLowerCase().slice(name.lastIndexOf(".")))
}

export async function pickResumeFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".pdf,.typ,.tex,.docx"
    input.style.display = "none"
    document.body.appendChild(input)

    input.onchange = async () => {
      const file = input.files?.[0]
      input.remove()
      if (!file || !hasSupportedExt(file.name)) {
        resolve(null)
        return
      }
      try {
        const db = await openDB()
        await new Promise<void>((resolveStore, rejectStore) => {
          const tx = db.transaction(HANDLE_STORE, "readwrite")
          tx.objectStore(HANDLE_STORE).put(file, HANDLE_KEY)
          tx.oncomplete = () => resolveStore()
          tx.onerror = () => rejectStore(tx.error)
        })
        db.close()
      } catch {
        resolve(null)
        return
      }
      resolve(file.name)
    }

    input.oncancel = () => {
      input.remove()
      resolve(null)
    }

    input.click()
  })
}

async function getStoredFile(): Promise<File | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readonly")
    const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export async function readResumeFile(): Promise<{ name: string; content: string }> {
  console.log("[fs] ▶ readResumeFile — getting stored file")
  const file = await getStoredFile()
  if (!file) {
    throw new Error(
      "No resume file found.\n→ Run onboarding again to pick a resume file."
    )
  }
  console.log(`[fs] Resume: "${file.name}" (${file.size} bytes)`)

  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))

  if (ext === ".pdf" || ext === ".docx") {
    console.log(`[fs] Binary format (${ext}) — sending file name only. Full parsing not implemented yet.`)
    return {
      name: file.name,
      content: `[Binary file: ${file.name} (${ext.toUpperCase()}, ${file.size} bytes). Full text extraction not available yet. Please provide a .typ, .tex, or .txt version for best results.]`,
    }
  }

  const text = await file.text()
  const content = text.slice(0, 3000).trim()
  console.log(`[fs] ◀ Read ${content.length} chars from "${file.name}"`)
  return { name: file.name, content }
}

export async function clearStoredFile(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite")
    tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}
