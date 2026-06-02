export interface UserConfig {
  name: string
  targetRoles: string
  industry: string
  resumeFile: string
  apiKey: string
}

export interface JobScanResult {
  title: string
  company: string
  skills: string[]
  requirements: string[]
  rawText: string
}

export interface Recommendation {
  matchScore: number
  missingSkills: string[]
  keywordSuggestions: string[]
  summary: string
}

export interface WriteResumeResponse {
  typ: string | null
  typPath: string
  pdfPath: string | null
  steps: number
  message: string
}

export type WorkflowStep = "idle" | "scanning" | "analyzing" | "done" | "error"
export type AppView = "onboarding" | "dashboard" | "loading"
