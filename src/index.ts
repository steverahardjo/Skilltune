import { serve } from "bun"
import { mastra } from "./services/mastra"
import index from "./index.html"

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

          if (!path) {
            return Response.json({ error: "Missing 'path' field" }, { status: 400 })
          }
          if (!apiKey) {
            return Response.json({ error: "Missing 'apiKey' field" }, { status: 400 })
          }

          process.env.OPENAI_API_KEY = apiKey
          process.env.OPENAI_BASE_URL = "https://api.deepseek.com"

          const agent = mastra.getAgentById("profiling-agent")
          const result = await agent.generate(
            `Read and profile all files in this directory: ${path}`
          )

          delete process.env.OPENAI_API_KEY
          delete process.env.OPENAI_BASE_URL

          return Response.json({
            profile: result.text,
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
