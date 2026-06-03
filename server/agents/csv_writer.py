from langchain_deepseek import ChatDeepSeek
from langgraph.prebuilt import create_react_agent
from tools import write_csv

SYSTEM_PROMPT = """You are a CSV logger. You receive job application data and write it to a CSV file.

You have one tool:
- write_csv: Append a row to the applications CSV with company, role, date, score, file paths, and notes.

WORKFLOW:
1. Extract the company name and job role from the provided analysis text
2. Call write_csv with the extracted data plus the provided file paths and date
3. Confirm the row was written"""


def create_csv_agent(model_name: str = "deepseek-chat"):
    model = ChatDeepSeek(model=model_name)
    return create_react_agent(
        model=model,
        tools=[write_csv],
        prompt=SYSTEM_PROMPT,
    )
