import { Agent } from "@mastra/core/agent"
import { readDirectoryTool } from "../tools/read-directory"
import { writeTypstFileTool } from "../tools/write-typst-file"
import { compileTypstTool } from "../tools/compile-typst"
import { memory } from "../memory"

export const resumeWriterAgent = new Agent({
  id: "resume-writer",
  name: "Resume Writer",
  instructions: `
    Generate a tailored Typst resume from the user profile and job posting
    stored in your working memory. Do NOT ask for information — it's already there.

    1. Read working memory for user profile + jobPosting.
    2. Optionally read workspace templates with readDirectoryTool.
    3. Write the resume as "resume_tailored.typ" using writeTypstFileTool.
    4. Compile to PDF with compileTypstTool.
    5. Return the PDF path and a summary of what you customized.

    Use clean Typst formatting: #set page, #set text, #heading, #grid, 1-2 pages.
    Emphasize skills matching the job posting. ATS-friendly, no graphics.
  `,
  model: "deepseek/deepseek-v4-flash",
  tools: { readDirectoryTool, writeTypstFileTool, compileTypstTool },
  memory,
  maxRetries: 1,
})
