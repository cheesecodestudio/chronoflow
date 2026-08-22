export const SETTINGS_STORAGE_KEY = 'chronoflow:settings:v1'
export const SETTINGS_STORAGE_VERSION = 1

export interface SettingsStorageEnvelope {
  version: typeof SETTINGS_STORAGE_VERSION
  settings: DisplaySettings
}

export interface DisplaySettings {
  showSeconds: boolean
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showSeconds: true,
}

function getBrowserStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Se debe proporcionar un storage fuera del navegador.')
  }
  return window.localStorage
}

export function readSettings(): DisplaySettings {
  const storage = getBrowserStorage()
  const raw = storage.getItem(SETTINGS_STORAGE_KEY)

  if (!raw) {
    return DEFAULT_DISPLAY_SETTINGS
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (!isSettingsEnvelope(parsed)) {
      return DEFAULT_DISPLAY_SETTINGS
    }

    return mergeWithDefaults(parsed.settings)
  } catch {
    return DEFAULT_DISPLAY_SETTINGS
  }
}

export function writeSettings(settings: DisplaySettings): void {
  const storage = getBrowserStorage()
  const envelope: SettingsStorageEnvelope = {
    version: SETTINGS_STORAGE_VERSION,
    settings,
  }
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(envelope))
}

function isSettingsEnvelope(value: unknown): value is SettingsStorageEnvelope {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    candidate.version === SETTINGS_STORAGE_VERSION &&
    candidate.settings !== undefined &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null
  )
}

function mergeWithDefaults(settings: unknown): DisplaySettings {
  const defaults = DEFAULT_DISPLAY_SETTINGS
  if (!settings || typeof settings !== 'object') {
    return defaults
  }
  const candidate = settings as Partial<DisplaySettings>
  return {
    showSeconds: typeof candidate.showSeconds === 'boolean' ? candidate.showSeconds : defaults.showSeconds,
  }
}