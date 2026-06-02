import "./theme.css"
import { useState } from "react"
import type { UserConfig } from "../shared/types"
import { saveConfig } from "../shared/storage"
import { pickWorkspaceFolder } from "../shared/filesystem"

interface Props {
  onComplete: () => void
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [picking, setPicking] = useState(false)
  const [config, setConfig] = useState<UserConfig>({
    name: "",
    targetRoles: "",
    industry: "",
    workspaceFolder: "",
  })

  const update = (field: keyof UserConfig, value: string) =>
    setConfig((prev) => ({ ...prev, [field]: value }))

  const canNext = step === 1
    ? config.name.trim().length > 0
    : config.workspaceFolder.trim().length > 0

  const handlePickFolder = async () => {
    setPicking(true)
    const folder = await pickWorkspaceFolder()
    setPicking(false)
    if (folder) {
      setConfig((prev) => ({ ...prev, workspaceFolder: folder }))
    }
  }

  const handleFinish = async () => {
    await saveConfig(config)
    onComplete()
  }

  return (
    <div className="google-popup">
      <div className="step-indicator">
        <div className={`step-dot ${step >= 1 ? "active" : ""}`}>
          <span className="step-num">1</span>
          {step > 1 && (
            <svg className="step-check" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="5,13 10,18 19,6" />
            </svg>
          )}
        </div>
        <div className={`step-connector ${step >= 2 ? "active" : ""}`} />
        <div className={`step-dot ${step >= 2 ? "active" : ""}`}>
          <span className="step-num">2</span>
        </div>
      </div>

      {step === 1 ? (
        <>
          <h2 className="form-heading">About you</h2>
          <p className="form-sub">Help us understand your background</p>

          <div className="form-group">
            <label className="form-label">Your name</label>
            <input
              className="form-input"
              value={config.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Jane Smith"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Target role(s)</label>
            <input
              className="form-input"
              value={config.targetRoles}
              onChange={(e) => update("targetRoles", e.target.value)}
              placeholder="Senior Frontend Engineer"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Industry</label>
            <input
              className="form-input"
              value={config.industry}
              onChange={(e) => update("industry", e.target.value)}
              placeholder="Fintech, SaaS, etc."
            />
          </div>
        </>
      ) : (
        <>
          <h2 className="form-heading">Workspace folder</h2>
          <p className="form-sub">Pick the folder with your resume and job postings</p>

          <button className="folder-picker" onClick={handlePickFolder} disabled={picking}>
            <svg className="folder-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
            <span>{picking ? "Opening..." : config.workspaceFolder || "Choose folder"}</span>
          </button>

          {config.workspaceFolder && (
            <div className="folder-confirm">
              <div className="folder-path-row">
                <svg className="folder-path-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <span className="folder-path-name">{config.workspaceFolder}</span>
              </div>
              <p className="folder-path-hint">
                Resume and job postings will be read from this folder
              </p>
            </div>
          )}

          <div className="hint-card workspace-hint">
            <svg className="hint-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <p className="hint-text">
              Keep your resume and job postings in one folder. We'll read
              everything from there when you scan a listing.
            </p>
          </div>
        </>
      )}

      <div className="form-actions">
        {step > 1 && (
          <button className="btn-text" onClick={() => setStep(1)}>
            Back
          </button>
        )}
        {step < 2 ? (
          <button className="btn-primary" disabled={!canNext} onClick={() => setStep(2)}>
            Next
          </button>
        ) : (
          <button className="btn-primary" disabled={!canNext} onClick={handleFinish}>
            Get started
          </button>
        )}
      </div>
    </div>
  )
}
