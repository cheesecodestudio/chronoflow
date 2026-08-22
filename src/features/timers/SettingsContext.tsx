import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import {
  DEFAULT_DISPLAY_SETTINGS,
  readSettings,
  SETTINGS_STORAGE_KEY,
  writeSettings,
} from '../../infrastructure/storage/SettingsStorage'

interface SettingsContextValue {
  showSeconds: boolean
  setShowSeconds: (value: boolean) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  showSeconds: DEFAULT_DISPLAY_SETTINGS.showSeconds,
  setShowSeconds: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showSeconds, setShowSecondsState] = useState<boolean>(() => readSettings().showSeconds)

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key !== SETTINGS_STORAGE_KEY) {
        return
      }

      setShowSecondsState(event.newValue ? readSettings().showSeconds : DEFAULT_DISPLAY_SETTINGS.showSeconds)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

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
