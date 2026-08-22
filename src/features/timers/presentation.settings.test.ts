import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  readPresentationSettings,
  writePresentationSettings,
  isValidSlideDuration,
  getSlideDurationErrorMessage,
  DEFAULT_SLIDE_DURATION_MS,
  MIN_SLIDE_DURATION_MS,
  MAX_SLIDE_DURATION_MS,
  SLIDE_DURATION_STEP_MS,
  PRESENTATION_SETTINGS_STORAGE_KEY,
} from './presentation.settings'

const mockStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockStorage.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockStorage.store = {}
  }),
}

describe('presentation.settings', () => {
  beforeEach(() => {
    mockStorage.clear()
    vi.clearAllMocks()
  })

  describe('DEFAULT_SLIDE_DURATION_MS', () => {
    it('should be 5000', () => {
      expect(DEFAULT_SLIDE_DURATION_MS).toBe(5000)
    })
  })

  describe('isValidSlideDuration', () => {
    it('returns true for valid default value', () => {
      expect(isValidSlideDuration(5000)).toBe(true)
    })

    it('returns true for minimum value', () => {
      expect(isValidSlideDuration(MIN_SLIDE_DURATION_MS)).toBe(true)
    })

    it('returns true for maximum value', () => {
      expect(isValidSlideDuration(MAX_SLIDE_DURATION_MS)).toBe(true)
    })

    it('returns true for valid step multiples', () => {
      expect(isValidSlideDuration(3000)).toBe(true)
      expect(isValidSlideDuration(10000)).toBe(true)
      expect(isValidSlideDuration(60000)).toBe(true)
    })

    it('returns false for values below minimum', () => {
      expect(isValidSlideDuration(1000)).toBe(false)
      expect(isValidSlideDuration(1500)).toBe(false)
      expect(isValidSlideDuration(1999)).toBe(false)
    })

    it('returns false for values above maximum', () => {
      expect(isValidSlideDuration(61000)).toBe(false)
      expect(isValidSlideDuration(100000)).toBe(false)
    })

    it('returns false for non-integer values', () => {
      expect(isValidSlideDuration(5000.5)).toBe(false)
      expect(isValidSlideDuration(3.14)).toBe(false)
    })

    it('returns false for non-multiples of step', () => {
      expect(isValidSlideDuration(7500)).toBe(false)
      expect(isValidSlideDuration(5500)).toBe(false)
      expect(isValidSlideDuration(2500)).toBe(false)
    })

    it('returns false for negative values', () => {
      expect(isValidSlideDuration(-1000)).toBe(false)
      expect(isValidSlideDuration(0)).toBe(false)
    })
  })

  describe('getSlideDurationErrorMessage', () => {
    it('returns null for valid values', () => {
      expect(getSlideDurationErrorMessage(5000)).toBeNull()
      expect(getSlideDurationErrorMessage(3000)).toBeNull()
      expect(getSlideDurationErrorMessage(60000)).toBeNull()
    })

    it('returns error for values below minimum', () => {
      const error = getSlideDurationErrorMessage(1500)
      expect(error).toContain(String(MIN_SLIDE_DURATION_MS))
      expect(error).toContain(String(SLIDE_DURATION_STEP_MS))
    })

    it('returns error for values above maximum', () => {
      const error = getSlideDurationErrorMessage(65000)
      expect(error).toContain(String(MAX_SLIDE_DURATION_MS))
    })

    it('returns error for non-multiples of step', () => {
      const error = getSlideDurationErrorMessage(7500)
      expect(error).toContain(String(SLIDE_DURATION_STEP_MS))
    })

    it('returns error for non-integer values', () => {
      const error = getSlideDurationErrorMessage(5000.5)
      expect(error).toBe('Debe ser un número entero.')
    })
  })

  describe('readPresentationSettings', () => {
    it('returns default settings when storage is empty', () => {
      const settings = readPresentationSettings(mockStorage as unknown as Storage)
      expect(settings.slideDurationMs).toBe(DEFAULT_SLIDE_DURATION_MS)
    })

    it('returns saved settings when valid', () => {
      mockStorage.store[PRESENTATION_SETTINGS_STORAGE_KEY] = JSON.stringify({
        version: 1,
        settings: { slideDurationMs: 8000 },
      })
      const settings = readPresentationSettings(mockStorage as unknown as Storage)
      expect(settings.slideDurationMs).toBe(8000)
    })

    it('returns default when saved value is invalid (below min)', () => {
      mockStorage.store[PRESENTATION_SETTINGS_STORAGE_KEY] = JSON.stringify({
        version: 1,
        settings: { slideDurationMs: 1000 },
      })
      const settings = readPresentationSettings(mockStorage as unknown as Storage)
      expect(settings.slideDurationMs).toBe(DEFAULT_SLIDE_DURATION_MS)
    })

    it('returns default when saved value is invalid (above max)', () => {
      mockStorage.store[PRESENTATION_SETTINGS_STORAGE_KEY] = JSON.stringify({
        version: 1,
        settings: { slideDurationMs: 70000 },
      })
      const settings = readPresentationSettings(mockStorage as unknown as Storage)
      expect(settings.slideDurationMs).toBe(DEFAULT_SLIDE_DURATION_MS)
    })

    it('returns default when saved value is not a step multiple', () => {
      mockStorage.store[PRESENTATION_SETTINGS_STORAGE_KEY] = JSON.stringify({
        version: 1,
        settings: { slideDurationMs: 7500 },
      })
      const settings = readPresentationSettings(mockStorage as unknown as Storage)
      expect(settings.slideDurationMs).toBe(DEFAULT_SLIDE_DURATION_MS)
    })

    it('returns default when storage has invalid JSON', () => {
      mockStorage.store[PRESENTATION_SETTINGS_STORAGE_KEY] = 'invalid json'
      const settings = readPresentationSettings(mockStorage as unknown as Storage)
      expect(settings.slideDurationMs).toBe(DEFAULT_SLIDE_DURATION_MS)
    })

    it('returns default when storage envelope is invalid', () => {
      mockStorage.store[PRESENTATION_SETTINGS_STORAGE_KEY] = JSON.stringify({
        version: 2,
        settings: { slideDurationMs: 5000 },
      })
      const settings = readPresentationSettings(mockStorage as unknown as Storage)
      expect(settings.slideDurationMs).toBe(DEFAULT_SLIDE_DURATION_MS)
    })
  })

  describe('writePresentationSettings', () => {
    it('writes valid settings to storage', () => {
      writePresentationSettings({ slideDurationMs: 8000 }, mockStorage as unknown as Storage)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        PRESENTATION_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          settings: { slideDurationMs: 8000 },
        })
      )
    })

    it('throws for invalid duration (below min)', () => {
      expect(() => writePresentationSettings({ slideDurationMs: 1000 }, mockStorage as unknown as Storage)).toThrow('Duración de slide inválida.')
    })

    it('throws for invalid duration (above max)', () => {
      expect(() => writePresentationSettings({ slideDurationMs: 70000 }, mockStorage as unknown as Storage)).toThrow('Duración de slide inválida.')
    })

    it('throws for invalid duration (non-step multiple)', () => {
      expect(() => writePresentationSettings({ slideDurationMs: 7500 }, mockStorage as unknown as Storage)).toThrow('Duración de slide inválida.')
    })
  })
})