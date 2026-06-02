import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from agents.posting_analysis import create_posting_agent, analyze_posting
from agents.resume_writer import create_resume_agent
from skills.skill_manager import get_skill_content, create_skill

load_dotenv()

KEY_DIR = Path(os.getcwd()) / ".mastra"
KEY_FILE = KEY_DIR / "api_key"
OUT_DIR = KEY_DIR / "output"
SKILL_DIR = KEY_DIR / "skills"
TYP_OUTPUT = OUT_DIR / "tailored_resume.typ"
PDF_OUTPUT = OUT_DIR / "tailored_resume.pdf"

app = FastAPI(title="Resume Adjuster")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_key() -> str | None:
    try:
        key = KEY_FILE.read_text().strip()
        return key or None
    except FileNotFoundError:
        return None


def _save_key(key: str) -> None:
    KEY_DIR.mkdir(parents=True, exist_ok=True)
    KEY_FILE.write_text(key)


def _get_api_key(body_key: str | None = None) -> str:
    key = body_key or _load_key()
    if not key:
        raise HTTPException(400, "No API key. Run onboarding first.")
    return key


def _read_resume(path: str) -> str:
    try:
        return Path(path).read_text().strip()
    except Exception:
        raise HTTPException(400, f"Cannot read resume file: {path}")


# ── API Routes ──


class KeyPayload(BaseModel):
    apiKey: str


@app.post("/api/save-key")
def save_key(payload: KeyPayload):
    if not payload.apiKey:
        raise HTTPException(400, "Missing apiKey")
    _save_key(payload.apiKey)
    return {"saved": True}


class CreateSkillPayload(BaseModel):
    resumePath: str
    name: str
    targetRoles: str = ""
    industry: str = ""
    apiKey: str | None = None


@app.post("/api/create-skill")
def api_create_skill(payload: CreateSkillPayload):
    api_key = _get_api_key(payload.apiKey)
    os.environ["DEEPSEEK_API_KEY"] = api_key

    resume = _read_resume(payload.resumePath)
    model = create_posting_agent()
    skill = create_skill(
        model,
        resume,
        payload.name,
        payload.targetRoles,
        payload.industry,
    )
    print(f"[create-skill] Created ({len(skill)} chars)")
    return {"skillCreated": True}


class AnalyzePayload(BaseModel):
    text: str
    apiKey: str | None = None


@app.post("/api/analyze-posting")
def api_analyze_posting(payload: AnalyzePayload):
    api_key = _get_api_key(payload.apiKey)
    os.environ["DEEPSEEK_API_KEY"] = api_key

    print(f"[analyze] Text: {len(payload.text)} chars")

    model = create_posting_agent()
    analysis = analyze_posting(model, payload.text)

    return {"analysis": analysis, "steps": 1}


class WriteResumePayload(BaseModel):
    analysis: str
    apiKey: str | None = None


@app.post("/api/write-resume")
def api_write_resume(payload: WriteResumePayload):
    api_key = _get_api_key(payload.apiKey)
    os.environ["DEEPSEEK_API_KEY"] = api_key

    skill = get_skill_content()
    if not skill:
        raise HTTPException(400, "No resume skill found. Re-run onboarding.")

    print(f"[write] Skill: {len(skill)} chars, Analysis: {len(payload.analysis)} chars")

    agent = create_resume_agent()
    prompt = f"""Write a tailored Typst resume using the RESUME SKILL and JOB ANALYSIS below.
Use your tools to write the .typ file and compile it.

RESUME SKILL (the person's professional profile — source of truth):
--- skill ---
{skill}
--- end skill ---

JOB POSTING ANALYSIS:
{payload.analysis}

Follow the workflow:
1. Study the RESUME SKILL and JOB ANALYSIS
2. Write a tailored Typst resume matching the job
3. Use the writer tool to save it as "tailored_resume.typ"
4. Use the typst_compile tool to compile it to PDF
5. Confirm the file paths"""

    from langchain_core.messages import HumanMessage

    result = agent.invoke({"messages": [HumanMessage(content=prompt)]})
    messages = result["messages"]
    final = messages[-1].content if messages else ""

    typ_content = None
    try:
        typ_content = TYP_OUTPUT.read_text()
    except Exception:
        pass

    pdf_exists = PDF_OUTPUT.exists()

    return JSONResponse(
        {
            "typ": typ_content or str(final),
            "typPath": str(TYP_OUTPUT),
            "pdfPath": str(PDF_OUTPUT) if pdf_exists else None,
            "steps": 1,
            "message": str(final),
        }
    )


@app.get("/api/download/typ")
def api_download_typ():
    if not TYP_OUTPUT.exists():
        raise HTTPException(404, "Not found")
    return FileResponse(
        str(TYP_OUTPUT),
        media_type="text/plain",
        filename="tailored_resume.typ",
    )


@app.get("/api/download/pdf")
def api_download_pdf():
    if not PDF_OUTPUT.exists():
        raise HTTPException(404, "Not found")
    return FileResponse(
        str(PDF_OUTPUT),
        media_type="application/pdf",
        filename="tailored_resume.pdf",
    )


if __name__ == "__main__":
    import uvicorn

    print(f"[server] Starting on port 3721...")
    saved = _load_key()
    print(f"[server] {'Loaded saved API key' if saved else 'No saved API key — will receive from extension'}")
    uvicorn.run(app, host="0.0.0.0", port=3721, log_level="info")
