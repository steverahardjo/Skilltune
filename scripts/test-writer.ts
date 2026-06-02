import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { mastra } from "../src/services/mastra"
import { buildSkillPrompt, saveSkill, getSkillContent } from "../src/services/skills"

const SAMPLE_RESUME = `
John Doe
john@example.com | (555) 123-4567 | github.com/johndoe

PROFESSIONAL SUMMARY
Senior Software Engineer with 8+ years building scalable web apps and distributed systems.
Expertise in TypeScript, React, Node.js, and AWS/GCP cloud infrastructure.
Led teams of 4-8 engineers delivering products used by millions.

SKILLS
TypeScript, JavaScript, Python, Go, Rust, SQL, React, Next.js, Vue, Tailwind, GraphQL,
Node.js, Express, Fastify, Bun, PostgreSQL, MongoDB, Redis, Kafka, AWS Lambda/ECS/S3/RDS,
GCP Cloud Run, Docker, Kubernetes, Terraform, GitHub Actions, Datadog, TDD, CI/CD

EXPERIENCE
Staff Software Engineer — Acme Corp (2022–Present)
- Architected real-time analytics pipeline processing 500K events/sec with Kafka + ClickHouse
- Led migration of 12 microservices to ECS Fargate, cutting infra costs by 40%
- Mentored 6 engineers; introduced RFC process and architecture decision records

Senior Software Engineer — TechStart Inc. (2019–2022)
- Built customer-facing dashboard with React/Next.js serving 50K DAU
- Designed GraphQL federation layer across 8 backend services
- Established CI/CD pipelines reducing deploy time from 2h to 15min

Software Engineer — DataFlow Systems (2016–2019)
- Developed ETL pipelines processing financial data from 20+ sources
- Built internal CLI tools in Python and Go; contributed PRs to Prisma and Zod

EDUCATION
B.S. Computer Science — UC Berkeley (2012–2016), GPA 3.7

PROJECTS
- Maintainer of "typed-routes" (2K stars) — type-safe routing library
- CLI tool for automated API documentation generation (500+ weekly npm downloads)

CERTIFICATIONS
AWS Solutions Architect Professional, CKAD
`

const SAMPLE_JOB = `
Senior Software Engineer — Platform Team | CloudScale | Remote (US/Canada)

CloudScale is a Series C startup building next-gen cloud infrastructure management.
500+ enterprise customers.

What You'll Do:
- Design distributed systems handling millions of concurrent operations
- Build APIs/SDKs in TypeScript/Go consumed by 500+ enterprise teams
- Drive architecture decisions for event-driven microservices platform
- Improve observability: distributed tracing, structured logging, SLO-based alerting
- Mentor junior engineers; lead technical design reviews
- Contribute to open-source CLI and Terraform provider

Requirements:
- 5+ years software engineering experience
- Strong TypeScript and Go (or Rust)
- Distributed systems at scale
- Deep AWS, GCP, or Azure knowledge
- Kubernetes, ECS, or similar container orchestration
- Kafka, NATS, or similar event-driven architectures
- Excellent written communication (remote-first, async culture)

Nice to Have:
- Terraform, Pulumi, or CDK experience
- Open-source contributions
- Developer tools / CLI / SDK experience
- OpenTelemetry, Datadog, or Honeycomb knowledge
- Multi-cloud architectures

Tech Stack: TypeScript, Go, Rust, React, Kafka, PostgreSQL, Redis, Kubernetes, Terraform,
AWS/GCP/Azure, OpenTelemetry, GitHub Actions

Compensation: $180K–$230K + equity + benefits
`

function ms(n: number) {
  return n < 1000 ? `${n.toFixed(0)}ms` : n < 60000 ? `${(n / 1000).toFixed(1)}s` : `${(n / 60000).toFixed(1)}m`
}

function tok(n: number) {
  return n < 1000 ? String(n) : `${(n / 1000).toFixed(1)}K`
}

