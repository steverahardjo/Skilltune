import type { UserConfig } from "./types"

const CONFIG_KEY = "userConfig"

export async function loadConfig(): Promise<UserConfig | null> {
  const result = await chrome.storage.local.get(CONFIG_KEY)
  return result[CONFIG_KEY] ?? null
}

export async function saveConfig(config: UserConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config })
}

export async function clearConfig(): Promise<void> {
  await chrome.storage.local.remove(CONFIG_KEY)
}

export async function hasConfig(): Promise<boolean> {
  const config = await loadConfig()
  return config !== null && config.name.length > 0 && config.workspaceFolder.length > 0
}
