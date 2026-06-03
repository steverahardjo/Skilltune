import os
from pathlib import Path
from datetime import date

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from agents.posting_analysis import create_posting_agent, analyze_posting
from agents.resume_writer import create_resume_agent
from agents.job_scorer import score_job
from agents.csv_writer import create_csv_agent

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
TEMP_DIR = BASE_DIR / "temp"

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


# ── API Routes ──


@app.api_route("/api/health", methods=["GET", "POST"])
def health():
    return {"ok": True}


class AnalyzePayload(BaseModel):
    text: str


@app.post("/api/analyze-posting")
def api_analyze_posting(payload: AnalyzePayload):
    api_key = _get_api_key()
    os.environ["DEEPSEEK_API_KEY"] = api_key

    text = payload.text.strip()
    print(f"[analyze] Text: {len(text)} chars")

    model = create_posting_agent()
    analysis = analyze_posting(model, text)

    return {"analysis": analysis}


class JobScorePayload(BaseModel):
    resumePath: str
    analysis: str


@app.post("/api/job-score")
def api_job_score(payload: JobScorePayload):
    api_key = _get_api_key()
    os.environ["DEEPSEEK_API_KEY"] = api_key
    result = score_job(payload.resumePath, payload.analysis)

    return {
        "score": result.score,
        "similarityPct": result.similarity_pct,
        "keyMatches": result.key_matches,
        "keyMissing": result.key_missing,
        "strengths": result.strengths,
        "gaps": result.gaps,
        "suggestions": result.suggestions,
        "summary": result.summary,
    }


class WriteResumePayload(BaseModel):
    resumePath: str
    analysis: str


@app.post("/api/write-resume")
def api_write_resume(payload: WriteResumePayload):
    api_key = _get_api_key()
    os.environ["DEEPSEEK_API_KEY"] = api_key

    try:
        resume_content = Path(payload.resumePath).read_text().strip()
    except Exception:
        raise HTTPException(400, f"Cannot read resume file: {payload.resumePath}")

    print(f"[write] Resume: {len(resume_content)} chars, Analysis: {len(payload.analysis)} chars")

    agent = create_resume_agent()
    from langchain_core.messages import HumanMessage

    today = date.today().isoformat()
    result = agent.invoke({"messages": [HumanMessage(content=f"""Write a tailored Typst resume using the reference resume and job analysis below.

RESUME TYPST SOURCE (use this for style, formatting, and the user's actual background):
--- resume.typ ---
{resume_content[:6000]}
--- end resume ---

JOB POSTING ANALYSIS:
{payload.analysis}

Follow the workflow:
1. Study the RESUME TYPST SOURCE — understand the person's background, and replicate the Typst style (fonts, spacing, layout, heading styles)
2. Study the JOB POSTING ANALYSIS — understand what the employer wants
3. Write a tailored Typst resume using the same visual style, with content tweaked for the job
4. Use the writer tool to save the .typ file with the filename: <company>_<role>_{today}.typ
5. Use the terminal tool to compile: typst compile <path>/<file>.typ <path>/<file>.pdf
6. Report the file paths""")]})

    messages = result["messages"]
    final = messages[-1].content if messages else ""

    # read the output .typ file (most recently written)
    typ_path = None
    if TEMP_DIR.exists():
        for f in sorted(TEMP_DIR.glob("*.typ"), key=lambda p: p.stat().st_mtime, reverse=True):
            typ_path = str(f)
            break

    pdf_path = None
    if typ_path:
        candidate = typ_path.replace(".typ", ".pdf")
        if Path(candidate).exists():
            pdf_path = candidate

    # ── Log to CSV ──
    try:
        csv_agent = create_csv_agent()
        csv_agent.invoke({"messages": [HumanMessage(content=f"""Log this job application to CSV.

JOB POSTING ANALYSIS (extract company and role from this):
{payload.analysis[:2000]}

DATE: {today}
TYP PATH: {typ_path or 'none'}
PDF PATH: {pdf_path or 'none'}
NOTES: Resume tailored and compiled successfully""")]})
        print(f"[write] Application logged to temp/applications.csv")
    except Exception as e:
        print(f"[write] CSV logging failed (non-fatal): {e}")

    return JSONResponse({
        "success": True,
        "typPath": typ_path or "",
        "pdfPath": pdf_path,
        "message": str(final),
    })


@app.get("/api/download/typ")
def api_download_typ():
    files = sorted(TEMP_DIR.glob("*.typ"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise HTTPException(404, "Not found")
    path = str(files[0])
    return FileResponse(path, media_type="text/plain", filename=files[0].name)


@app.get("/api/download/pdf")
def api_download_pdf():
    files = sorted(TEMP_DIR.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise HTTPException(404, "Not found")
    path = str(files[0])
    return FileResponse(path, media_type="application/pdf", filename=files[0].name)


if __name__ == "__main__":
    import uvicorn

    print("[server] Starting on port 3721...")
    uvicorn.run(app, host="0.0.0.0", port=3721, log_level="info")