async function main() {
  const resumePath = process.argv[2]
  const jobPath = process.argv[3]
  const name = process.argv[4] || "John Doe"
  const targetRoles = process.argv[5] || "Senior Software Engineer"
  const industry = process.argv[6] || "Cloud Infrastructure"
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    console.error("DEEPSEEK_API_KEY not set. Export it or put it in .env.")
    process.exit(1)
  }
  process.env.DEEPSEEK_API_KEY = apiKey

  const resume = resumePath ? await readFile(resumePath, "utf-8") : SAMPLE_RESUME
  const job = jobPath ? await readFile(jobPath, "utf-8") : SAMPLE_JOB

  console.log(`Resume: ${resume.length} chars  |  Job posting: ${job.length} chars`)
  console.log(`Name: ${name}  |  Target: ${targetRoles}  |  Industry: ${industry}\n`)

  const T0 = performance.now()

  // ── Phase 1: Create SKILL ──
  console.log("── Phase 1: Create resume SKILL ──")
  const t1 = performance.now()
  const analysisAgent = mastra.getAgentById("posting-analysis")
  const skillResult = await analysisAgent.generate(
    buildSkillPrompt(resume, { name, targetRoles, industry })
  )
  await saveSkill(skillResult.text)
  const skillContent = (await getSkillContent())!
  const skillUsage = skillResult.usage as Record<string, number> | undefined
  console.log(
    `  ${ms(performance.now() - t1)}  |  ` +
    `${skillResult.steps?.length ?? 1} steps  |  ` +
    `in:${tok(skillUsage?.inputTokens ?? 0)} out:${tok(skillUsage?.outputTokens ?? 0)}  |  ` +
    `${skillContent.length} chars`
  )

  // ── Phase 2: Analyze posting ──
  console.log("── Phase 2: Analyze job posting ──")
  const t2 = performance.now()
  const analysisResult = await analysisAgent.generate(
    `Analyze this job posting:\n\n${job}`
  )
  const analysisUsage = analysisResult.usage as Record<string, number> | undefined
  console.log(
    `  ${ms(performance.now() - t2)}  |  ` +
    `${analysisResult.steps?.length ?? 1} steps  |  ` +
    `in:${tok(analysisUsage?.inputTokens ?? 0)} out:${tok(analysisUsage?.outputTokens ?? 0)}  |  ` +
    `${analysisResult.text.length} chars`
  )
  console.log(`  Preview: ${analysisResult.text.split("\n").slice(0, 3).join(" | ")}`)

  // ── Phase 3: Write resume ──
  console.log("── Phase 3: Write tailored resume ──")
  const t3 = performance.now()
  const writerAgent = mastra.getAgentById("resume-writer")
  const writeResult = await writerAgent.generate(
    `Write a tailored Typst resume using the RESUME SKILL and JOB ANALYSIS below. Use your tools to write the .typ file and compile it.

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
  )
  const writeUsage = writeResult.usage as Record<string, number> | undefined
  const steps = writeResult.steps
  console.log(
    `  ${ms(performance.now() - t3)}  |  ` +
    `${steps?.length ?? 1} steps  |  ` +
    `in:${tok(writeUsage?.inputTokens ?? 0)} out:${tok(writeUsage?.outputTokens ?? 0)}  |  ` +
    `${writeResult.text.length} chars`
  )

  if (steps) {
    for (const step of steps) {
      const s = step as Record<string, unknown>
      const results = s.toolResults as Array<Record<string, unknown>> | undefined
      if (results) {
        for (const tr of results) {
          const toolName = (tr.toolName || tr.toolCallName || "?") as string
          const out = JSON.stringify(tr.result ?? tr.output).slice(0, 120)
          console.log(`    [${toolName}] ${out}`)
        }
      }
    }
  }
  console.log(`  Final response: ${writeResult.text.slice(0, 200)}...`)

  // ── Phase 4: Inspect output ──
  console.log("── Phase 4: Output files ──")
  const outDir = join(process.cwd(), ".mastra", "output")
  let typBytes = 0
  let pdfBytes = 0
  let typLines = 0
  try {
    const typ = await Bun.file(join(outDir, "tailored_resume.typ")).text()
    typBytes = Buffer.byteLength(typ)
    typLines = typ.split("\n").length
  } catch {}
  try {
    pdfBytes = await Bun.file(join(outDir, "tailored_resume.pdf")).size
  } catch {}
  console.log(`  tailored_resume.typ: ${typBytes} bytes, ${typLines} lines`)
  console.log(`  tailored_resume.pdf: ${pdfBytes ? `${pdfBytes} bytes` : "not compiled"}`)

  // ── Summary ──
  const totalMs = performance.now() - T0
  const grandIn = (skillUsage?.inputTokens ?? 0) + (analysisUsage?.inputTokens ?? 0) + (writeUsage?.inputTokens ?? 0)
  const grandOut = (skillUsage?.outputTokens ?? 0) + (analysisUsage?.outputTokens ?? 0) + (writeUsage?.outputTokens ?? 0)
  const grandTotal = grandIn + grandOut

  console.log("\n═══════════════════════════════════════════")
  console.log("           PERFORMANCE SUMMARY")
  console.log("═══════════════════════════════════════════")
  console.log(`  Total time:      ${ms(totalMs)}`)
  console.log(`  Total tokens:    ${tok(grandTotal)} (in: ${tok(grandIn)} / out: ${tok(grandOut)})`)
  console.log(`  Throughput:      ~${(grandTotal / (totalMs / 1000)).toFixed(0)} tokens/sec`)
  console.log(`  Est. cost (DS):  $${((grandIn * 0.14 + grandOut * 0.28) / 1_000_000).toFixed(4)}`)
  console.log(`  .typ size:       ${typBytes} bytes (${typLines} lines)`)
  console.log(`  .pdf:            ${pdfBytes ? "compiled" : "not compiled"}`)
  console.log(`  Output dir:      ${outDir}`)
}

main().catch((e) => {
  console.error("Fatal:", e.message ?? e)
  process.exit(1)
})
