'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ROAM_KEY = 'proxpex-rex-roam'

const RexPreferencesContext = createContext({
  roamEnabled: true,
  setRoamEnabled: () => {},
})

// Saved to this browser only (localStorage), same as theme/accent — not a
// per-company or per-user server setting.
export function RexPreferencesProvider({ children }) {
  const [roamEnabled, setRoamEnabledState] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(ROAM_KEY)
    if (stored !== null) setRoamEnabledState(stored === 'true')
  }, [])

  function setRoamEnabled(next) {
    setRoamEnabledState(next)
    localStorage.setItem(ROAM_KEY, String(next))
  }

  return (
    <RexPreferencesContext.Provider value={{ roamEnabled, setRoamEnabled }}>
      {children}
    </RexPreferencesContext.Provider>
  )
}

export function useRexPreferences() {
  return useContext(RexPreferencesContext)
}
