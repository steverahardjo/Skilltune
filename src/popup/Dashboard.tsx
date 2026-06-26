import "./theme.css"
import { useState, useEffect } from "react"
import type { UserConfig, WriteResumeResponse, JobScoreResponse, ScanResult } from "../shared/types"
import { loadConfig } from "../shared/storage"
import {
  extractPageText,
  requestResumeWrite,
  requestPostingAnalysis,
  requestJobScore,
  resetSession,
  checkServerHealth,
  searchJobDesc,
} from "../shared/scan"

interface Props {
  onRescanSetup: () => void
}

export function Dashboard({ onRescanSetup }: Props) {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [result, setResult] = useState<WriteResumeResponse | null>(null)
  const [serverUp, setServerUp] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [jobScore, setJobScore] = useState<JobScoreResponse | null>(null)
  const [pageUrl, setPageUrl] = useState("")
  const [loadingOld, setLoadingOld] = useState(true)

  useEffect(() => {
    loadConfig().then(setConfig)
    checkServerHealth().then(setServerUp)
    extractPageText().then(page => {
      setPageUrl(page.url)
      return searchJobDesc(page.url, "jd")
    }).then(res => {
      if (res.found && res.data) {
        setAnalysis(res.data.analysis)
        if (res.data.typst_syntax) {
          setResult({
            success: true,
            sourcePath: "",
            pdfPath: null,
            message: res.data.typst_syntax,
          })
        }
      }
    }).catch(() => {}).finally(() => setLoadingOld(false))
  }, [])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError(null)
    setAnalysis(null)
    setResult(null)
    try {
      const page = await extractPageText()
      if (!page.text) throw new Error("No text found on this page")
      setPageUrl(page.url)
      const res = await requestPostingAnalysis(page.text, page.url, "jd")
      setAnalysis(res.analysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  const canWrite = !!analysis

  const handleWriteResume = async () => {
    if (!config?.resumeFile) {
      setError("No resume file configured.\n→ Run onboarding again (click the avatar icon above)")
      return
    }
    if (!analysis) {
      setError("No job posting analysis yet.\n→ Click 'Analyze posting' first")
      return
    }
    setWriting(true)
    setError(null)
    setResult(null)
    try {
      const res = await requestResumeWrite(config.resumeFile, analysis, pageUrl, "jd")
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Write resume failed")
    } finally {
      setWriting(false)
    }
  }

  const handleScoreMatch = async () => {
    if (!config?.resumeFile) return
    if (!analysis) return
    setScoring(true)
    setError(null)
    setJobScore(null)
    try {
      const res = await requestJobScore(config.resumeFile, analysis, pageUrl, "jd")
      setJobScore(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Score failed")
    } finally {
      setScoring(false)
    }
  }

  const handleDownloadPdf = () => {
    const a = document.createElement("a")
    a.href = "http://localhost:3721/api/download/pdf"
    a.download = "tailored_resume.pdf"
    a.click()
  }

  const handleReset = async () => {
    setError(null)
    setAnalysis(null)
    setResult(null)
    setJobScore(null)
    setConfig(null)
    await resetSession()
    onRescanSetup()
  }

  if (!config) return null

  return (
    <div className="g-pup">
      <div className="dash-header">
        <h1 className="dash-title">Skilltune <span className="logo-dot" /></h1>
        <button className="dash-avatar" onClick={onRescanSetup} title="Edit setup">
          {config.name.charAt(0).toUpperCase()}
        </button>
      </div>

      {!serverUp && (
        <div className="scan-error">
          <svg className="scan-error-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <span>Backend not running.<br/>Run <code style={{background:"rgba(0,0,0,0.08)",padding:"1px 4px",borderRadius:3}}>cd server && python3 app.py</code></span>
        </div>
      )}

      <button className="profile-btn" onClick={handleAnalyze} disabled={analyzing}>
        {analyzing ? (
          <>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Analyzing posting...
          </>
        ) : (
          <>
            <svg className="profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Analyze posting
          </>
        )}
      </button>

      <button
        className={`write-btn ${canWrite ? "" : "disabled"}`}
        onClick={handleWriteResume}
        disabled={writing || !canWrite}
      >
        {writing ? (
          <>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Writing resume...
          </>
        ) : (
          <>
            <svg className="write-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Write tailored resume
          </>
        )}
      </button>

      {error && (
        <div className="scan-error">
          <svg className="scan-error-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {analysis && (
        <div className="profile-result" style={{ borderColor: "#1a73e8" }}>
          <pre className="profile-text">{analysis}</pre>
        </div>
      )}

      {jobScore && (
        <div className="profile-result" style={{ borderColor: "#9333ea", background: "#faf5ff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "#9333ea",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 18
            }}>
              {jobScore.score}/10
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>Match Score</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {jobScore.similarityPct}% TF-IDF similarity
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#0d904f", marginBottom: 4 }}>Strengths</div>
            {jobScore.strengths.slice(0, 4).map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: "#333", paddingLeft: 8 }}>• {s}</div>
            ))}
          </div>

          {jobScore.gaps.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#c62828", marginBottom: 4 }}>Gaps</div>
              {jobScore.gaps.slice(0, 4).map((g, i) => (
                <div key={i} style={{ fontSize: 12, color: "#333", paddingLeft: 8 }}>• {g}</div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#1a73e8", marginBottom: 4 }}>Suggestions</div>
            {jobScore.suggestions.slice(0, 3).map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: "#333", paddingLeft: 8 }}>• {s}</div>
            ))}
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#666", fontStyle: "italic" }}>
            {jobScore.summary}
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {jobScore.keyMatches.slice(0, 12).map((s) => (
              <span key={s} style={{
                padding: "1px 6px", borderRadius: 4, fontSize: 11,
                background: "#d4edda", color: "#155724"
              }}>{s}</span>
            ))}
            {jobScore.keyMissing.slice(0, 6).map((s) => (
              <span key={s} style={{
                padding: "1px 6px", borderRadius: 4, fontSize: 11,
                background: "#f8d7da", color: "#721c24"
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="profile-result" style={{ borderColor: "#0d904f" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <svg viewBox="0 0 24 24" fill="#0d904f" style={{ width: 22, height: 22, flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#0d904f" }}>Resume written</span>
          </div>
          {result.pdfPath ? (
            <button className="download-btn" onClick={handleDownloadPdf} style={{ background: "#111", borderColor: "#111", color: "#fff" }}>
              <svg className="download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </button>
          ) : (
            <div style={{ fontSize: 12, color: "#666" }}>
              {result.message && <span>{result.message}</span>}
              {!result.message && <span style={{ fontStyle: "italic", color: "#888" }}>Writing resume...</span>}
            </div>
          )}
        </div>
      )}

      <button
        className="profile-btn"
        onClick={handleScoreMatch}
        disabled={scoring || !analysis || !config?.resumeFile}
        style={{ background: "#f3e8ff", borderColor: "#9333ea", color: "#9333ea" }}
      >
        {scoring ? (
          <>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: "#9333ea" }} />
            Scoring match...
          </>
        ) : (
          <>
            <svg className="profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
            Score match
          </>
        )}
      </button>

      <div className="info-card">
        <div className="info-row">
          <span className="info-label">Resume</span>
          <span className="info-value">{config.resumeFile}</span>
        </div>
        <div className="info-divider" />
        <div className="info-row">
          <span className="info-label">Target roles</span>
          <span className="info-value">{config.targetRoles || "Not set"}</span>
        </div>
        <div className="info-divider" />
        <div className="info-row">
          <span className="info-label">Industry</span>
          <span className="info-value">{config.industry || "Not set"}</span>
        </div>
      </div>

      <p className="dash-hint">Analyze posting → Score match → Write resume</p>

      <button className="reset-link" onClick={handleReset}>
        Reset setup
      </button>
    </div>
  )
}
