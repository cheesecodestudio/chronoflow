import { describe, expect, it, vi, beforeEach } from 'vitest'

import { FADE_DURATION_MS, getSlideDurationMs, setSlideDurationMs } from './presentation.constants'


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

vi.mock('./presentation.settings', () => ({
  readPresentationSettings: vi.fn((storage?: Storage) => {
    const s = storage ?? mockStorage
    const raw = s.getItem('chronoflow:presentation:v1')
    if (!raw) return { slideDurationMs: 5000 }
    try {
      const parsed = JSON.parse(raw)
      return { slideDurationMs: parsed.settings.slideDurationMs }
    } catch {
      return { slideDurationMs: 5000 }
    }
  }),
}))

describe('presentation constants', () => {
  beforeEach(() => {
    mockStorage.clear()
    vi.clearAllMocks()
    setSlideDurationMs(5000)
  })

  it('defines FADE_DURATION_MS as 280 ms', () => {
    expect(FADE_DURATION_MS).toBe(280)
  })

  it('getSlideDurationMs returns default 5000 when no storage', () => {
    expect(getSlideDurationMs()).toBe(5000)
  })

  it('getSlideDurationMs returns cached value on subsequent calls', () => {
    setSlideDurationMs(8000)
    expect(getSlideDurationMs()).toBe(8000)
    expect(getSlideDurationMs()).toBe(8000)
  })

  it('getSlideDurationMs reads from storage when cache is null', () => {
    mockStorage.store['chronoflow:presentation:v1'] = JSON.stringify({
      version: 1,
      settings: { slideDurationMs: 3000 },
    })
    setSlideDurationMs(null as unknown as number)
    expect(getSlideDurationMs()).toBe(3000)
  })

  it('setSlideDurationMs updates cached value', () => {
    setSlideDurationMs(10000)
    expect(getSlideDurationMs()).toBe(10000)
  })
})