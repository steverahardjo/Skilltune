import "./theme.css"
import { useState, useEffect } from "react"
import type { UserConfig } from "../shared/types"
import { loadConfig } from "../shared/storage"
import { scanCurrentPage, requestProfile, resetSession } from "../shared/scan"

interface Props {
  onRescanSetup: () => void
}

export function Dashboard({ onRescanSetup }: Props) {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [scanning, setScanning] = useState(false)
  const [profiling, setProfiling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState<string | null>(null)

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

  const handleProfile = async () => {
    if (!config?.workspaceFolder || !config?.apiKey) return
    setProfiling(true)
    setError(null)
    setProfile(null)
    try {
      const result = await requestProfile(config.workspaceFolder, config.apiKey)
      setProfile(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Profile failed")
    } finally {
      setProfiling(false)
    }
  }

  const handleReset = async () => {
    setError(null)
    setProfile(null)
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

      <button className="profile-btn" onClick={handleProfile} disabled={profiling}>
        {profiling ? (
          <>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Profiling...
          </>
        ) : (
          <>
            <svg className="profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile me
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

      {saved && (
        <div className="scan-confirm">
          <svg className="scan-confirm-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span className="scan-confirm-text">Screenshot saved</span>
        </div>
      )}

      {profile && (
        <div className="profile-result">
          <pre className="profile-text">{profile}</pre>
        </div>
      )}

      <div className="info-card">
        <div className="info-row">
          <span className="info-label">Workspace</span>
          <span className="info-value">{config.workspaceFolder}</span>
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
        Navigate to a job posting, then click Scan.
      </p>

      <button className="reset-link" onClick={handleReset}>
        Reset setup
      </button>
    </div>
  )
}
