import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_DISPLAY_SETTINGS,
  readSettings,
  SETTINGS_STORAGE_KEY,
  writeSettings,
} from './SettingsStorage'

describe('SettingsStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns showSeconds enabled by default', () => {
    expect(readSettings()).toEqual(DEFAULT_DISPLAY_SETTINGS)
  })

  it('persists and restores showSeconds', () => {
    writeSettings({ showSeconds: false })

    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"showSeconds":false')
    expect(readSettings()).toEqual({ showSeconds: false })
  })

  it('falls back to defaults for malformed or incomplete settings', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{invalid')
    expect(readSettings()).toEqual(DEFAULT_DISPLAY_SETTINGS)

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, settings: {} }),
    )
    expect(readSettings()).toEqual(DEFAULT_DISPLAY_SETTINGS)
  })
})
