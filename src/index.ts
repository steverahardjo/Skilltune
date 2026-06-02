import { serve } from "bun"
import { mastra } from "./services/mastra"
import index from "./index.html"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import {
  getSkillContent,
  saveSkill,
  buildSkillPrompt,
} from "./services/skills"

const KEY_FILE = join(process.cwd(), ".mastra", "api_key")
const OUT_DIR = join(process.cwd(), ".mastra", "output")
const TYP_OUTPUT = join(OUT_DIR, "tailored_resume.typ")
const PDF_OUTPUT = join(OUT_DIR, "tailored_resume.pdf")

async function loadApiKey(): Promise<string | null> {
  try {
    return (await readFile(KEY_FILE, "utf-8")).trim() || null
  } catch {
    return null
  }
}

async function saveApiKey(key: string): Promise<void> {
  await mkdir(join(process.cwd(), ".mastra"), { recursive: true })
  await writeFile(KEY_FILE, key)
}

function setDeepSeekEnv(apiKey: string) {
  process.env.DEEPSEEK_API_KEY = apiKey
}

function clearDeepSeekEnv() {
  delete process.env.DEEPSEEK_API_KEY
}

function logPrompt(label: string, prompt: string) {
  const bytes = Buffer.byteLength(prompt, "utf-8")
  const kb = (bytes / 1024).toFixed(1)
  console.log(`\n[${label}] Prompt (${kb} KB, ${bytes} bytes)`)
  console.log("───────────────────────")
  if (prompt.length > 2000) {
    console.log(prompt.slice(0, 1000))
    console.log(`\n... [${prompt.length - 2000} chars trimmed] ...\n`)
    console.log(prompt.slice(-1000))
  } else {
    console.log(prompt)
  }
  console.log("───────────────────────\n")
}

async function readOutputTyp(): Promise<string | null> {
  try {
    return await Bun.file(TYP_OUTPUT).text()
  } catch {
    return null
  }
}

async function pdfExists(): Promise<boolean> {
  try {
    await Bun.file(PDF_OUTPUT).arrayBuffer()
    return true
  } catch {
    return false
  }
}

