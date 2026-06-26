import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import app, TEMP_DIR


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_resume_typ():
    return """#set text(font: "DejaVu Sans", size: 11pt)
#set page(margin: 0.8in)
#set par(leading: 0.6em)

= John Doe
#set align(center)
john@example.com | (555) 123-4567
#set align(left)

== Professional Summary
Senior Software Engineer with 8+ years building scalable web apps and distributed systems.

== Skills
#set par(leading: 0.4em)
- TypeScript, JavaScript, Python, Go, Rust
- React, Next.js, Node.js, Express
- PostgreSQL, MongoDB, Redis, Kafka
- AWS Lambda/ECS/S3, Docker, Kubernetes

== Experience
=== Staff Software Engineer — Acme Corp (2022-Present)
- Architected real-time analytics pipeline with Kafka + ClickHouse
- Led migration of 12 microservices to ECS Fargate
- Mentored 6 engineers; introduced RFC process

=== Senior Software Engineer — TechStart Inc. (2019-2022)
- Built customer-facing dashboard with React/Next.js
- Designed GraphQL federation layer across 8 backend services

== Education
B.S. Computer Science — UC Berkeley (2012-2016)
"""


@pytest.fixture
def sample_resume_tex():
    return r"""\documentclass[11pt]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage{enumitem}

\begin{document}
\section*{John Doe}
john@example.com | (555) 123-4567

\section*{Professional Summary}
Senior Software Engineer with 8+ years building scalable web apps.

\section*{Skills}
\begin{itemize}[noitemsep]
    \item TypeScript, JavaScript, Python, Go, Rust
    \item React, Next.js, Node.js, Express
    \item PostgreSQL, MongoDB, Redis, Kafka
    \item AWS Lambda/ECS/S3, Docker, Kubernetes
\end{itemize}

\section*{Experience}
\subsection*{Staff Software Engineer — Acme Corp (2022-Present)}
\begin{itemize}[noitemsep]
    \item Architected real-time analytics pipeline with Kafka + ClickHouse
    \item Led migration of 12 microservices to ECS Fargate
\end{itemize}

\section*{Education}
B.S. Computer Science — UC Berkeley (2012-2016)
\end{document}
"""


@pytest.fixture
def sample_job_analysis():
    return """Job Title: Senior Software Engineer
Company: CloudScale
Location: Remote (US/Canada)

Required Skills:
- TypeScript, Go or Rust
- Distributed systems at scale
- AWS, GCP, or Azure
- Kubernetes/ECS
- Kafka or similar event-driven architectures

Responsibilities:
- Design distributed systems handling millions of concurrent operations
- Build APIs/SDKs in TypeScript/Go
- Drive architecture decisions for event-driven microservices platform
- Improve observability and monitoring

Experience Level: 5+ years
Salary: $180K-$230K + equity"""


@pytest.fixture
def typst_file(sample_resume_typ, tmp_path):
    path = tmp_path / "test_resume.typ"
    path.write_text(sample_resume_typ)
    return str(path)


@pytest.fixture
def tex_file(sample_resume_tex, tmp_path):
    path = tmp_path / "test_resume.tex"
    path.write_text(sample_resume_tex)
    return str(path)


@pytest.fixture(autouse=True)
def cleanup_temp():
    yield
    if TEMP_DIR.exists():
        for f in TEMP_DIR.glob("*"):
            try:
                f.unlink()
            except OSError:
                pass
