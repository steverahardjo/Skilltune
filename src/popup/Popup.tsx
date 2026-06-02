import { useState } from "react"
import type { WorkflowStep } from "../shared/types"

export function Popup() {
  const [step, setStep] = useState<WorkflowStep>("idle")
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    setStep("scanning")
    setError(null)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error("No active tab found")

      const response = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE" })
      setStep("analyzing")

      console.log("Scan result:", response)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed")
      setStep("error")
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Resume Adjuster</h1>
      <p style={styles.subtitle}>Tailor your resume to any job posting</p>

      <button
        style={step === "scanning" || step === "analyzing" ? styles.buttonDisabled : styles.button}
        disabled={step === "scanning" || step === "analyzing"}
        onClick={handleScan}
      >
        {step === "scanning" && "Scanning page..."}
        {step === "analyzing" && "Analyzing..."}
        {(step === "idle" || step === "done") && "Scan Job Posting"}
        {step === "error" && "Retry Scan"}
      </button>

      {step === "done" && <p style={styles.success}>Scan complete! Check the results panel.</p>}
      {error && <p style={styles.error}>{error}</p>}

      <footer style={styles.footer}>
        <button style={styles.linkButton} disabled>
          Resume Settings
        </button>
        <span style={styles.separator}>|</span>
        <button style={styles.linkButton} disabled>
          Results
        </button>
      </footer>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 320,
    padding: "20px 24px",
    fontFamily: "Inter, system-ui, sans-serif",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 4px",
    color: "#f0f0f0",
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    margin: "0 0 20px",
  },
  button: {
    width: "100%",
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 600,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    backgroundColor: "#4a6cf7",
    color: "#fff",
    marginBottom: 12,
  },
  buttonDisabled: {
    width: "100%",
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 600,
    border: "none",
    borderRadius: 8,
    cursor: "not-allowed",
    backgroundColor: "#333",
    color: "#888",
    marginBottom: 12,
  },
  success: {
    fontSize: 12,
    color: "#4ade80",
    margin: "0 0 8px",
  },
  error: {
    fontSize: 12,
    color: "#f87171",
    margin: "0 0 8px",
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTop: "1px solid #333",
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: 11,
    cursor: "pointer",
    padding: 0,
  },
  separator: {
    color: "#444",
    fontSize: 11,
  },
}
