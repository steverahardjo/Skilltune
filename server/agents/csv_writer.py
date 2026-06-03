from langchain_deepseek import ChatDeepSeek
from langgraph.prebuilt import create_react_agent
from tools import write_csv

SYSTEM_PROMPT = """You log job applications to a CSV file. You receive:
1. A job summary — contains company name, role, requirements
2. A date — today's date in YYYY-MM-DD format

WORKFLOW:
1. Extract the company name and role from the job summary
2. Call the write_csv tool with:
   - company: extracted company name
   - role: extracted job title
   - date: the provided date
   - score: empty string (leave as "")
   - typ_path: empty string
   - pdf_path: empty string
   - notes: empty string
3. Confirm the log was written"""


def create_csv_agent(model_name: str = "deepseek-chat"):
    model = ChatDeepSeek(model=model_name)
    return create_react_agent(
        model=model,
        tools=[write_csv],
        prompt=SYSTEM_PROMPT,
    )
