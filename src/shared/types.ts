export interface ResumeConfig {
  resumePath: string
  typstTemplate: string
  llmApiKey: string
  llmEndpoint: string
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

export type WorkflowStep = "idle" | "scanning" | "analyzing" | "done" | "error"
