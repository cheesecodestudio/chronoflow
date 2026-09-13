import { StrictMode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { AuthProvider } from './AuthProvider'
import { useAuth } from './AuthContext'
import { AUTHENTICATION_UNAVAILABLE_MESSAGE } from '../../infrastructure/supabase/client'

type AuthStateChangeCallback = Parameters<SupabaseClient['auth']['onAuthStateChange']>[0]
type AuthEvent = Parameters<AuthStateChangeCallback>[0]

function createSession(userId: string): Session {
  return { user: { id: userId } } as Session
}

function createAuthHarness({ failOnSubscribe = false } = {}) {
  const callbacks: AuthStateChangeCallback[] = []
  const unsubscribeFunctions: Array<ReturnType<typeof vi.fn>> = []
  const onAuthStateChange = vi.fn((callback: AuthStateChangeCallback) => {
    if (failOnSubscribe) throw new Error('sensitive provider details')

    const unsubscribe = vi.fn()
    callbacks.push(callback)
    unsubscribeFunctions.push(unsubscribe)

    return { data: { subscription: { unsubscribe } } }
  })
  const client = { auth: { onAuthStateChange } } as unknown as SupabaseClient

  return {
    clientState: { status: 'available', client } as const,
    onAuthStateChange,
    unsubscribeFunctions,
    emit(index: number, event: AuthEvent, session: Session | null) {
      act(() => {
        callbacks[index]!(event, session)
      })
    },
  }
}

function AuthProbe() {
  const { status, session, user, error } = useAuth()

  return (
    <div>
      <output data-testid="status">{status}</output>
      <output data-testid="session">{session ? 'session' : 'no-session'}</output>
      <output data-testid="user">{user?.id ?? 'no-user'}</output>
      <output data-testid="error">{error ?? 'no-error'}</output>
    </div>
  )
}

describe('AuthProvider', () => {
  it('fails explicitly when useAuth is used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      expect(() => render(<AuthProbe />)).toThrowError(
        new Error('useAuth must be used within AuthProvider'),
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('keeps the lifecycle initializing until INITIAL_SESSION arrives', () => {
    const harness = createAuthHarness()

    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )

    expect(screen.getByTestId('status')).toHaveTextContent('initializing')
    expect(screen.getByTestId('session')).toHaveTextContent('no-session')
    expect(screen.getByTestId('error')).toHaveTextContent('no-error')
    expect(harness.onAuthStateChange).toHaveBeenCalledOnce()
  })

  it('resolves INITIAL_SESSION without a session to anonymous', () => {
    const harness = createAuthHarness()
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )

    harness.emit(0, 'INITIAL_SESSION', null)

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    expect(screen.getByTestId('error')).toHaveTextContent('no-error')
  })

  it('restores an authenticated INITIAL_SESSION', () => {
    const harness = createAuthHarness()
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )

    harness.emit(0, 'INITIAL_SESSION', createSession('restored-user'))

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('session')).toHaveTextContent('session')
    expect(screen.getByTestId('user')).toHaveTextContent('restored-user')
  })

  it('reacts to subsequent signed-in, refreshed, and signed-out events', () => {
    const harness = createAuthHarness()
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )

    harness.emit(0, 'INITIAL_SESSION', null)
    harness.emit(0, 'SIGNED_IN', createSession('signed-in-user'))
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('signed-in-user')

    harness.emit(0, 'TOKEN_REFRESHED', createSession('refreshed-user'))
    expect(screen.getByTestId('user')).toHaveTextContent('refreshed-user')

    harness.emit(0, 'SIGNED_OUT', null)
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('session')).toHaveTextContent('no-session')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
  })

  it('keeps configuration errors separate from anonymous lifecycle state', () => {
    render(
      <AuthProvider clientState={{
        status: 'unavailable',
        message: AUTHENTICATION_UNAVAILABLE_MESSAGE,
      }}>
        <AuthProbe />
      </AuthProvider>,
    )

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('session')).toHaveTextContent('no-session')
    expect(screen.getByTestId('error')).toHaveTextContent(AUTHENTICATION_UNAVAILABLE_MESSAGE)
  })

  it('reports subscription setup failures without exposing provider details', async () => {
    const harness = createAuthHarness({ failOnSubscribe: true })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      render(
        <AuthProvider clientState={harness.clientState}>
          <AuthProbe />
        </AuthProvider>,
      )

      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
      expect(screen.getByTestId('error')).toHaveTextContent(AUTHENTICATION_UNAVAILABLE_MESSAGE)
      expect(screen.getByTestId('error')).not.toHaveTextContent('sensitive provider details')
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
    }
  })

  it('unsubscribes normally when the provider unmounts', () => {
    const harness = createAuthHarness()
    const view = render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )

    view.unmount()

    expect(harness.unsubscribeFunctions[0]).toHaveBeenCalledOnce()
  })

  it('cleans up and resubscribes safely under Strict Mode', () => {
    const harness = createAuthHarness()
    const view = render(
      <StrictMode>
        <AuthProvider clientState={harness.clientState}>
          <AuthProbe />
        </AuthProvider>
      </StrictMode>,
    )

    expect(harness.onAuthStateChange).toHaveBeenCalledTimes(2)
    expect(harness.unsubscribeFunctions[0]).toHaveBeenCalledOnce()
    expect(harness.unsubscribeFunctions[1]).not.toHaveBeenCalled()

    harness.emit(0, 'INITIAL_SESSION', createSession('stale-user'))
    expect(screen.getByTestId('status')).toHaveTextContent('initializing')

    harness.emit(1, 'INITIAL_SESSION', null)
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')

    view.unmount()
    expect(harness.unsubscribeFunctions[1]).toHaveBeenCalledOnce()
  })
})
