import re
from datetime import date
from pathlib import Path

from langchain_deepseek import ChatDeepSeek
from langchain_core.messages import SystemMessage, HumanMessage
from tools import writer, OUT_DIR


_COMMON_RULES = """RULES:
- IMPORTANT: Match the format of the reference resume exactly
- Keep the same visual style (fonts, spacing, heading styles, section layout)
- 1-2 pages max
- Emphasize skills and experience matching the job requirements
- don't use projects if it doesnt fit the job description.
- Use job posting keywords naturally throughout
- ATS-friendly: no images, no columns, no fancy formatting
- Include: contact info, professional summary, skills, experience, education
- Tailor the professional summary to the specific job, use easy to understand professional language
- Reorder skills/experience to highlight what the job wants most
- Never fabricate experience or skills not present in the reference resume"""

SYSTEM_PROMPT_TYPST = f"""You are a resume writer specialized in Typst (.typ) format. Write resumes using Typst markup, matching the reference resume's style.

You have:
1. RESUME SOURCE — reference for style, formatting, layout, Typst functions used, and the user's actual background (experience, skills, education).
2. JOB POSTING ANALYSIS — structured breakdown of job requirements.

{_COMMON_RULES}

TYPST NOTES:
- Use Typst-native functions: #set text(), #set par(), #v(), #h(), #grid(), #align()
- Use only standard fonts available on most systems: "DejaVu Sans", "DejaVu Serif", "DejaVu Sans Mono", "C059" (do NOT use "IBM Plex Sans", "Libertinus", or other niche fonts)
- Write email addresses wrapped in `#text("...")` to prevent Typst from interpreting `@` as a label: `#text("john@example.com")`

You MUST use the `writer` tool to save the file. First identify the position title and company name from the job analysis, then use them in the filename."""

SYSTEM_PROMPT_LATEX = f"""You are a resume writer specialized in LaTeX (.tex) format. Write resumes using LaTeX, matching the reference resume's style.

You have:
1. RESUME SOURCE — reference for style, formatting, layout, document class, packages, and the user's actual background (experience, skills, education).
2. JOB POSTING ANALYSIS — structured breakdown of job requirements.

{_COMMON_RULES}

LATEX NOTES:
- Use standard packages: geometry, enumitem, titlesec, hyperref, fontenc, inputenc
- Avoid fragile commands that may break compilation

You MUST use the `writer` tool to save the file. First identify the position title and company name from the job analysis, then use them in the filename."""


def _sanitize(s: str) -> str:
    s = re.sub(r'[^a-zA-Z0-9]+', '_', s).strip('_').lower()
    return s[:40]


def _fallback_name(analysis: str, today: str, ext: str) -> str:
    position = "resume"
    company = "company"
    for line in analysis.split("\n"):
        l = line.lower()
        if "job title" in l or "position" in l:
            m = re.search(r':\s*(.+)', line)
            if m:
                position = m.group(1).strip()
        if "company" in l:
            m = re.search(r':\s*(.+)', line)
            if m:
                company = m.group(1).strip()
    position = _sanitize(position) or "resume"
    company = _sanitize(company) or "company"
    return f"{position}_{company}_{today}{ext}"


def write_resume(
    resume_content: str,
    analysis: str,
    fmt: str = "typst",
    model_name: str = "deepseek-chat",
) -> str:
    system_prompt = SYSTEM_PROMPT_TYPST if fmt == "typst" else SYSTEM_PROMPT_LATEX
    ext = ".typ" if fmt == "typst" else ".tex"
    fmt_name = "Typst" if fmt == "typst" else "LaTeX"
    today = date.today().isoformat()

    model = ChatDeepSeek(model=model_name)
    model_with_tools = model.bind_tools([writer])

    response = model_with_tools.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"""Write a tailored {fmt_name} resume using the reference resume and job analysis below.

RESUME SOURCE (use this for style, formatting, and the user's actual background):
--- resume{ext} ---
{resume_content[:6000]}
--- end resume ---

JOB POSTING ANALYSIS:
{analysis}

First, identify the position title and company from the analysis. Then call the `writer` tool with:
- filename: "<position>_<company>_{today}{ext}" (sanitized: lowercase, underscores, no special chars)
- content: the complete resume source code"""),
    ])

    if response.tool_calls:
        for tc in response.tool_calls:
            if tc["name"] == "writer":
                writer.invoke(tc["args"])
                filename = tc["args"]["filename"]
                return str(OUT_DIR / filename)

    fallback = _fallback_name(analysis, today, ext)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source_path = OUT_DIR / fallback
    source_path.write_text(str(response.content))
    return str(source_path)
