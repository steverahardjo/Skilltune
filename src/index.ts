import { serve } from "bun"
import { mastra } from "./services/mastra"
import index from "./index.html"

function setDeepSeekEnv(apiKey: string) {
  process.env.OPENAI_API_KEY = apiKey
  process.env.OPENAI_BASE_URL = "https://api.deepseek.com"
}

function clearDeepSeekEnv() {
  delete process.env.OPENAI_API_KEY
  delete process.env.OPENAI_BASE_URL
}

const RESOURCE_ID = "default-user"
const THREAD_PROFILE = "profile-session"

const server = serve({
  port: 3721,
  routes: {
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        })
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        })
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name
      return Response.json({
        message: `Hello, ${name}!`,
      })
    },

    "/api/profile": {
      async POST(req) {
        try {
          const body = await req.json()
          const { path, apiKey } = body as { path?: string; apiKey?: string }

          if (!path || !apiKey) {
            return Response.json({ error: "Missing 'path' or 'apiKey'" }, { status: 400 })
          }

          setDeepSeekEnv(apiKey)

          const agent = mastra.getAgentById("profiling-agent")
          const result = await agent.generate(
            `Read and profile all files in this directory: ${path}`,
            {
              memory: {
                thread: THREAD_PROFILE,
                resource: RESOURCE_ID,
              },
            }
          )

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
          const { path, apiKey } = body as {
            path?: string
            apiKey?: string
          }

          if (!path || !apiKey) {
            return Response.json(
              { error: "Missing 'path' or 'apiKey'" },
              { status: 400 }
            )
          }

          setDeepSeekEnv(apiKey)

          const agent = mastra.getAgentById("resume-writer")
          const result = await agent.generate(
            `Workspace directory: ${path}. Generate a tailored resume based on the user profile in your working memory.`,
            {
              memory: {
                thread: THREAD_PROFILE,
                resource: RESOURCE_ID,
              },
            }
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
          const { text, apiKey } = body as {
            text?: string
            apiKey?: string
          }

          if (!text || !apiKey) {
            return Response.json(
              { error: "Missing 'text' or 'apiKey'" },
              { status: 400 }
            )
          }

          setDeepSeekEnv(apiKey)

          const agent = mastra.getAgentById("posting-analysis")
          const result = await agent.generate(
            `Analyze this job posting and extract all details into working memory:\n\n${text}`,
            {
              memory: {
                thread: THREAD_PROFILE,
                resource: RESOURCE_ID,
              },
            }
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

console.log(`Server running at ${server.url}`)
