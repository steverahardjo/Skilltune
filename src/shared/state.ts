export let USER_PROFILE: string | null = null

export function setUserProfile(profile: string): void {
  USER_PROFILE = profile
}

export function clearUserProfile(): void {
  USER_PROFILE = null
}
