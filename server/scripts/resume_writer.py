"""CLI entrypoint for the resume-writer agent.

Usage:
    bunx python scripts/resume_writer.py <resume> <analysis> [--out-dir DIR] [--open]
    bunx python scripts/resume_writer.py resume.typ analysis.txt --open
    bunx python scripts/resume_writer.py resume.tex analysis.txt -o ./output
"""

import argparse
import os
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.resume_writer import write_resume


def detect_format(content: str, ext: str) -> str:
    if "\\documentclass" in content or "\\begin{document}" in content:
        return "latex"
    if "#set " in content or "#let " in content or "#show " in content:
        return "typst"
    return "typst" if ext == ".typ" else "latex"


def compile_pdf(source_path: Path, fmt: str) -> Path | None:
    pdf_path = source_path.with_suffix(".pdf")
    try:
        if fmt == "typst":
            result = subprocess.run(
                ["typst", "compile", str(source_path), str(pdf_path)],
                capture_output=True, text=True, timeout=30,
            )
        else:
            result = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode",
                 "-output-directory", str(source_path.parent), str(source_path.name)],
                capture_output=True, text=True, timeout=30,
                cwd=str(source_path.parent),
            )
        if pdf_path.exists():
            return pdf_path
        print(f"  Compile failed:\n{result.stderr[:500]}")
    except Exception as e:
        print(f"  Compile error: {e}")
    return None


def main():
    parser = argparse.ArgumentParser(description="Generate a tailored resume using AI")
    parser.add_argument("resume", help="Path to the reference resume file (.typ or .tex)")
    parser.add_argument("analysis", help="Path to the job posting analysis file (.txt)")
    parser.add_argument("-o", "--out-dir", default=None, help="Output directory (default: parent of input file)")
    parser.add_argument("--open", "-O", action="store_true", help="Open the PDF after compilation")
    args = parser.parse_args()

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("DEEPSEEK_API_KEY not set.")
        sys.exit(1)

    resume_path = Path(args.resume)
    analysis_path = Path(args.analysis)

    if not resume_path.exists():
        print(f"Resume file not found: {resume_path}")
        sys.exit(1)
    if not analysis_path.exists():
        print(f"Analysis file not found: {analysis_path}")
        sys.exit(1)

    resume_content = resume_path.read_text().strip()
    analysis = analysis_path.read_text().strip()
    ext = resume_path.suffix.lower()

    fmt = detect_format(resume_content, ext)
    fmt_name = "Typst" if fmt == "typst" else "LaTeX"

    out_dir = Path(args.out_dir) if args.out_dir else resume_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    today = date.today().isoformat()
    out_name = f"tailored_resume_{today}{ext}"
    out_path = out_dir / out_name

    print(f"Resume: {len(resume_content)} chars  |  Analysis: {len(analysis)} chars")
    print(f"Format: {fmt_name}  |  Output: {out_path}\n")

    T0 = time.time()

    print("── Generating resume ──")
    content = write_resume(resume_content, analysis, fmt=fmt)

    out_path.write_text(content)
    elapsed = (time.time() - T0) * 1000
    lines = len(content.splitlines())
    print(f"  {elapsed:.0f}ms  |  {len(content)} bytes, {lines} lines\n")

    print("── Compiling PDF ──")
    pdf = compile_pdf(out_path, fmt)
    if pdf:
        print(f"  PDF: {pdf} ({pdf.stat().st_size} bytes)")
        if args.open:
            import subprocess
            subprocess.run(["xdg-open", str(pdf)], check=False)
    else:
        print("  PDF: not compiled")

    print(f"\nDone in {elapsed:.0f}ms")
    print(f"  Source: {out_path}")
    print(f"  PDF:    {pdf if pdf else 'n/a'}")


if __name__ == "__main__":
    main()
