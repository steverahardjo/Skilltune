import "./theme.css"
import { useState, useEffect } from "react"
import type { UserConfig } from "../shared/types"
import { loadConfig } from "../shared/storage"
import { scanCurrentPage } from "../shared/scan"

interface Props {
  onRescanSetup: () => void
}

export function Dashboard({ onRescanSetup }: Props) {
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
    </div>
  )
}
