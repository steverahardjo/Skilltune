from langchain_deepseek import ChatDeepSeek
from langchain_core.messages import SystemMessage, HumanMessage

SYSTEM_PROMPT = """Analyze the job posting text and return a structured summary. Include:
- Job title and company
- Required skills (as a list)
- Preferred/nice-to-have skills
- Key responsibilities
- Experience level
- Education requirements
- Location type (remote/hybrid/on-site)
- Salary range if mentioned
- A 2-3 sentence summary of the role

Format the output as clean, readable text. Be concise."""


def create_posting_agent(model_name: str = "deepseek-chat") -> ChatDeepSeek:
    return ChatDeepSeek(model=model_name)


def analyze_posting(model: ChatDeepSeek, job_text: str) -> str:
    response = model.invoke(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Analyze this job posting:\n\n{job_text}"),
        ]
    )
    return str(response.content)
