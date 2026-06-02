import { Mastra } from "@mastra/core"
import { resumeWriterAgent } from "./agents/resume-writer"
import { postingAnalysisAgent } from "./agents/posting-analysis-agent"
import { writerTool } from "./tools/writer"
import { typstCompileTool } from "./tools/typst-compile"

export const mastra = new Mastra({
  agents: { resumeWriterAgent, postingAnalysisAgent },
  tools: { writer: writerTool, typst_compile: typstCompileTool },
})
