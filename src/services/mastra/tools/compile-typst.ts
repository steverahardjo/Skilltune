import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { join } from "node:path"
import { $ } from "bun"

export const compileTypstTool = createTool({
  id: "compile-typst",
  description:
    "Compiles a .typ Typst source file into a PDF. Requires the 'typst' CLI to be installed on the system. Use this after writing a .typ file to produce the final resume PDF.",
  inputSchema: z.object({
    typPath: z.string().describe("Absolute path to the .typ source file"),
    workspaceDir: z
      .string()
      .describe("Workspace directory (used as the output base)"),
  }),
  outputSchema: z.object({
    pdfPath: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ typPath, workspaceDir }) => {
    const pdfPath = typPath.replace(/\.typ$/, ".pdf")

    try {
      const result =
        await $`typst compile ${typPath} ${pdfPath} --root ${workspaceDir}`
      if (result.exitCode === 0) {
        return { pdfPath, success: true }
      }
      return {
        pdfPath,
        success: false,
        error: result.stderr.toString() || "Unknown compilation error",
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "typst CLI not found"
      return {
        pdfPath,
        success: false,
        error: message.includes("command not found")
          ? "typst CLI is not installed. Install it from https://github.com/typst/typst"
          : message,
      }
    }
  },
})
