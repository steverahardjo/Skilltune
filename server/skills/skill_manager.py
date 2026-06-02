from langchain_deepseek import ChatDeepSeek
from langchain_core.messages import SystemMessage, HumanMessage
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SKILL_DIR = BASE_DIR / ".mastra" / "skills"
SKILL_FILE = SKILL_DIR / "resume-skill.md"


def build_skill_prompt(
    resume_content: str, name: str, target_roles: str, industry: str
) -> str:
    return f"""Extract a structured summary of this person's professional profile from their resume.
Output the result as a SKILL.md file — a concise, structured document that another agent
can use to understand this person's background when tailoring resumes.

NAME: {name}
TARGET ROLES: {target_roles}
INDUSTRY: {industry}

RESUME CONTENT:
--- resume ---
{resume_content[:5000]}
--- end resume ---

Produce the SKILL.md. Include these sections as level-2 headings (##):

1. ## Professional Summary — one paragraph covering seniority, expertise, and target roles
2. ## Core Skills — categorized list of technical skills, tools, and domains
3. ## Work Experience — concise entries with: company, title, dates, 1-2 line highlights
4. ## Education — degrees, certificates, relevant coursework
5. ## Key Projects / Achievements — notable projects, publications, awards
6. ## Target Alignment — how this person's background maps to their target roles/industry

Keep it compact — the full document should be under 1500 words.
Focus on facts from the resume. Do not fabricate or embellish.
Output ONLY the SKILL.md content (no preamble, no markdown fences)."""


def get_skill_content() -> str | None:
    try:
        return SKILL_FILE.read_text().strip() or None
    except FileNotFoundError:
        return None


def save_skill(content: str) -> str:
    SKILL_DIR.mkdir(parents=True, exist_ok=True)
    SKILL_FILE.write_text(content)
    return str(SKILL_FILE)


def create_skill(
    model: ChatDeepSeek,
    resume_content: str,
    name: str,
    target_roles: str,
    industry: str,
) -> str:
    prompt = build_skill_prompt(resume_content, name, target_roles, industry)
    response = model.invoke(
        [
            SystemMessage(content="You extract structured professional profiles from resumes."),
            HumanMessage(content=prompt),
        ]
    )
    content = str(response.content)
    save_skill(content)
    return content
