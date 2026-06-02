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

const RESOURCE_ID = "default-user"
const THREAD_PROFILE = "profile-session"

const memoryOpts = {
  memory: {
    thread: THREAD_PROFILE,
    resource: RESOURCE_ID,
  },
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

    "/api/profile": {
      async POST(req) {
        try {
          const body = await req.json()
          const { files } = body as { files?: string }
          let { apiKey } = body as { apiKey?: string }

          if (!files) {
            return Response.json({ error: "Missing 'files'" }, { status: 400 })
          }
          if (!apiKey) apiKey = (await loadApiKey()) ?? undefined
          if (!apiKey) {
            return Response.json(
              { error: "No API key. Run onboarding first." },
              { status: 400 }
            )
          }

          setDeepSeekEnv(apiKey)

          const parsed: { name: string; content: string }[] = JSON.parse(files)
          console.log(`[api/profile] Received ${parsed.length} files: ${parsed.map(f => f.name).join(", ")}`)

          const BATCH_SIZE = 3
          const agent = mastra.getAgentById("profiling-agent")
          const results: string[] = []

          for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
            const batch = parsed.slice(i, i + BATCH_SIZE)
            const batchNum = Math.floor(i / BATCH_SIZE) + 1
            const totalBatches = Math.ceil(parsed.length / BATCH_SIZE)

            const fileList = batch
              .map((f) => `\n--- ${f.name} ---\n${f.content.replace(/\n{2,}/g, "\n")}`)
              .join("\n")

            const prompt =
              batchNum === 1
                ? `First batch (${batchNum}/${totalBatches}). Build a profile from these files. Store everything in working memory:\n${fileList}`
                : `Batch ${batchNum}/${totalBatches}. Read these files and UPDATE working memory with any new information. Build on what's already there:\n${fileList}`

            logPrompt(`profile batch ${batchNum}/${totalBatches}`, prompt)

            const result = await agent.generate(prompt, memoryOpts)
            console.log(`[api/profile] Batch ${batchNum}/${totalBatches} done. steps: ${result.steps?.length}`)
            results.push(result.text)
          }

          console.log(`[api/profile] All ${Math.ceil(parsed.length / BATCH_SIZE)} batches complete`)
          clearDeepSeekEnv()
          return Response.json({ profile: results.join("\n\n") })
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
          let { apiKey } = body as { apiKey?: string }

          if (!apiKey) apiKey = (await loadApiKey()) ?? undefined
          if (!apiKey) {
            return Response.json(
              { error: "No API key. Run onboarding first." },
              { status: 400 }
            )
          }

          setDeepSeekEnv(apiKey)

          const prompt = `Generate a tailored resume based on the user profile and job posting in your working memory.`
          logPrompt("write-resume", prompt)

          const agent = mastra.getAgentById("resume-writer")
          const result = await agent.generate(prompt, memoryOpts)

          clearDeepSeekEnv()

          return Response.json({
            result: result.text,
            steps: result.steps?.length ?? 0,
          })
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

          const prompt = `Analyze this job posting and extract all details into working memory:\n\n${text.replace(/\n{2,}/g, "\n")}`
          logPrompt("analyze-posting", prompt)

          const agent = mastra.getAgentById("posting-analysis")
          const result = await agent.generate(prompt, memoryOpts)

          clearDeepSeekEnv()

          return Response.json({
            result: result.text,
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
