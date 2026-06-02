"""Test the resume-writer pipeline end-to-end.

Usage:
    python3 server/scripts/test_writer.py
    python3 server/scripts/test_writer.py resume.typ job.txt "Name" "Role" "Industry"
"""

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.posting_analysis import create_posting_agent, analyze_posting
from agents.resume_writer import create_resume_agent
from skills.skill_manager import create_skill, get_skill_content
from langchain_core.messages import HumanMessage

SAMPLE_RESUME = """
John Doe
john@example.com | (555) 123-4567 | github.com/johndoe

PROFESSIONAL SUMMARY
Senior Software Engineer with 8+ years building scalable web apps and distributed systems.
Expertise in TypeScript, React, Node.js, and AWS/GCP cloud infrastructure.
Led teams of 4-8 engineers delivering products used by millions.

SKILLS
TypeScript, JavaScript, Python, Go, Rust, SQL, React, Next.js, Vue, Tailwind, GraphQL,
Node.js, Express, Fastify, Bun, PostgreSQL, MongoDB, Redis, Kafka, AWS Lambda/ECS/S3/RDS,
GCP Cloud Run, Docker, Kubernetes, Terraform, GitHub Actions, Datadog, TDD, CI/CD

EXPERIENCE
Staff Software Engineer — Acme Corp (2022–Present)
- Architected real-time analytics pipeline processing 500K events/sec with Kafka + ClickHouse
- Led migration of 12 microservices to ECS Fargate, cutting infra costs by 40%
- Mentored 6 engineers; introduced RFC process and architecture decision records

Senior Software Engineer — TechStart Inc. (2019–2022)
- Built customer-facing dashboard with React/Next.js serving 50K DAU
- Designed GraphQL federation layer across 8 backend services
- Established CI/CD pipelines reducing deploy time from 2h to 15min

Software Engineer — DataFlow Systems (2016–2019)
- Developed ETL pipelines processing financial data from 20+ sources
- Built internal CLI tools in Python and Go; contributed PRs to Prisma and Zod

EDUCATION
B.S. Computer Science — UC Berkeley (2012–2016), GPA 3.7

PROJECTS
- Maintainer of "typed-routes" (2K stars) — type-safe routing library
- CLI tool for automated API documentation generation (500+ weekly npm downloads)

CERTIFICATIONS
AWS Solutions Architect Professional, CKAD
"""

SAMPLE_JOB = """
Senior Software Engineer — Platform Team | CloudScale | Remote (US/Canada)

CloudScale is a Series C startup building next-gen cloud infrastructure management.
500+ enterprise customers.

What You'll Do:
- Design distributed systems handling millions of concurrent operations
- Build APIs/SDKs in TypeScript/Go consumed by 500+ enterprise teams
- Drive architecture decisions for event-driven microservices platform
- Improve observability: distributed tracing, structured logging, SLO-based alerting
- Mentor junior engineers; lead technical design reviews
- Contribute to open-source CLI and Terraform provider

Requirements:
- 5+ years software engineering experience
- Strong TypeScript and Go (or Rust)
- Distributed systems at scale
- Deep AWS, GCP, or Azure knowledge
- Kubernetes, ECS, or similar container orchestration
- Kafka, NATS, or similar event-driven architectures
- Excellent written communication (remote-first, async culture)

Nice to Have:
- Terraform, Pulumi, or CDK experience
- Open-source contributions
- Developer tools / CLI / SDK experience
- OpenTelemetry, Datadog, or Honeycomb knowledge
- Multi-cloud architectures

Tech Stack: TypeScript, Go, Rust, React, Kafka, PostgreSQL, Redis, Kubernetes, Terraform,
AWS/GCP/Azure, OpenTelemetry, GitHub Actions

Compensation: $180K–$230K + equity + benefits
"""


def ms(n: float) -> str:
    if n < 1000:
        return f"{n:.0f}ms"
    if n < 60000:
        return f"{n / 1000:.1f}s"
    return f"{n / 60000:.1f}m"


def tok(n: int) -> str:
    if n < 1000:
        return str(n)
    return f"{n / 1000:.1f}K"


