import "./theme.css"
import { useState, useEffect } from "react"
import type { UserConfig } from "../shared/types"
import { loadConfig } from "../shared/storage"
import {
  scanCurrentPage,
  extractPageText,
  requestResumeWrite,
  requestPostingAnalysis,
  resetSession,
} from "../shared/scan"

interface Props {
  onRescanSetup: () => void
}

export function Dashboard({ onRescanSetup }: Props) {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [scanning, setScanning] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [typSource, setTypSource] = useState<string | null>(null)

  useEffect(() => {
    loadConfig().then(setConfig)
  }, [])

  const handleScan = async () => {
    setScanning(true)
    setError(null)
    setSaved(false)
    try {
      await scanCurrentPage()
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed")
    } finally {
      setScanning(false)
    }
  }

  const handleAnalyze = async () => {
    if (!config?.apiKey) return
    setAnalyzing(true)
    setError(null)
    setAnalysis(null)
    setTypSource(null)
    try {
      const page = await extractPageText()
      if (!page.text) throw new Error("No text found on this page")
      const result = await requestPostingAnalysis(page.text, config.apiKey)
      setAnalysis(result.analysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleWriteResume = async () => {
    if (!config?.apiKey || !analysis || !config?.resumeFile) return
    setWriting(true)
    setError(null)
    setTypSource(null)
    try {
      console.log("[dashboard] Resume path:", config.resumeFile)
      const result = await requestResumeWrite(config.resumeFile, analysis, config.apiKey)
      setTypSource(result.typ)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Write resume failed")
    } finally {
      setWriting(false)
    }
  }

  const handleDownload = () => {
    if (!typSource) return
    const blob = new Blob([typSource], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "resume_tailored.typ"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = async () => {
    setError(null)
    setAnalysis(null)
    setTypSource(null)
    setSaved(false)
    setConfig(null)
    await resetSession()
    onRescanSetup()
  }

  if (!config) return null

  return (
    <div className="google-popup">
      <div className="dash-header">
        <h1 className="dash-title">Resume Adjuster</h1>
        <button className="dash-avatar" onClick={onRescanSetup} title="Edit setup">
          {config.name.charAt(0).toUpperCase()}
        </button>
      </div>

      <button className="scan-btn" onClick={handleScan} disabled={scanning}>
        {scanning ? (
          <>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Capturing page...
          </>
        ) : (
          <>
            <svg className="scan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              <polyline points="21,3 21,9 15,9" />
            </svg>
            Scan this page
          </>
        )}
      </button>

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
        className={`write-btn ${analysis ? "" : "disabled"}`}
        onClick={handleWriteResume}
        disabled={writing || !analysis}
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

      {saved && !analysis && (
        <div className="scan-confirm">
          <svg className="scan-confirm-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span className="scan-confirm-text">Screenshot saved</span>
        </div>
      )}

      {analysis && (
        <div className="profile-result" style={{ borderColor: "#1a73e8" }}>
          <pre className="profile-text">{analysis}</pre>
        </div>
      )}

      {typSource && (
        <div className="profile-result" style={{ borderColor: "#0d904f" }}>
          <pre className="profile-text">{typSource}</pre>
          <button className="download-btn" onClick={handleDownload}>
            <svg className="download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download .typ
          </button>
        </div>
      )}

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

      <p className="dash-hint">
        Scan → Analyze posting → Write resume
      </p>

      <button className="reset-link" onClick={handleReset}>
        Reset setup
      </button>
    </div>
  )
}
