"""API tests for the Skilltune backend.

Run with:  cd server && python -m pytest tests/ -v
Skip slow:  cd server && SKIP_AI=1 python -m pytest tests/ -v
"""

import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ── Helpers ──

def need_api_key():
    return bool(os.environ.get("DEEPSEEK_API_KEY"))

requires_ai = pytest.mark.skipif(
    os.environ.get("SKIP_AI") or not need_api_key(),
    reason="Set DEEPSEEK_API_KEY and unset SKIP_AI to run AI tests",
)


# ── Health ──

class TestHealth:
    def test_get(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_post(self, client):
        r = client.post("/api/health")
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ── Format Detection ──

class TestFormatDetection:
    """Test the source-content-based format detection logic extracted from app.py."""

    def _detect(self, content: str, ext: str = ".typ") -> str:
        if "\\documentclass" in content or "\\begin{document}" in content:
            return "latex"
        elif "#set " in content or "#let " in content or "#show " in content:
            return "typst"
        else:
            return "typst" if ext == ".typ" else "latex"

    def test_typst_content(self):
        assert self._detect('#set text(font: "Arial")\n= Heading') == "typst"

    def test_typst_let(self):
        assert self._detect("#let heading = {}\nSome content") == "typst"

    def test_typst_show(self):
        assert self._detect('#show heading.where(level: 1):\n  set text(size: 18pt)') == "typst"

    def test_latex_documentclass(self):
        assert self._detect("\\documentclass[11pt]{article}\n\\begin{document}") == "latex"

    def test_latex_begin_document(self):
        assert self._detect("\\begin{document}\nHello\n\\end{document}") == "latex"

    def test_fallback_extension_typ(self):
        assert self._detect("Plain text resume\nNo markup", ext=".typ") == "typst"

    def test_fallback_extension_tex(self):
        assert self._detect("Plain text resume\nNo markup", ext=".tex") == "latex"


# ── Analyze Posting ──

class TestAnalyzePosting:
    @requires_ai
    def test_full(self, client, sample_job_analysis):
        r = client.post("/api/analyze-posting", json={"text": sample_job_analysis})
        assert r.status_code == 200
        data = r.json()
        assert "analysis" in data
        assert len(data["analysis"]) > 100


# ── Write Resume ──

class TestWriteResume:
    @requires_ai
    def test_typst(self, client, typst_file, sample_job_analysis):
        r = client.post("/api/write-resume", json={
            "resumePath": typst_file,
            "analysis": sample_job_analysis,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["sourcePath"]
        assert data["pdfPath"]
        assert data["message"]

    @requires_ai
    def test_latex(self, client, tex_file, sample_job_analysis):
        r = client.post("/api/write-resume", json={
            "resumePath": tex_file,
            "analysis": sample_job_analysis,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        assert data["sourcePath"]
        assert data["pdfPath"]


class TestWriteResumeErrors:
    def test_missing_file(self, client):
        r = client.post("/api/write-resume", json={
            "resumePath": "/nonexistent/file.typ",
            "analysis": "some analysis",
        })
        assert r.status_code == 400

    def test_no_api_key(self, client, typst_file):
        with patch.dict(os.environ, {}, clear=True):
            r = client.post("/api/write-resume", json={
                "resumePath": typst_file,
                "analysis": "test",
            })
        assert r.status_code in (400, 500)


# ── Download ──

class TestDownloads:
    def test_source_not_found(self, client):
        r = client.get("/api/download/source")
        assert r.status_code == 404

    def test_pdf_not_found(self, client):
        r = client.get("/api/download/pdf")
        assert r.status_code == 404

    @requires_ai
    def test_download_after_write(self, client, typst_file, sample_job_analysis):
        # First write a resume
        wr = client.post("/api/write-resume", json={
            "resumePath": typst_file,
            "analysis": sample_job_analysis,
        })
        assert wr.status_code == 200

        # Then download source
        r = client.get("/api/download/source")
        assert r.status_code == 200
        content_type = r.headers.get("content-type", "")
        assert "text/plain" in content_type
        assert len(r.content) > 0

        # Then download PDF
        r2 = client.get("/api/download/pdf")
        assert r2.status_code == 200
        assert "application/pdf" in r2.headers.get("content-type", "")
