import { Agent } from "@mastra/core/agent"

export const postingAnalysisAgent = new Agent({
  id: "posting-analysis",
  name: "Posting Analysis Agent",
  instructions: `
    Analyze the job posting text and return a structured summary. Include:
    - Job title and company
    - Required skills (as a list)
    - Preferred/nice-to-have skills
    - Key responsibilities
    - Experience level
    - Education requirements
    - Location type (remote/hybrid/on-site)
    - Salary range if mentioned
    - A 2-3 sentence summary of the role

    Format the output as clean, readable text. Be concise.
  `,
  model: "deepseek/deepseek-v4-flash",
  maxRetries: 1,
})
