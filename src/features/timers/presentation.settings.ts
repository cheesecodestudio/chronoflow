export const PRESENTATION_SETTINGS_STORAGE_KEY = 'chronoflow:presentation:v1'
export const PRESENTATION_SETTINGS_VERSION = 1

export const DEFAULT_SLIDE_DURATION_MS = 5000
export const MIN_SLIDE_DURATION_MS = 2000
export const MAX_SLIDE_DURATION_MS = 60000
export const SLIDE_DURATION_STEP_MS = 1000

export function slideDurationMsToSeconds(value: number): number {
  return value / SLIDE_DURATION_STEP_MS
}

export function slideDurationSecondsToMs(value: number): number {
  return value * SLIDE_DURATION_STEP_MS
}

export interface PresentationSettings {
  slideDurationMs: number
}

export interface PresentationSettingsEnvelope {
  version: typeof PRESENTATION_SETTINGS_VERSION
  settings: PresentationSettings
}

const DEFAULT_SETTINGS: PresentationSettings = {
  slideDurationMs: DEFAULT_SLIDE_DURATION_MS,
}

function getBrowserStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Se debe proporcionar un storage fuera del navegador.')
  }
  return window.localStorage
}

function isPresentationSettingsEnvelope(value: unknown): value is PresentationSettingsEnvelope {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    candidate.version === PRESENTATION_SETTINGS_VERSION &&
    typeof candidate.settings === 'object' &&
    candidate.settings !== null &&
    typeof (candidate.settings as Record<string, unknown>).slideDurationMs === 'number'
  )
}

export function readPresentationSettings(storage: Storage = getBrowserStorage()): PresentationSettings {
  const raw = storage.getItem(PRESENTATION_SETTINGS_STORAGE_KEY)
  if (!raw) {
    return DEFAULT_SETTINGS
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isPresentationSettingsEnvelope(parsed)) {
      return DEFAULT_SETTINGS
    }
    const slideDurationMs = parsed.settings.slideDurationMs
    if (!isValidSlideDuration(slideDurationMs)) {
      return DEFAULT_SETTINGS
    }
    return { slideDurationMs }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writePresentationSettings(
  settings: PresentationSettings,
  storage: Storage = getBrowserStorage()
): void {
  if (!isValidSlideDuration(settings.slideDurationMs)) {
    throw new Error('Duración de slide inválida.')
  }
  const envelope: PresentationSettingsEnvelope = {
    version: PRESENTATION_SETTINGS_VERSION,
    settings,
  }
  storage.setItem(PRESENTATION_SETTINGS_STORAGE_KEY, JSON.stringify(envelope))
}

export function isValidSlideDuration(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_SLIDE_DURATION_MS &&
    value <= MAX_SLIDE_DURATION_MS &&
    value % SLIDE_DURATION_STEP_MS === 0
  )
}

export function getSlideDurationErrorMessage(value: number): string | null {
  if (!Number.isInteger(value)) {
    return 'Debe ser un número entero.'
  }
  if (value < MIN_SLIDE_DURATION_MS) {
    return `Mínimo ${MIN_SLIDE_DURATION_MS}ms, múltiplos de ${SLIDE_DURATION_STEP_MS}ms`
  }
  if (value > MAX_SLIDE_DURATION_MS) {
    return `Máximo ${MAX_SLIDE_DURATION_MS}ms`
  }
  if (value % SLIDE_DURATION_STEP_MS !== 0) {
    return `Debe ser múltiplo de ${SLIDE_DURATION_STEP_MS}ms`
  }
  return null
}
