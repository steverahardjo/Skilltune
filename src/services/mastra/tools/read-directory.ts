import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { readdir, readFile } from "node:fs/promises"
import { join, extname } from "node:path"

const READABLE_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".csv", ".yaml", ".yml",
  ".html", ".xml", ".log", ".typ", ".tex", ".typst",
  ".js", ".ts", ".jsx", ".tsx", ".py", ".rs", ".go",
])

export const readDirectoryTool = createTool({
  id: "read-directory",
  description:
    "Reads all readable files from a given directory path. Returns the file tree and contents. Use this to understand what documents exist in the user's workspace — resumes, cover letters, job postings, notes, etc.",
  inputSchema: z.object({
    path: z.string().describe("Absolute path to the directory to read"),
  }),
  outputSchema: z.object({
    files: z.array(
      z.object({
        name: z.string(),
        path: z.string(),
        content: z.string(),
      })
    ),
    summary: z.string(),
  }),
  execute: async ({ path: dirPath }) => {
    const files: { name: string; path: string; content: string }[] = []

    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          await walk(fullPath)
        } else if (
          entry.isFile() &&
          READABLE_EXTENSIONS.has(extname(entry.name).toLowerCase())
        ) {
          try {
            const content = await readFile(fullPath, "utf-8")
            if (content.trim().length > 0) {
              files.push({ name: entry.name, path: fullPath, content })
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    }

    try {
      await walk(dirPath)
    } catch {
      return {
        files: [],
        summary: `Could not read directory: ${dirPath}`,
      }
    }

    const summary =
      files.length === 0
        ? `No readable files found in ${dirPath}`
        : `Read ${files.length} files from ${dirPath}: ${files.map((f) => f.name).join(", ")}`

    return { files, summary }
  },
})