def main():
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("DEEPSEEK_API_KEY not set.")
        sys.exit(1)
    os.environ["DEEPSEEK_API_KEY"] = api_key

    resume_path = sys.argv[1] if len(sys.argv) > 1 else None
    job_path = sys.argv[2] if len(sys.argv) > 2 else None
    name = sys.argv[3] if len(sys.argv) > 3 else "John Doe"
    target_roles = sys.argv[4] if len(sys.argv) > 4 else "Senior Software Engineer"
    industry = sys.argv[5] if len(sys.argv) > 5 else "Cloud Infrastructure"

    resume = Path(resume_path).read_text() if resume_path else SAMPLE_RESUME
    job = Path(job_path).read_text() if job_path else SAMPLE_JOB

    print(f"Resume: {len(resume)} chars  |  Job: {len(job)} chars")
    print(f"Name: {name}  |  Target: {target_roles}  |  Industry: {industry}\n")

    T0 = time.time()

    # ── Phase 1: Create SKILL ──
    print("── Phase 1: Create resume SKILL ──")
    t1 = time.time()
    model = create_posting_agent()
    skill = create_skill(model, resume, name, target_roles, industry)
    skill_content = get_skill_content()
    skill_len = len(skill_content) if skill_content else 0
    print(f"  {ms((time.time() - t1) * 1000)}  |  {skill_len} chars")

    # ── Phase 2: Analyze posting ──
    print("── Phase 2: Analyze job posting ──")
    t2 = time.time()
    analysis = analyze_posting(model, job)
    print(f"  {ms((time.time() - t2) * 1000)}  |  {len(analysis)} chars")
    preview = " | ".join(analysis.split("\n")[:3])
    print(f"  Preview: {preview[:120]}")

    # ── Phase 3: Write resume ──
    print("── Phase 3: Write tailored resume ──")
    t3 = time.time()

    agent = create_resume_agent()
    prompt = f"""Write a tailored Typst resume using the RESUME SKILL and JOB ANALYSIS below.
Use your tools to write the .typ file and compile it.

RESUME SKILL (the person's professional profile — source of truth):
--- skill ---
{skill_content}
--- end skill ---

JOB POSTING ANALYSIS:
{analysis}

Follow the workflow:
1. Study the RESUME SKILL and JOB ANALYSIS
2. Write a tailored Typst resume matching the job
3. Use the writer tool to save it as "tailored_resume.typ"
4. Use the typst_compile tool to compile it to PDF
5. Confirm the file paths"""

    result = agent.invoke({"messages": [HumanMessage(content=prompt)]})
    messages = result["messages"]
    final = str(messages[-1].content if messages else "")

    # Show tool calls
    for msg in messages:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                name = tc.get("name", "?")
                args = str(tc.get("args", ""))[:100]
                print(f"    [tool_call] {name}({args})")
        if hasattr(msg, "name") and msg.name:
            print(f"    [tool_result] {msg.name}: {str(msg.content)[:120]}")

    print(f"  {ms((time.time() - t3) * 1000)}  |  {len(final)} chars")
    print(f"  Final: {final[:200]}...")

    # ── Phase 4: Output files ──
    print("── Phase 4: Output files ──")
    out_dir = Path(os.getcwd()) / ".mastra" / "output"
    typ_file = out_dir / "tailored_resume.typ"
    pdf_file = out_dir / "tailored_resume.pdf"

    typ_bytes = typ_file.stat().st_size if typ_file.exists() else 0
    typ_lines = len(typ_file.read_text().splitlines()) if typ_file.exists() else 0
    pdf_bytes = pdf_file.stat().st_size if pdf_file.exists() else 0

    print(f"  tailored_resume.typ: {typ_bytes} bytes, {typ_lines} lines")
    print(f"  tailored_resume.pdf: {'{} bytes'.format(pdf_bytes) if pdf_bytes else 'not compiled'}")

    # ── Summary ──
    total_ms = (time.time() - T0) * 1000
    print(f"\n{'═' * 45}")
    print(f"           PERFORMANCE SUMMARY")
    print(f"{'═' * 45}")
    print(f"  Total time:       {ms(total_ms)}")
    print(f"  .typ size:        {typ_bytes} bytes ({typ_lines} lines)")
    print(f"  .pdf:             {'compiled' if pdf_bytes else 'not compiled'}")
    print(f"  Output dir:       {out_dir}")


if __name__ == "__main__":
    main()
