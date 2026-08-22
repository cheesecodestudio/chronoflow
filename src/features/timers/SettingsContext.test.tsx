import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { SettingsProvider, useSettings } from './SettingsContext'
import { SETTINGS_STORAGE_KEY } from '../../infrastructure/storage/SettingsStorage'

function SettingsProbe() {
  const { showSeconds, setShowSeconds } = useSettings()

  return (
    <div>
      <output>{showSeconds ? 'visible' : 'hidden'}</output>
      <button type="button" onClick={() => setShowSeconds(!showSeconds)}>
        toggle
      </button>
    </div>
  )
}

describe('SettingsContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('updates from a storage event emitted by another tab', () => {
    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>,
    )

    expect(screen.getByText('visible')).toBeInTheDocument()

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, settings: { showSeconds: false } }),
    )
    fireEvent(window, new StorageEvent('storage', {
      key: SETTINGS_STORAGE_KEY,
      newValue: window.localStorage.getItem(SETTINGS_STORAGE_KEY),
    }))

    expect(screen.getByText('hidden')).toBeInTheDocument()
  })

  it('restores the default when settings are removed', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, settings: { showSeconds: false } }),
    )

    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>,
    )
    expect(screen.getByText('hidden')).toBeInTheDocument()

    window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
    fireEvent(window, new StorageEvent('storage', {
      key: SETTINGS_STORAGE_KEY,
      newValue: null,
    }))

    expect(screen.getByText('visible')).toBeInTheDocument()
  })
})
