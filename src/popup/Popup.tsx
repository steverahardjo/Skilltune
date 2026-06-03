import "./theme.css"
import { useState, useEffect, useCallback } from "react"
import type { AppView } from "../shared/types"
import { hasConfig } from "../shared/storage"
import { Onboarding } from "./Onboarding"
import { Dashboard } from "./Dashboard"

export function Popup() {
  const [view, setView] = useState<AppView>("loading")
  const [resumeSession, setResumeSession] = useState(false)

  const checkConfig = useCallback(async () => {
    const configured = await hasConfig()
    setView(configured ? "dashboard" : "onboarding")
  }, [])

  useEffect(() => {
    checkConfig()
  }, [checkConfig])

  if (view === "loading") {
    return (
      <div className="g-pup" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <div className="spinner" />
      </div>
    )
  }

  if (view === "onboarding") {
    return (
      <Onboarding
        resumeSession={resumeSession}
        onComplete={() => {
          setResumeSession(false)
          setView("dashboard")
        }}
      />
    )
  }

  return (
    <Dashboard
      onRescanSetup={() => {
        setResumeSession(true)
        setView("onboarding")
      }}
    />
  )
}
