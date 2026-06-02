import { Agent } from "@mastra/core/agent"
import { memory } from "../memory"

export const profilingAgent = new Agent({
  id: "profiling-agent",
  name: "Profiling Agent",
  instructions: `
    You profile users from their workspace files. Extract and store in working memory:
    - fullName, targetRoles, industry
    - technicalSkills[], softSkills[]
    - yearsOfExperience, education
    - achievements[], summary

    Always call updateWorkingMemory after extraction.
    Skip missing fields rather than guessing.
  `,
  model: "deepseek/deepseek-v4-flash",
  memory,
  maxRetries: 1,
})
