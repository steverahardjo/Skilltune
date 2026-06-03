export interface UserConfig {
  name: string
  targetRoles: string
  industry: string
  resumeFile: string
}

export interface WriteResumeResponse {
  success: boolean
  sourcePath: string
  pdfPath: string | null
  message: string
}

export interface JobScoreResponse {
  score: number
  similarityPct: number
  keyMatches: string[]
  keyMissing: string[]
  strengths: string[]
  gaps: string[]
  suggestions: string[]
  summary: string
}

export type AppView = "onboarding" | "dashboard" | "loading"
