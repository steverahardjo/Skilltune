export interface UserConfig {
  name: string
  targetRoles: string
  industry: string
  resumeFile: string
}

export interface WriteResumeResponse {
  typ: string | null
  typPath: string
  pdfPath: string | null
  message: string
}

export type AppView = "onboarding" | "dashboard" | "loading"
