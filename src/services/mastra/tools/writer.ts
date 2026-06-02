import { createTool } from "@mastra/core/tools"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod/v4"

const OUT_DIR = join(process.cwd(), ".mastra", "output")

export const writerTool = createTool({
  id: "writer",
  description:
    "Writes the Typst resume source code to a local .typ file. Use this to persist the tailored resume before compiling it.",
  inputSchema: z.object({
    filename: z
      .string()
      .describe("Filename for the output (e.g. 'resume_tailored.typ')"),
    content: z.string().describe("The complete Typst source code to write"),
  }),
  outputSchema: z.object({
    path: z.string().describe("Absolute path to the written file"),
    bytes: z.number().describe("File size in bytes"),
  }),
  execute: async ({ filename, content }) => {
    await mkdir(OUT_DIR, { recursive: true })
    const filePath = join(OUT_DIR, filename)
    await Bun.write(filePath, content)
    const stat = Bun.file(filePath)
    const bytes = await stat.size
    return { path: filePath, bytes }
  },
})
