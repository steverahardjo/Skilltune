import type { UserConfig } from "./types"

const CONFIG_KEY = "userConfig"

const DEFAULTS: UserConfig = {
  name: "",
  targetRoles: "",
  industry: "",
  resumeFile: "",
}

export async function loadConfig(): Promise<UserConfig | null> {
  const result = await chrome.storage.local.get(CONFIG_KEY)
  const raw = result[CONFIG_KEY]
  if (!raw) return null
  return { ...DEFAULTS, ...raw }
}

export async function saveConfig(config: UserConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config })
}

export async function clearConfig(): Promise<void> {
  await chrome.storage.local.remove(CONFIG_KEY)
}

export async function hasConfig(): Promise<boolean> {
  const config = await loadConfig()
  return (
    config !== null &&
    (config.name?.length ?? 0) > 0 &&
    (config.resumeFile?.length ?? 0) > 0
  )
}
