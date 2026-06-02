import { Mastra } from "@mastra/core"
import { resumeWriterAgent } from "./agents/resume-writer"
import { postingAnalysisAgent } from "./agents/posting-analysis-agent"

export const mastra = new Mastra({
  agents: { resumeWriterAgent, postingAnalysisAgent },
})
