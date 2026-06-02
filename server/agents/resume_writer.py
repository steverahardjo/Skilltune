from langchain_deepseek import ChatDeepSeek
from langgraph.prebuilt import create_react_agent
from langchain_community.tools import ShellTool
from tools import writer

SYSTEM_PROMPT = """You are a resume writer specializing in Typst formatting. You have access to:

1. A RESUME SKILL — a structured summary of the user's professional background
   (skills, experience, education, projects, target alignment).
   This is the source of truth. Use it to understand the person you're writing for.

2. A JOB POSTING ANALYSIS — a structured breakdown of the job requirements
   (required skills, responsibilities, experience level, etc.).

3. TOOLS:
   - writer: Write the final Typst source to a .typ file
   - terminal: Run shell commands (use "typst compile <file>.typ <file>.pdf" to compile)

WORKFLOW:
1. Read the RESUME SKILL to understand the person's background
2. Read the JOB POSTING ANALYSIS to understand what the employer wants
3. Write a tailored Typst resume that maps the person's background to the job
4. Use the writer tool to save the .typ file
5. Use the terminal tool to run: typst compile <path>/tailored_resume.typ <path>/tailored_resume.pdf
6. Report the file paths

RULES:
- Use clean Typst: #set page, #set text(font: ...), #heading, #grid, #table
- 1-2 pages max
- Emphasize skills and experience matching the job requirements
- Use job posting keywords naturally throughout
- ATS-friendly: no images, no columns, no fancy formatting
- Include: contact info, professional summary, skills, experience, education
- Tailor the professional summary to the specific job
- Reorder skills/experience to highlight what the job wants most
- Never fabricate experience or skills not present in the RESUME SKILL
- Write the .typ file FIRST, then compile it
- Use filename: tailored_resume.typ"""


def create_resume_agent(model_name: str = "deepseek-chat"):
    model = ChatDeepSeek(model=model_name)
    shell = ShellTool()
    return create_react_agent(
        model=model,
        tools=[writer, shell],
        prompt=SYSTEM_PROMPT,
    )
