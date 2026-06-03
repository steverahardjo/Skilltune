from langchain_core.tools import tool
from pathlib import Path
import csv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
OUT_DIR = BASE_DIR / "temp"
CSV_PATH = OUT_DIR / "applications.csv"


@tool
def writer(filename: str, content: str) -> str:
    """Write the Typst resume source code to a local .typ file.
    Use this to persist the tailored resume before compiling it.

    Args:
        filename: Filename for the output (e.g. 'cloudscale_swe.typ')
        content: The complete Typst source code to write
    """
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = OUT_DIR / filename
    filepath.write_text(content)
    size = filepath.stat().st_size
    return f"Written {size} bytes to {filepath}"


@tool
def write_csv(company: str, role: str, date: str, score: str, typ_path: str, pdf_path: str, notes: str) -> str:
    """Append a row to the applications CSV file. All fields are strings.

    Args:
        company: Company name
        role: Job title/role
        date: Date applied (YYYY-MM-DD)
        score: Match score (e.g. '7/10')
        typ_path: Path to the .typ resume file
        pdf_path: Path to the compiled PDF (or 'none')
        notes: Any additional notes about the application
    """
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    exists = CSV_PATH.exists()
    with open(CSV_PATH, "a", newline="") as f:
        w = csv.writer(f)
        if not exists:
            w.writerow(["company", "role", "date", "score", "typ_path", "pdf_path", "notes"])
        w.writerow([company, role, date, score, typ_path, pdf_path, notes])
    return f"Logged application: {company} — {role} ({date})"
