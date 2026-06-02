import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { readdir, readFile } from "node:fs/promises"
import { join, extname } from "node:path"

console.log("[read-directory] Module loaded with MAX_FILE_CHARS:", 3000, "MAX_TOTAL_FILES:", 15)

const READABLE_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".csv", ".yaml", ".yml",
  ".html", ".xml", ".log", ".typ", ".tex", ".typst",
  ".js", ".ts", ".jsx", ".tsx", ".py", ".rs", ".go",
])

const PRIORITY_NAMES = [
  "resume", "cv", "cover", "job", "posting", "career",
  "profile", "about", "skills", "experience", "portfolio",
]

const MAX_FILE_CHARS = 3000
const MAX_TOTAL_FILES = 15

export const readDirectoryTool = createTool({
  id: "read-directory",
  description:
    "Reads readable files from a given directory. Returns up to 15 files, each capped at 3000 characters. Prioritizes resume, CV, cover letter, and job posting files. Use this to understand the user's workspace.",
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
    console.log("[read-directory] Scanning:", dirPath)
    const allFiles: { name: string; path: string; content: string }[] = []

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
            const raw = await readFile(fullPath, "utf-8")
            const content = raw.slice(0, MAX_FILE_CHARS).trim()
            if (content.length > 0) {
              allFiles.push({ name: entry.name, path: fullPath, content })
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

    const priorityScore = (name: string): number => {
      const lower = name.toLowerCase()
      for (let i = 0; i < PRIORITY_NAMES.length; i++) {
        if (lower.includes(PRIORITY_NAMES[i]!)) return PRIORITY_NAMES.length - i
      }
      return 0
    }

    const sorted = allFiles.sort(
      (a, b) => priorityScore(b.name) - priorityScore(a.name)
    )

    const files = sorted.slice(0, MAX_TOTAL_FILES)

    const summary =
      files.length === 0
        ? `No readable files found in ${dirPath}`
        : `Read ${files.length} files${allFiles.length > MAX_TOTAL_FILES ? ` (of ${allFiles.length} total)` : ""} from ${dirPath}: ${files.map((f) => f.name).join(", ")}`

    console.log(`[read-directory] Found ${allFiles.length} files, returning ${files.length}: ${files.map((f) => f.name).join(", ") || "(none)"}`)

    return { files, summary }
  },
})
