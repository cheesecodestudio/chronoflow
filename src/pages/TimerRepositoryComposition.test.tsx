import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { ManagePage } from './ManagePage'
import { PresentationPage } from './PresentationPage'
import { AuthContext, type AuthContextValue } from '../features/auth/AuthContext'
import type { TimerRepository } from '../features/timers/timer.repository'
import type { Timer, TimerCustomization } from '../features/timers/timer.types'
import { SettingsProvider } from '../features/timers/SettingsContext'
import { TimerRepositoryProvider } from '../features/timers/TimerRepositoryProvider'
import type { Database } from '../infrastructure/supabase/database.types'

const persistedTimer: Timer = {
  id: 'shared-remote-timer',
  type: 'counter',
  title: 'Shared remote timer',
  timeZone: 'UTC',
  position: 0,
  startAt: '2020-01-01T00:00:00Z',
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-01T00:00:00Z',
}

function repositoryWithTimers(timers: Timer[]): TimerRepository & { getAll: ReturnType<typeof vi.fn> } {
  return {
    getAll: vi.fn(async () => timers),
    getById: vi.fn(async () => null),
    create: vi.fn(async (timer: Timer) => timer),
    delete: vi.fn(async () => undefined),
    restart: vi.fn(async () => persistedTimer),
    updateCustomization: vi.fn(async (
      _id: string,
      _customization: Required<TimerCustomization>,
    ) => persistedTimer),
  }
}

const session = { user: { id: 'authenticated-user', email: 'person@example.com' } } as Session
const authenticatedAuth: AuthContextValue = {
  status: 'authenticated',
  session,
  user: session.user,
  error: null,
  pendingOperation: null,
  operationError: null,
  signInWithPassword: vi.fn(async () => undefined),
  signUp: vi.fn(async () => null),
  signOut: vi.fn(async () => undefined),
}

describe('auth-aware page repository composition', () => {
  it('keeps Manage and Presentation on the same authenticated repository instance', async () => {
    const selectedRepository = repositoryWithTimers([persistedTimer])
    const localRepository = repositoryWithTimers([])
    const client = {} as SupabaseClient<Database>
    const factory = vi.fn(() => selectedRepository)

    render(
      <AuthContext.Provider value={authenticatedAuth}>
        <TimerRepositoryProvider
          clientState={{ status: 'available', client }}
          localRepository={localRepository}
          supabaseRepositoryFactory={factory}
        >
          <SettingsProvider>
            <MemoryRouter initialEntries={['/manage']}>
              <Routes>
                <Route path="/manage" element={<ManagePage />} />
                <Route path="/view" element={<PresentationPage />} />
              </Routes>
            </MemoryRouter>
          </SettingsProvider>
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('Shared remote timer')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Presentar' }))
    expect(await screen.findByRole('heading', { name: 'Shared remote timer' })).toBeInTheDocument()

    expect(factory).toHaveBeenCalledOnce()
    expect(factory).toHaveBeenCalledWith(client, 'authenticated-user')
    expect(selectedRepository.getAll).toHaveBeenCalledTimes(2)
    expect(localRepository.getAll).not.toHaveBeenCalled()
  })

  it('shows a retryable persistence error in Manage without reading local timers', async () => {
    const localRepository = repositoryWithTimers([persistedTimer])

    render(
      <AuthContext.Provider value={authenticatedAuth}>
        <TimerRepositoryProvider
          clientState={{ status: 'unavailable', message: 'Authentication unavailable' }}
          localRepository={localRepository}
        >
          <SettingsProvider>
            <MemoryRouter>
              <ManagePage />
            </MemoryRouter>
          </SettingsProvider>
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar tus timers.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByText('Shared remote timer')).not.toBeInTheDocument()
    expect(localRepository.getAll).not.toHaveBeenCalled()
  })

  it('shows a retryable persistence error in Presentation without reading local timers', async () => {
    const localRepository = repositoryWithTimers([persistedTimer])

    render(
      <AuthContext.Provider value={authenticatedAuth}>
        <TimerRepositoryProvider
          clientState={{ status: 'unavailable', message: 'Authentication unavailable' }}
          localRepository={localRepository}
        >
          <SettingsProvider>
            <MemoryRouter>
              <PresentationPage />
            </MemoryRouter>
          </SettingsProvider>
        </TimerRepositoryProvider>
      </AuthContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar la presentación.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByText('Shared remote timer')).not.toBeInTheDocument()
    expect(localRepository.getAll).not.toHaveBeenCalled()
  })
})
