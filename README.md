# Resume Adjuster

Chrome extension that analyzes job postings and writes tailored resumes — powered by [Mastra](https://mastra.ai) agents and DeepSeek.

## How it works

1. **Onboarding** — Enter your name, target roles, industry, pick your resume file (`.typ`, `.tex`, `.pdf`, `.docx`), and provide a DeepSeek API key.
2. **Scan** — Browse any job posting page, open the extension popup, and click "Scan page" to capture a screenshot.
3. **Analyze** — Click "Analyze posting" to have an AI agent extract job title, company, skills, requirements, and responsibilities from the scanned text.
4. **Write** — Click "Write tailored resume" to have an AI agent generate a tailored Typst resume source file, which you can download as `.typ` and compile with [Typst](https://typst.app).

## Architecture

```
┌─────────────────────┐   chrome.runtime      ┌──────────────────────┐
│   Chrome Extension   │  sendMessage(API_CALL)  │   Local Mastra API   │
│                     │ ───────────────────────→ │   (localhost:3721)   │
│  Popup (React)      │ ←─────────────────────── │                      │
│  Service Worker     │      JSON response       │  Agents:             │
│  Content Script     │                          │  - posting-analysis  │
│                     │                          │  - resume-writer     │
└─────────────────────┘                          └──────────────────────┘
```

- **Stateless** — every API call is independent. The extension holds the analysis result in React state and passes it to the write endpoint. No shared database state between agents.
- **Popup never calls `fetch()` directly** — all API calls go through the service worker as a network proxy (MV3 requirement).
- **Single resume file** — pick a `.typ`/`.tex`/`.pdf`/`.docx` file during onboarding, stored via File System Access API to IndexedDB.

## Project structure

```
src/
├── index.ts                     # Mastra server (Bun, port 3721)
├── popup/
│   ├── index.tsx                # Popup entry point
│   ├── Popup.tsx                # Root component (onboarding vs dashboard)
│   ├── Onboarding.tsx           # 3-step onboarding flow
│   ├── Dashboard.tsx            # Main UI (Scan/Analyze/Write)
│   └── theme.css                # Styling
├── background/
│   └── service-worker.ts        # Network proxy + screenshot handling
├── content/
│   └── content-script.ts        # Page text extraction
├── shared/
│   ├── filesystem.ts            # File System Access helpers (pick/read resume)
│   ├── scan.ts                  # API call wrappers (popup → service worker → server)
│   ├── storage.ts               # chrome.storage.local config
│   └── types.ts                 # UserConfig type
└── services/
    ├── scanner.ts               # Screenshot capture + save
    └── mastra/
        ├── index.ts             # Mastra instance
        └── agents/
            ├── posting-analysis-agent.ts
            └── resume-writer.ts
```

## Setup

```bash
bun install
```

Copy `.env.example` to `.env` (or set `DEEPSEEK_API_KEY`):
```bash
cp .env.example .env
```

## Development

```bash
# Start the Mastra server (port 3721, hot-reload)
bun dev

# In another terminal: build + watch the extension
bun dev:extension
```

Then load the `extension/` directory as an unpacked extension in `chrome://extensions`.

## Build

```bash
bun build:extension
```

Output goes to `extension/` — load it in `chrome://extensions`.

## Test the agents

```bash
bun scripts/test-profile.ts <resume-file> <job-posting-file> [api-key]
```

Runs both agents end-to-end: analyzes the posting, then writes a tailored Typst resume.

## API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | Health check |
| `/api/save-key` | `POST` | Persist DeepSeek API key to `.mastra/api_key` |
| `/api/analyze-posting` | `POST` | Analyze job posting text |
| `/api/write-resume` | `POST` | Generate tailored Typst resume source |

## Tech stack

- **Runtime**: [Bun](https://bun.com)
- **Agents**: [Mastra](https://mastra.ai) (posting analysis, resume writing)
- **LLM**: DeepSeek (`deepseek-v4-flash`) via `@ai-sdk/deepseek`
- **Resume format**: [Typst](https://typst.app) source generation
- **Extension**: Chrome MV3, React 19, File System Access API
- **Dev tools**: TypeScript 6, Bun bundler, WebSocket hot-reload
