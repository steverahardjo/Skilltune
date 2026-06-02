import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { mastra } from "../src/services/mastra"
import { buildSkillPrompt, saveSkill, getSkillContent } from "../src/services/skills"

async function main() {
  const resumePath = process.argv[2]
  const jobPostingPath = process.argv[3]
  const name = process.argv[4] || "Test User"
  const targetRoles = process.argv[5] || "Software Engineer"
  const industry = process.argv[6] || "Technology"
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!resumePath || !jobPostingPath) {
    console.error(
      "Usage: bun scripts/test-profile.ts <resume-file> <job-posting-file> [name] [target-roles] [industry]"
    )
    console.error(
      "  DEEPSEEK_API_KEY env var required"
    )
    process.exit(1)
  }
  if (!apiKey) {
    console.error(
      "Error: DEEPSEEK_API_KEY not set."
    )
    process.exit(1)
  }

  process.env.DEEPSEEK_API_KEY = apiKey

  const resumeContent = await readFile(resumePath, "utf-8")
  const jobPosting = await readFile(jobPostingPath, "utf-8")

  console.log(`Resume: ${resumeContent.length} chars`)
  console.log(`Job posting: ${jobPosting.length} chars`)
  console.log(`Name: ${name}, Roles: ${targetRoles}, Industry: ${industry}`)

  console.log("\n=== Step 1: Create resume SKILL ===")
  const skillPrompt = buildSkillPrompt(resumeContent, {
    name,
    targetRoles,
    industry,
  })
  const analysisAgent = mastra.getAgentById("posting-analysis")
  const skillResult = await analysisAgent.generate(skillPrompt)
  await saveSkill(skillResult.text)
  const skillContent = await getSkillContent()
  console.log(`Skill created (${skillContent?.length ?? 0} chars)`)
  console.log(skillResult.text.slice(0, 500), "...")

  console.log("\n=== Step 2: Analyze posting ===")
  const analysisResult = await analysisAgent.generate(
    `Analyze this job posting:\n\n${jobPosting}`
  )
  console.log(analysisResult.text)

  console.log("\n=== Step 3: Write tailored resume ===")
  const writerAgent = mastra.getAgentById("resume-writer")
  const writePrompt = `Write a tailored Typst resume using the RESUME SKILL and JOB ANALYSIS below. Use your tools to write the .typ file and compile it.

RESUME SKILL (the person's professional profile — source of truth):
--- skill ---
${skillContent}
--- end skill ---

JOB POSTING ANALYSIS:
${analysisResult.text}

Follow the workflow:
1. Study the RESUME SKILL and JOB ANALYSIS
2. Write a tailored Typst resume matching the job
3. Use the writer tool to save it as "tailored_resume.typ"
4. Use the typst_compile tool to compile it to PDF
5. Confirm the file paths`

  const writeResult = await writerAgent.generate(writePrompt)

  console.log("\nAgent response:")
  console.log(writeResult.text)

  if (writeResult.toolResults && writeResult.toolResults.length > 0) {
    console.log("\nTool results:")
    for (const tr of writeResult.toolResults) {
      console.log(`  - ${tr.toolName}:`, tr.result)
    }
  }

  const outputDir = join(process.cwd(), ".mastra", "output")
  console.log(`\nOutput written to: ${outputDir}`)
  console.log("Done.")
}

main().catch((e) => {
  console.error("Fatal:", e.message ?? e)
  process.exit(1)
})
