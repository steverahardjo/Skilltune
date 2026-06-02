import { Agent } from "@mastra/core/agent"
import { memory } from "../memory"

export const postingAnalysisAgent = new Agent({
  id: "posting-analysis",
  name: "Posting Analysis Agent",
  instructions: `
    Analyze job posting text. Extract into working memory under jobPosting:
    - title, company, experienceLevel, locationType, salaryRange, educationRequirement
    - requiredSkills[], preferredSkills[], keyRequirements[], responsibilities[], niceToHave[]
    - summary (2-3 sentences)

    Always call updateWorkingMemory. Skip missing fields.
  `,
  model: "deepseek/deepseek-v4-flash",
  memory,
  maxRetries: 1,
})
