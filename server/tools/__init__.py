from langchain_core.tools import tool
from pathlib import Path
import os

OUT_DIR = Path(os.getcwd()) / ".mastra" / "output"


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


@tool
def typst_compile(file_path: str) -> str:
    """Compile a .typ file to PDF using the Typst CLI.
    The typst binary must be installed on the system.
    Use this after writing the resume to verify it compiles.

    Args:
        file_path: Absolute path to the .typ file to compile
    """
    import subprocess

    pdf_path = file_path.replace(".typ", ".pdf")
    result = subprocess.run(
        ["typst", "compile", file_path, pdf_path],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return f"Compiled successfully → {pdf_path}"
    return f"Compilation failed: {result.stderr[:500]}"