const server = serve({
  port: 3721,
  routes: {
    "/*": index,

    "/api/save-key": {
      async POST(req) {
        try {
          const { apiKey } = (await req.json()) as { apiKey?: string }
          if (!apiKey) return Response.json({ error: "Missing apiKey" }, { status: 400 })
          await saveApiKey(apiKey)
          return Response.json({ saved: true })
        } catch (err) {
          return Response.json({ error: String(err) }, { status: 500 })
        }
      },
    },

    "/api/create-skill": {
      async POST(req) {
        try {
          const body = await req.json()
          const {
            resumePath,
            name,
            targetRoles,
            industry,
          } = body as {
            resumePath?: string
            name?: string
            targetRoles?: string
            industry?: string
          }
          let { apiKey } = body as { apiKey?: string }

          if (!resumePath || !name) {
            return Response.json(
              { error: "Missing resumePath or name" },
              { status: 400 }
            )
          }
          if (!apiKey) apiKey = (await loadApiKey()) ?? undefined
          if (!apiKey) {
            return Response.json(
              { error: "No API key. Run onboarding first." },
              { status: 400 }
            )
          }

          setDeepSeekEnv(apiKey)

          let resumeContent: string
          try {
            const f = Bun.file(resumePath)
            resumeContent = (await f.text()).trim()
            console.log(
              `[api/create-skill] Read resume: ${resumePath.split("/").pop()} (${resumeContent.length} chars)`
            )
          } catch {
            return Response.json(
              { error: `Cannot read resume file: ${resumePath}` },
              { status: 400 }
            )
          }

          const prompt = buildSkillPrompt(resumeContent, {
            name,
            targetRoles: targetRoles ?? "",
            industry: industry ?? "",
          })
          logPrompt("create-skill", prompt)

          const agent = mastra.getAgentById("posting-analysis")
          const result = await agent.generate(prompt)

          clearDeepSeekEnv()

          const skillContent = result.text
          await saveSkill(skillContent)
          console.log(
            `[api/create-skill] Skill saved (${skillContent.length} chars)`
          )

          return Response.json({ skillCreated: true })
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error"
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },

    "/api/analyze-posting": {
      async POST(req) {
        try {
          const body = await req.json()
          const { text } = body as { text?: string }
          let { apiKey } = body as { apiKey?: string }

          if (!text) {
            return Response.json({ error: "Missing 'text'" }, { status: 400 })
          }
          if (!apiKey) apiKey = (await loadApiKey()) ?? undefined
          if (!apiKey) {
            return Response.json(
              { error: "No API key. Run onboarding first." },
              { status: 400 }
            )
          }

          setDeepSeekEnv(apiKey)

          const words = text.split(/\s+/).filter(Boolean).length
          console.log(`[api/analyze] Text: ${text.length} chars, ~${words} words`)

          const prompt = `Analyze this job posting:\n\n${text.replace(/\n{2,}/g, "\n")}`
          logPrompt("analyze-posting", prompt)

          const agent = mastra.getAgentById("posting-analysis")
          const result = await agent.generate(prompt)

          clearDeepSeekEnv()

          return Response.json({
            analysis: result.text,
            steps: result.steps?.length ?? 0,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error"
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },

    "/api/write-resume": {
      async POST(req) {
        try {
          const body = await req.json()
          const { analysis } = body as { analysis?: string }
          let { apiKey } = body as { apiKey?: string }

          if (!analysis) {
            return Response.json({ error: "Missing 'analysis'" }, { status: 400 })
          }
          if (!apiKey) apiKey = (await loadApiKey()) ?? undefined
          if (!apiKey) {
            return Response.json(
              { error: "No API key. Run onboarding first." },
              { status: 400 }
            )
          }

          setDeepSeekEnv(apiKey)

          const skillContent = await getSkillContent()
          if (!skillContent) {
            return Response.json(
              {
                error:
                  "No resume skill found. Re-run onboarding to create your resume profile.",
              },
              { status: 400 }
            )
          }

          console.log(
            `[api/write] Skill: ${skillContent.length} chars, Analysis: ${analysis.length} chars`
          )

          const prompt = `Write a tailored Typst resume using the RESUME SKILL and JOB ANALYSIS below. Use your tools to write the .typ file and compile it.

RESUME SKILL (the person's professional profile — source of truth):
--- skill ---
${skillContent}
--- end skill ---

JOB POSTING ANALYSIS:
${analysis}

Follow the workflow:
1. Study the RESUME SKILL and JOB ANALYSIS
2. Write a tailored Typst resume matching the job
3. Use the writer tool to save it as "tailored_resume.typ"
4. Use the typst_compile tool to compile it to PDF
5. Confirm the file paths`

          logPrompt("write-resume", prompt)

          const agent = mastra.getAgentById("resume-writer")
          const result = await agent.generate(prompt)

          clearDeepSeekEnv()

          const typContent = await readOutputTyp()
          const compiled = await pdfExists()

          return Response.json({
            typ: typContent ?? result.text,
            typPath: TYP_OUTPUT,
            pdfPath: compiled ? PDF_OUTPUT : null,
            steps: result.steps?.length ?? 0,
            message: result.text,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error"
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },

    "/api/download/typ": {
      async GET(req) {
        try {
          const file = Bun.file(TYP_OUTPUT)
          return new Response(file, {
            headers: {
              "Content-Type": "text/plain",
              "Content-Disposition":
                'attachment; filename="tailored_resume.typ"',
            },
          })
        } catch {
          return new Response("Not found", { status: 404 })
        }
      },
    },

    "/api/download/pdf": {
      async GET(req) {
        try {
          const file = Bun.file(PDF_OUTPUT)
          return new Response(file, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition":
                'attachment; filename="tailored_resume.pdf"',
            },
          })
        } catch {
          return new Response("Not found", { status: 404 })
        }
      },
    },
  },

  development:
    process.env.NODE_ENV !== "production" && {
      hmr: true,
      console: true,
    },
})

const savedKey = await loadApiKey()
if (savedKey) {
  console.log(`[server] Loaded saved API key`)
} else {
  console.log(`[server] No saved API key — will receive it from extension`)
}
console.log(`Server running at ${server.url}`)
