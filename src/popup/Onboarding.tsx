import "./theme.css"
import { useState, useEffect } from "react"
import type { UserConfig } from "../shared/types"
import { loadConfig, saveConfig } from "../shared/storage"
import { pickWorkspaceFolder } from "../shared/filesystem"

interface Props {
  onComplete: () => void
}

const TOTAL_STEPS = 3

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [picking, setPicking] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [config, setConfig] = useState<UserConfig>({
    name: "",
    targetRoles: "",
    industry: "",
    workspaceFolder: "",
    apiKey: "",
  })

  useEffect(() => {
    loadConfig().then((saved) => {
      if (saved) {
        setConfig(saved)
        if (saved.apiKey) setStep(3)
        else if (saved.workspaceFolder) setStep(3)
        else if (saved.name) setStep(2)
        else setStep(1)
      }
      setLoaded(true)
    })
  }, [])

  const update = (field: keyof UserConfig, value: string) =>
    setConfig((prev) => ({ ...prev, [field]: value }))

  const persist = async (overrides?: Partial<UserConfig>) => {
    const next = { ...config, ...overrides }
    setConfig(next)
    await saveConfig(next)
  }

  const canNext = (s: number): boolean => {
    if (s === 1) return config.name.trim().length > 0
    if (s === 2) return config.workspaceFolder.trim().length > 0
    if (s === 3) return config.apiKey.trim().length > 0
    return false
  }

  const handlePickFolder = async () => {
    setPicking(true)
    const folder = await pickWorkspaceFolder()
    setPicking(false)
    if (folder) {
      await persist({ workspaceFolder: folder })
    }
  }

  const handleNext = async () => {
    await persist()
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleFinish = async () => {
    await persist()
    try {
      chrome.runtime.sendMessage({
        type: "API_CALL",
        endpoint: "/api/save-key",
        body: { apiKey: config.apiKey },
      })
    } catch {
      // server might not be running yet — key sent per-request as fallback
    }
    onComplete()
  }

  if (!loaded) {
    return (
      <div className="google-popup" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="google-popup">
      <div className="step-indicator">
        {[1, 2, 3].map((s, i) => (
          <div key={s} style={{ display: "contents" }}>
            {i > 0 && (
              <div className={`step-connector ${step > s - 1 ? "active" : ""}`} />
            )}
            <div className={`step-dot ${step >= s ? "active" : ""}`}>
              <span className="step-num">{s}</span>
              {step > s && (
                <svg className="step-check" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="5,13 10,18 19,6" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
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
      )}

      {step === 2 && (
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

      {step === 3 && (
        <>
          <h2 className="form-heading">API key</h2>
          <p className="form-sub">Connect your DeepSeek account to power the agent</p>

          <div className="form-group">
            <label className="form-label">DeepSeek API key</label>
            <input
              className="form-input"
              type="password"
              value={config.apiKey}
              onChange={(e) => update("apiKey", e.target.value)}
              placeholder="sk-..."
              autoFocus
            />
          </div>

          <div className="hint-card api-hint">
            <svg className="hint-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <p className="hint-text">
              Get your key at{" "}
              <a
                className="api-link"
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                platform.deepseek.com
              </a>
              . Your key is stored locally and sent only to DeepSeek's API.
            </p>
          </div>
        </>
      )}

      <div className="form-actions">
        {step > 1 && (
          <button className="btn-text" onClick={handleBack}>
            Back
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button className="btn-primary" disabled={!canNext(step)} onClick={handleNext}>
            Next
          </button>
        ) : (
          <button className="btn-primary" disabled={!canNext(step)} onClick={handleFinish}>
            Get started
          </button>
        )}
      </div>
    </div>
  )
}
