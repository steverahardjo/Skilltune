# Skilltune

An agentic resume adjuster Chrome extension — powered by LangChain + DeepSeek.

## How it works

1. **Onboarding** — Enter your name, target roles, industry, and path to your resume file (`.typ`).
2. **Scan** — Browse a job posting page, open the extension popup, click "Scan this page" to capture a screenshot.
3. **Analyze** — Click "Analyze posting" to extract the page text and have an AI agent extract job title, company, skills, requirements, and responsibilities.
4. **Write** — Click "Write tailored resume" to generate a tailored `.typ` file using your resume as a style reference, compiled to PDF via Typst CLI.

## Architecture

```
┌─────────────────────┐  chrome.runtime      ┌───────────────────────┐
│   Chrome Extension   │ sendMessage(API_CALL)  │   Python Server        │
│                     │ ──────────────────────→ │   (localhost:3721)     │
│  Popup (React)      │ ←────────────────────── │                        │
│  Service Worker     │     JSON response       │  LangChain Agents:     │
│  Content Script     │                         │  - posting-analysis   │
│                     │                         │  - resume-writer      │
└─────────────────────┘                         └───────────────────────┘
```

- **Stateless** — every API call is independent. The extension holds the analysis result in React state.
- **Popup never calls `fetch()` directly** — all API calls go through the service worker (MV3 requirement).
- **Single resume file** — enter the path to your `.typ` resume during onboarding, stored in `chrome.storage.local`.
- **API key via `.env`** — the server reads `DEEPSEEK_API_KEY` from `server/.env`, no key flow in the extension.

## Project structure

```
src/                         # Chrome extension (TypeScript)
├── popup/                   # Extension UI (React)
│   ├── Dashboard.tsx        # Main UI: Scan → Analyze → Write
│   ├── Onboarding.tsx       # 2-step onboarding
│   └── Popup.tsx            # Root router
├── background/
│   └── service-worker.ts    # API proxy to localhost:3721
├── content/
│   └── content-script.ts    # Page text extraction
├── services/
│   └── scanner.ts           # Screenshot capture
└── shared/
    ├── types.ts             # Type definitions
    ├── storage.ts           # chrome.storage.local helpers
    └── scan.ts              # API call wrappers

server/                      # Python backend (LangChain + FastAPI)
├── app.py                   # FastAPI server (port 3721)
├── requirements.txt         # Python dependencies
├── agents/
│   ├── posting_analysis.py  # Simple LLM call for job extraction
│   └── resume_writer.py     # LangGraph agent with writer + shell tools
├── tools/
│   └── __init__.py          # writer tool (save .typ to temp/)
└── scripts/
    └── test_writer.py       # End-to-end pipeline test
```

## Setup

### 1. Python server

```bash
cd server
pip install -r requirements.txt
```

Create `server/.env` with your DeepSeek API key:
```
DEEPSEEK_API_KEY=sk-...
```

Install Typst CLI (for PDF compilation):
```bash
# macOS
brew install typst

# Linux
curl -fsSL https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz | tar xJ
sudo mv typst-x86_64-unknown-linux-musl/typst /usr/local/bin/
```

### 2. Chrome extension

```bash
bun install
bun run build:extension
```

Load `extension/` as an unpacked extension in `chrome://extensions`.

## Development

```bash
# Terminal 1: Start the Python server
cd server && python3 app.py

# Terminal 2: Build + watch the extension
bun dev:extension
```

## Build

```bash
bun build:extension        # Output: extension/ — load in chrome://extensions
```

## API endpoints

| Endpoint | Method | Body | Description |
|---|---|---|---|
| `/api/analyze-posting` | `POST` | `{ text }` | Analyze job posting text |
| `/api/write-resume` | `POST` | `{ resumePath, analysis }` | Generate tailored `.typ` + compile PDF |
| `/api/download/typ` | `GET` | — | Download latest `.typ` file |
| `/api/download/pdf` | `GET` | — | Download latest `.pdf` file |

Output files are written to `temp/` (project root). The PDF file exists only if `typst` CLI is installed.

## Test the pipeline

```bash
python3 server/scripts/test_writer.py
# or with your own files:
python3 server/scripts/test_writer.py ~/resume.typ ~/job.txt "Name" "Role" "Industry"
```

## Tech stack

- **Backend**: Python, [FastAPI](https://fastapi.tiangolo.com/), [LangChain](https://langchain.com), [LangGraph](https://langchain-ai.github.io/langgraph/)
- **LLM**: DeepSeek via `langchain-deepseek`
- **Resume format**: [Typst](https://typst.app)
- **Extension**: Chrome MV3, React 19, TypeScript, [Bun](https://bun.com)
