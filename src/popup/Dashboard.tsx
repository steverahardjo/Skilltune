import "./theme.css"
import { useState, useEffect } from "react"
import type { UserConfig } from "../shared/types"
import { loadConfig } from "../shared/storage"

interface Props {
  onRescanSetup: () => void
}

export function Dashboard({ onRescanSetup }: Props) {
  const [config, setConfig] = useState<UserConfig | null>(null)

  useEffect(() => {
    loadConfig().then(setConfig)
  }, [])

  if (!config) return null

  return (
    <div className="google-popup">
      <div className="dash-header">
        <h1 className="dash-title">Resume Adjuster</h1>
        <button className="dash-avatar" onClick={onRescanSetup} title="Edit setup">
          {config.name.charAt(0).toUpperCase()}
        </button>
      </div>

      <button className="scan-btn" onClick={() => {}}>
        <svg className="scan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          <polyline points="21,3 21,9 15,9" />
        </svg>
        Scan this page
      </button>

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
        Navigate to a job posting, then click the extension icon to scan it.
      </p>
    </div>
  )
}
