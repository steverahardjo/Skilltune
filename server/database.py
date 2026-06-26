import sqlite3
import re
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "scan_results.db"


def _conn():
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    return c


def init_db():
    c = _conn()
    c.execute("""
        CREATE TABLE IF NOT EXISTS scan_results (
            link TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            typst_syntax TEXT NOT NULL DEFAULT '',
            analysis TEXT NOT NULL DEFAULT '',
            login_type TEXT DEFAULT 'jd',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.commit()
    c.close()


def truncate_jd_link(url: str) -> str:
    m = re.match(r'(https?://[^/]+/job/[^/]+)/.+', url)
    return m.group(1) if m else url


def save_scan(link: str, date: str, typst_syntax: str, analysis: str = "", login_type: str = "jd"):
    if login_type == "jd":
        link = truncate_jd_link(link)
    c = _conn()
    c.execute(
        "INSERT OR REPLACE INTO scan_results (link, date, typst_syntax, analysis, login_type) VALUES (?,?,?,?,?)",
        (link, date, typst_syntax, analysis, login_type)
    )
    c.commit()
    c.close()


def get_scan(link: str, login_type: str = "jd"):
    if login_type == "jd":
        link = truncate_jd_link(link)
    c = _conn()
    row = c.execute(
        "SELECT * FROM scan_results WHERE link = ? ORDER BY created_at DESC LIMIT 1",
        (link,)
    ).fetchone()
    c.close()
    return dict(row) if row else None


def get_all_scans():
    c = _conn()
    rows = c.execute("SELECT * FROM scan_results ORDER BY created_at DESC").fetchall()
    c.close()
    return [dict(r) for r in rows]
