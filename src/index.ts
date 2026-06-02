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

          const fileList = parsed
            .map((f) => `\n--- ${f.name} ---\n${f.content}`)
            .join("\n")

          const agent = mastra.getAgentById("profiling-agent")
          const result = await agent.generate(
            `Build a professional profile from these workspace files:\n${fileList}`,
            memoryOpts
          )

          console.log("[api/profile] Done. steps:", result.steps?.length)

          clearDeepSeekEnv()
          return Response.json({ profile: result.text })
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

          const agent = mastra.getAgentById("resume-writer")
          const result = await agent.generate(
            `Generate a tailored resume based on the user profile and job posting in your working memory.`,
            memoryOpts
          )

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

          const agent = mastra.getAgentById("posting-analysis")
          const result = await agent.generate(
            `Analyze this job posting and extract all details into working memory:\n\n${text}`,
            memoryOpts
          )

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
