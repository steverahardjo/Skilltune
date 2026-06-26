import os
from pathlib import Path
from datetime import date

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from agents.posting_analysis import create_posting_agent, analyze_posting
from agents.resume_writer import write_resume
from agents.job_scorer import score_job
from database import init_db, save_scan, get_scan, get_all_scans

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
TEMP_DIR = BASE_DIR / "temp"

init_db()

app = FastAPI(title="Skilltune")

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
    link: str = ""
    login_type: str = "jd"


class SearchJobDescPayload(BaseModel):
    link: str
    login_type: str = "jd"


@app.post("/api/search-job-desc")
def api_search_job_desc(payload: SearchJobDescPayload):
    result = get_scan(payload.link, payload.login_type)
    if not result:
        return {"found": False, "data": None}
    return {"found": True, "data": result}


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
    link: str = ""
    login_type: str = "jd"


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
    link: str = ""
    login_type: str = "jd"

@app.post("/api/write-resume")
def api_write_resume(payload: WriteResumePayload):
    api_key = _get_api_key()
    os.environ["DEEPSEEK_API_KEY"] = api_key

    try:
        resume_content = Path(payload.resumePath).read_text().strip()
    except Exception:
        raise HTTPException(400, f"Cannot read resume file: {payload.resumePath}")

    ext = Path(payload.resumePath).suffix.lower()
    print(f"[write] Resume: {len(resume_content)} chars, Analysis: {len(payload.analysis)} chars")

    # Detect format from source content, not just extension
    if "\\documentclass" in resume_content or "\\begin{document}" in resume_content:
        fmt_key = "latex"
    elif "#set " in resume_content or "#let " in resume_content or "#show " in resume_content:
        fmt_key = "typst"
    else:
        fmt_key = "typst" if ext == ".typ" else "latex"

    today = date.today().isoformat()
    source_path = Path(write_resume(resume_content, payload.analysis, fmt=fmt_key))
    content = source_path.read_text()

    pdf_path = None
    import subprocess
    ppath = source_path.with_suffix(".pdf")
    try:
        if fmt_key == "typst":
            result = subprocess.run(
                ["typst", "compile", str(source_path), str(ppath)],
                capture_output=True, text=True, timeout=30,
            )
            print(f"[write] typst compile: rc={result.returncode}, stdout='{result.stdout[:200]}', stderr='{result.stderr[:200]}'")
        else:
            result = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode",
                 "-output-directory", str(source_path.parent), str(source_path.name)],
                capture_output=True, text=True, timeout=30, cwd=str(source_path.parent),
            )
            print(f"[write] pdflatex compile: rc={result.returncode}, stderr='{result.stderr[:200]}'")
        if ppath.exists():
            pdf_path = str(ppath)
    except Exception as e:
        print(f"[write] Compile failed: {e}")

    save_scan(payload.link, today, content, payload.analysis, payload.login_type)

    return JSONResponse({
        "success": True,
        "sourcePath": str(source_path),
        "pdfPath": pdf_path,
        "message": content,
    })


@app.get("/api/download/source")
def api_download_source():
    for pat in ["*.typ", "*.tex"]:
        files = sorted(TEMP_DIR.glob(pat), key=lambda p: p.stat().st_mtime, reverse=True)
        if files:
            path = str(files[0])
            return FileResponse(path, media_type="text/plain", filename=files[0].name)
    raise HTTPException(404, "Not found")


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
