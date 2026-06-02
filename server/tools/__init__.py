from langchain_core.tools import tool
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
OUT_DIR = BASE_DIR / ".mastra" / "output"


@tool
def writer(filename: str, content: str) -> str:
    """Write the Typst resume source code to a local .typ file.
    Use this to persist the tailored resume before compiling it.

    Args:
        filename: Filename for the output (e.g. 'tailored_resume.typ')
        content: The complete Typst source code to write
    """
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = OUT_DIR / filename
    filepath.write_text(content)
    size = filepath.stat().st_size
    return f"Written {size} bytes to {filepath}"
