import "./theme.css"
import { useState, useEffect } from "react"
import type { UserConfig } from "../shared/types"
import { loadConfig, saveConfig } from "../shared/storage"

interface Props {
  resumeSession: boolean
  onComplete: () => void
}

const TOTAL_STEPS = 2

export function Onboarding({ resumeSession, onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [loaded, setLoaded] = useState(false)
  const [config, setConfig] = useState<UserConfig>({
    name: "",
    targetRoles: "",
    industry: "",
    resumeFile: "",
  })

  useEffect(() => {
    loadConfig().then((saved) => {
      if (saved) {
        setConfig(saved)
        if (resumeSession) {
          setStep(1)
        } else if (saved.resumeFile) {
          setStep(2)
        } else if (saved.name) {
          setStep(2)
        } else {
          setStep(1)
        }
      }
      setLoaded(true)
    })
  }, [resumeSession])

  const update = (field: keyof UserConfig, value: string) =>
    setConfig((prev) => ({ ...prev, [field]: value }))

  const persist = async (overrides?: Partial<UserConfig>) => {
    const next = { ...config, ...overrides }
    setConfig(next)
    await saveConfig(next)
  }

  const canNext = (s: number): boolean => {
    if (s === 1) return config.name.trim().length > 0
    if (s === 2) return config.resumeFile.trim().length > 0
    return false
  }

  const handleNext = async () => {
    await persist()
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleFinish = async () => {
    await persist()
    onComplete()
  }

  if (!loaded) {
    return (
      <div className="g-pup" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="g-pup">
      <div className="step-indicator">
        {[1, 2].map((s, i) => (
          <div key={s} style={{ display: "contents" }}>
            {i > 0 && <div className={`step-connector ${step > s - 1 ? "active" : ""}`} />}
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
            <input className="form-input" value={config.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Smith" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Target role(s)</label>
            <input className="form-input" value={config.targetRoles} onChange={(e) => update("targetRoles", e.target.value)} placeholder="Senior Frontend Engineer" />
          </div>
          <div className="form-group">
            <label className="form-label">Industry</label>
            <input className="form-input" value={config.industry} onChange={(e) => update("industry", e.target.value)} placeholder="Fintech, SaaS, etc." />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="form-heading">Resume file</h2>
          <p className="form-sub">Absolute path to your resume</p>
          <div className="form-group">
            <label className="form-label">File path</label>
            <input className="form-input" value={config.resumeFile} onChange={(e) => update("resumeFile", e.target.value)} placeholder="/home/you/resume.typ" autoFocus />
          </div>
          <div className="hint-card workspace-hint">
            <svg className="hint-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <p className="hint-text">
              Enter the full path to your <strong>.typ</strong> resume file. The agent uses this as a reference for style and content.
            </p>
          </div>
        </>
      )}

      <div className="form-actions">
        {step > 1 && <button className="btn-text" onClick={handleBack}>Back</button>}
        {step < TOTAL_STEPS ? (
          <button className="btn-primary" disabled={!canNext(step)} onClick={handleNext}>Next</button>
        ) : (
          <button className="btn-primary" disabled={!canNext(step)} onClick={handleFinish}>Get started</button>
        )}
      </div>
    </div>
  )
}
