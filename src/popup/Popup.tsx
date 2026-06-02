import "./theme.css"
import { useState, useEffect, useCallback } from "react"
import type { AppView } from "../shared/types"
import { hasConfig } from "../shared/storage"
import { Onboarding } from "./Onboarding"
import { Dashboard } from "./Dashboard"

export function Popup() {
  const [view, setView] = useState<AppView>("loading")

  const checkConfig = useCallback(async () => {
    const configured = await hasConfig()
    setView(configured ? "dashboard" : "onboarding")
  }, [])

  useEffect(() => {
    checkConfig()
  }, [checkConfig])

  if (view === "loading") {
    return (
      <div className="google-popup" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <div className="spinner" />
      </div>
    )
  }

  if (view === "onboarding") {
    return <Onboarding onComplete={() => setView("dashboard")} />
  }

  return <Dashboard onRescanSetup={() => setView("onboarding")} />
}
