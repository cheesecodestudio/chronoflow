import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { readSettings, writeSettings } from '../../infrastructure/storage/SettingsStorage'

interface SettingsContextValue {
  showSeconds: boolean
  setShowSeconds: (value: boolean) => void
}

const defaultSettings: SettingsContextValue = {
  showSeconds: true,
  setShowSeconds: () => {},
}

const SettingsContext = createContext<SettingsContextValue>(defaultSettings)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showSeconds, setShowSecondsState] = useState<boolean>(() => readSettings().showSeconds)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initial = readSettings()
    setShowSecondsState(initial.showSeconds)
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (!isInitialized) return

    function handleStorageChange(event: StorageEvent) {
      if (event.key === 'chronoflow:settings:v1' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue)
          if (parsed.settings && typeof parsed.settings.showSeconds === 'boolean') {
            setShowSecondsState(parsed.settings.showSeconds)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isInitialized])

  function setShowSeconds(value: boolean) {
    setShowSecondsState(value)
    writeSettings({ showSeconds: value })
  }

  return (
    <SettingsContext.Provider value={{ showSeconds, setShowSeconds }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext)
}