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

BASE_DIR = Path(__file__).resolve().parent.parent
KEY_DIR = BASE_DIR / ".mastra"
OUT_DIR = KEY_DIR / "output"
SKILL_DIR = KEY_DIR / "skills"
SCREENSHOTS_DIR = KEY_DIR / "screenshots"
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


def _get_api_key() -> str:
    key = os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        raise HTTPException(400, "DEEPSEEK_API_KEY not set in .env")
    return key


def _read_resume(path: str) -> str:
    try:
        return Path(path).read_text().strip()
    except Exception:
        raise HTTPException(400, f"Cannot read resume file: {path}")


# ── API Routes ──


class CreateSkillPayload(BaseModel):
    resumePath: str
    name: str
    targetRoles: str = ""
    industry: str = ""


@app.post("/api/create-skill")
def api_create_skill(payload: CreateSkillPayload):
    api_key = _get_api_key()
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


@app.post("/api/analyze-posting")
def api_analyze_posting(payload: AnalyzePayload):
    api_key = _get_api_key()
    os.environ["DEEPSEEK_API_KEY"] = api_key

    text = payload.text.replace("\n{2,}", "\n").strip()
    print(f"[analyze] Text: {len(text)} chars")

    model = create_posting_agent()
    analysis = analyze_posting(model, text)

    return {"analysis": analysis}


class WriteResumePayload(BaseModel):
    analysis: str


@app.post("/api/write-resume")
def api_write_resume(payload: WriteResumePayload):
    api_key = _get_api_key()
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

    print("[server] Starting on port 3721...")
    uvicorn.run(app, host="0.0.0.0", port=3721, log_level="info")
