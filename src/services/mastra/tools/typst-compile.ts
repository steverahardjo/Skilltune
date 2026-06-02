import { createTool } from "@mastra/core/tools"
import { join } from "node:path"
import { z } from "zod/v4"

const OUT_DIR = join(process.cwd(), ".mastra", "output")

export const typstCompileTool = createTool({
  id: "typst_compile",
  description:
    "Compiles a .typ file to PDF using the Typst CLI. The typst binary must be installed on the system. Use this after writing the resume to verify it compiles cleanly.",
  inputSchema: z.object({
    filePath: z.string().describe("Absolute path to the .typ file to compile"),
  }),
  outputSchema: z.object({
    pdfPath: z.string().describe("Absolute path to the compiled PDF"),
    success: z.boolean().describe("Whether compilation succeeded"),
    stderr: z.string().optional().describe("Compilation errors if any"),
  }),
  execute: async ({ filePath }) => {
    const pdfPath = filePath.replace(/\.typ$/, ".pdf")
    try {
      const result = await Bun.$`typst compile ${filePath} ${pdfPath}`.quiet()
      return { pdfPath, success: result.exitCode === 0 }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { pdfPath, success: false, stderr: msg }
    }
  },
})
