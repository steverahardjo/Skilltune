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
