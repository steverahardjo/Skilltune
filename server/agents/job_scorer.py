from dataclasses import dataclass, field
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS
from sklearn.metrics.pairwise import cosine_similarity

from langchain_deepseek import ChatDeepSeek
from langchain_core.messages import SystemMessage, HumanMessage


@dataclass
class JobScore:
    score: int
    similarity_pct: int
    key_matches: list[str]
    key_missing: list[str]
    strengths: list[str]
    gaps: list[str]
    suggestions: list[str]
    summary: str


def _preprocess(text: str) -> str:
    return " ".join(
        w.lower() for w in text.split()
        if w.lower() not in ENGLISH_STOP_WORDS and len(w) > 1
    )


def compute_semantic(resume: str, job: str) -> tuple[float, list[str], list[str]]:
    rp = _preprocess(resume)
    jp = _preprocess(job)

    vec = TfidfVectorizer(ngram_range=(1, 2), max_features=500, stop_words="english")
    tfidf = vec.fit_transform([rp, jp])

    sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]

    fn = vec.get_feature_names_out()
    rv = tfidf[0].toarray()[0]
    jv = tfidf[1].toarray()[0]
    r_terms = {fn[i] for i in rv.argsort()[-30:] if rv[i] > 0 and fn[i] in jp}
    j_terms = {fn[i] for i in jv.argsort()[-30:] if jv[i] > 0 and fn[i] not in rp}
    matches = sorted(r_terms & j_terms)
    missing = sorted(j_terms - r_terms)

    return (round(sim * 100, 1), matches, missing)


def score_job(resume_path: str, job_analysis: str) -> JobScore:
    resume = Path(resume_path).read_text()

    similarity_pct, key_matches, key_missing = compute_semantic(resume, job_analysis)

    model = ChatDeepSeek(model="deepseek-chat")

    prompt = f"""Score this resume against the job posting. Below are TF-IDF semantic metrics computed from both texts — use them as a signal, then do your own qualitative evaluation.

SEMANTIC METRICS:
- TF-IDF cosine similarity: {similarity_pct}%
- Top matching keywords: {', '.join(key_matches[:15]) if key_matches else 'none'}
- Keywords in job but missing in resume: {', '.join(key_missing[:15]) if key_missing else 'none'}

RESUME:
--- resume ---
{resume[:5000]}
--- end resume ---

JOB POSTING ANALYSIS:
{job_analysis[:4000]}

Return a concise evaluation with these exact sections:

Score: X/10

Strengths:
- bullet points

Gaps:
- bullet points

Suggestions:
- bullet points

Summary: one sentence overall"""

    print(f"\n[job-scorer] Prompt ({len(prompt)} chars, sim={similarity_pct}%)")
    print(f"[job-scorer] Matches: {key_matches[:8]}")
    print(f"[job-scorer] Missing: {key_missing[:8]}")

    response = model.invoke([
        SystemMessage(content="You score resume-job fit. Use the TF-IDF data as a guide, then do your own deeper semantic analysis. Be specific name tools and skills. Be honest about gaps."),
        HumanMessage(content=prompt),
    ])

    text = str(response.content)
    score = 0
    strengths: list[str] = []
    gaps: list[str] = []
    suggestions: list[str] = []
    summary = ""
    section: str | None = None

    for line in text.split("\n"):
        s = line.strip()
        if not s:
            continue
        lower = s.lower()
        if lower.startswith("score:") and "/" in lower:
            try:
                score = int(lower.split("/")[0].split(":")[1].strip())
            except (ValueError, IndexError):
                pass
        elif lower.startswith("strengths:"):
            section = "strengths"
        elif lower.startswith("gaps:"):
            section = "gaps"
        elif lower.startswith("suggestions:"):
            section = "suggestions"
        elif lower.startswith("summary:"):
            summary = s.split(":", 1)[1].strip()
            section = None
        elif section and s.startswith(("-", "*", "•")):
            item = s.lstrip("-*• ").strip()
            if item:
                (strengths if section == "strengths" else
                 gaps if section == "gaps" else
                 suggestions).append(item)

    return JobScore(
        score=score or 5,
        similarity_pct=int(similarity_pct),
        key_matches=key_matches[:15],
        key_missing=key_missing[:15],
        strengths=strengths or ["Resume contains relevant experience"],
        gaps=gaps or ["Unable to identify specific gaps"],
        suggestions=suggestions or ["Tailor resume to emphasize matched skills"],
        summary=summary or "Resume shows relevant background for this role.",
    )
