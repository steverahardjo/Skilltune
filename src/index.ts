import { serve } from "bun"
import { mastra } from "./services/mastra"
import index from "./index.html"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

const KEY_FILE = join(process.cwd(), ".mastra", "api_key")

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
          const { resumePath, analysis } = body as { resumePath?: string; analysis?: string }
          let { apiKey } = body as { apiKey?: string }

          if (!resumePath) {
            return Response.json({ error: "Missing 'resumePath'" }, { status: 400 })
          }
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

          let resumeContent: string
          const name = resumePath.split("/").pop() || resumePath
          try {
            const f = Bun.file(resumePath)
            const text = await f.text()
            resumeContent = text.slice(0, 3000).trim()
            console.log(`[api/write] Read resume: ${name} (${resumeContent.length} chars)`)
          } catch {
            return Response.json(
              { error: `Cannot read resume file: ${resumePath}` },
              { status: 400 }
            )
          }
          console.log(`[api/write] Analysis: ${analysis.length} chars`)

          const prompt = `Write a tailored Typst resume.

CURRENT RESUME:
--- ${name} ---
${resumeContent}
--- End of resume ---

JOB POSTING ANALYSIS:
${analysis}

Generate the tailored Typst source code.`
          logPrompt("write-resume", prompt)

          const agent = mastra.getAgentById("resume-writer")
          const result = await agent.generate(prompt)

          clearDeepSeekEnv()

          return Response.json({
            typ: result.text,
            steps: result.steps?.length ?? 0,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error"
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
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
