import { readFile } from "node:fs/promises"
import { mastra } from "../src/services/mastra"

async function main() {
  const resumePath = process.argv[2]
  const jobPostingPath = process.argv[3]
  const apiKey = process.argv[4] || process.env.DEEPSEEK_API_KEY

  if (!resumePath || !jobPostingPath) {
    console.error(
      "Usage: bun scripts/test-profile.ts <resume-file> <job-posting-file> [deepseek-api-key]"
    )
    console.error("  e.g. bun scripts/test-profile.ts ~/resume.typ ~/posting.txt sk-xxx")
    process.exit(1)
  }
  if (!apiKey) {
    console.error(
      "Error: DEEPSEEK_API_KEY not set. Pass it as fourth arg or set env var."
    )
    process.exit(1)
  }

  process.env.DEEPSEEK_API_KEY = apiKey

  const resumeContent = await readFile(resumePath, "utf-8")
  const jobPosting = await readFile(jobPostingPath, "utf-8")

  console.log(`Resume: ${resumeContent.length} chars`)
  console.log(`Job posting: ${jobPosting.length} chars`)

  console.log("\n=== Step 1: Analyze posting ===")
  const analysisAgent = mastra.getAgentById("posting-analysis")
  const analysisResult = await analysisAgent.generate(
    `Analyze this job posting:\n\n${jobPosting}`
  )
  console.log(analysisResult.text)

  console.log("\n=== Step 2: Write tailored resume ===")
  const writerAgent = mastra.getAgentById("resume-writer")
  const writeResult = await writerAgent.generate(
    `Write a tailored Typst resume.

CURRENT RESUME:
--- resume.typ ---
${resumeContent.slice(0, 3000)}
--- End of resume ---

JOB POSTING ANALYSIS:
${analysisResult.text}

Generate the tailored Typst source code.`
  )
  console.log(writeResult.text)

  console.log("\nDone.")
}

main().catch((e) => {
  console.error("Fatal:", e.message ?? e)
  process.exit(1)
})
