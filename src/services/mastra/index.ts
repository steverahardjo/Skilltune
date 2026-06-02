import { Mastra } from "@mastra/core"
import { profilingAgent } from "./agents/profiling-agent"
import { resumeWriterAgent } from "./agents/resume-writer"
import { postingAnalysisAgent } from "./agents/posting-analysis-agent"

export const mastra = new Mastra({
  agents: { profilingAgent, resumeWriterAgent, postingAnalysisAgent },
})
