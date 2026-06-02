import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { writeFile, mkdir } from "node:fs/promises"
import { join, dirname } from "node:path"

export const writeTypstFileTool = createTool({
  id: "write-typst-file",
  description:
    "Writes Typst source content to a .typ file on disk. Use this to save a generated resume template. The file is written to the user's workspace directory.",
  inputSchema: z.object({
    path: z.string().describe("Absolute path to the workspace directory"),
    filename: z
      .string()
      .describe("Filename ending in .typ, e.g. 'resume_tailored.typ'"),
    content: z.string().describe("Full Typst source code for the resume"),
  }),
  outputSchema: z.object({
    filePath: z.string(),
    bytes: z.number(),
  }),
  execute: async ({ path: dirPath, filename, content }) => {
    const filePath = join(dirPath, filename)
    await mkdir(dirname(filePath), { recursive: true })
    const encoded = new TextEncoder().encode(content)
    await writeFile(filePath, encoded)
    return { filePath, bytes: encoded.length }
  },
})
