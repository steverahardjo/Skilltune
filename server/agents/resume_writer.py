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

def _build_system_prompt(fmt: str, resume_content: str) -> str:
    typst_prompt = f"""You are a resume writer specialized in Typst (.typ) format. Write resumes using Typst markup, matching the reference resume's style.

You have access to the `writer` tool to save the generated resume source code to a file.

Here is the reference resume — study its style, formatting, layout, Typst functions used, and the person's actual background (experience, skills, education):

--- REFERENCE RESUME ---
{resume_content}
--- END REFERENCE RESUME ---

{_COMMON_RULES}

TYPST NOTES:
- Use Typst-native functions: #set text(), #set par(), #v(), #h(), #grid(), #align()
- Use only standard fonts available on most systems: "DejaVu Sans", "DejaVu Serif", "DejaVu Sans Mono", "C059" (do NOT use "IBM Plex Sans", "Libertinus", or other niche fonts)
- Write email addresses wrapped in `#text("...")` to prevent Typst from interpreting `@` as a label: `#text("john@example.com")`"""

    latex_prompt = f"""You are a resume writer specialized in LaTeX (.tex) format. Write resumes using LaTeX, matching the reference resume's style.

You have access to the `writer` tool to save the generated resume source code to a file.

Here is the reference resume — study its style, formatting, layout, document class, packages, and the person's actual background (experience, skills, education):

--- REFERENCE RESUME ---
{resume_content}
--- END REFERENCE RESUME ---

{_COMMON_RULES}

LATEX NOTES:
- Use standard packages: geometry, enumitem, titlesec, hyperref, fontenc, inputenc
- Avoid fragile commands that may break compilation"""

    return typst_prompt if fmt == "typst" else latex_prompt


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
    system_prompt = _build_system_prompt(fmt, resume_content)
    ext = ".typ" if fmt == "typst" else ".tex"
    fmt_name = "Typst" if fmt == "typst" else "LaTeX"
    today = date.today().isoformat()

    model = ChatDeepSeek(model=model_name)
    model_with_tools = model.bind_tools([writer])

    response = model_with_tools.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"""Write a tailored {fmt_name} resume for the job described in the analysis below.

JOB POSTING ANALYSIS:
{analysis}

Steps:
1. Identify the position title and company from the analysis
2. Use the `writer` tool with:
   - filename: "<position>_<company>_{today}{ext}" (sanitized: lowercase, underscores, no special chars)
   - content: the complete tailored resume source code"""),
    ])

    if response.tool_calls:
        filename = None
        for tc in response.tool_calls:
            if tc["name"] == "writer":
                writer.invoke(tc["args"])
                filename = tc["args"]["filename"]
        if filename:
            return str(OUT_DIR / filename)

    fallback = _fallback_name(analysis, today, ext)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source_path = OUT_DIR / fallback
    source_path.write_text(str(response.content))
    return str(source_path)
