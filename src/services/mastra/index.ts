import { Mastra } from "@mastra/core"
import { profilingAgent } from "./agents/profiling-agent"

export const mastra = new Mastra({
  agents: { profilingAgent },
})
