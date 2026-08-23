import { readPresentationSettings } from './presentation.settings'

export const FADE_DURATION_MS = 280

let cachedSlideDuration: number | null = null

export function getSlideDurationMs(): number {
  if (cachedSlideDuration !== null) {
    return cachedSlideDuration
  }
  const settings = readPresentationSettings()
  cachedSlideDuration = settings.slideDurationMs
  return cachedSlideDuration
}

export function setSlideDurationMs(value: number): void {
  cachedSlideDuration = value
}
