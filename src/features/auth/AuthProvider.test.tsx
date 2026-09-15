import { StrictMode, useEffect } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from './AuthProvider'
import { useAuth, type AuthContextValue } from './AuthContext'
import {
  AUTHENTICATION_UNAVAILABLE_MESSAGE,
  type SupabaseBrowserClientState,
} from '../../infrastructure/supabase/client'

type AuthStateChangeCallback = Parameters<SupabaseClient['auth']['onAuthStateChange']>[0]
type AuthEvent = Parameters<AuthStateChangeCallback>[0]
type SignInResult = Awaited<ReturnType<SupabaseClient['auth']['signInWithPassword']>>
type SignUpResult = Awaited<ReturnType<SupabaseClient['auth']['signUp']>>
type SignOutResult = Awaited<ReturnType<SupabaseClient['auth']['signOut']>>

const SUCCESSFUL_SIGN_IN = {
  data: { user: null, session: null },
  error: null,
} as unknown as SignInResult

const SUCCESSFUL_SIGN_UP_WITH_SESSION = {
  data: { user: { id: 'new-user' }, session: createSession('new-user') },
  error: null,
} as unknown as SignUpResult

const SUCCESSFUL_SIGN_UP_WITHOUT_SESSION = {
  data: { user: { id: 'pending-user' }, session: null },
  error: null,
} as unknown as SignUpResult

const SUCCESSFUL_SIGN_OUT = { error: null } as SignOutResult

function createSession(userId: string): Session {
  return { user: { id: userId } } as Session
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

async function expectNoConsoleOutput(run: () => Promise<void>) {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)

  try {
    await run()
    expect(consoleError).not.toHaveBeenCalled()
    expect(consoleLog).not.toHaveBeenCalled()
  } finally {
    consoleError.mockRestore()
    consoleLog.mockRestore()
  }
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
  const signInWithPassword = vi.fn(async (): Promise<SignInResult> => SUCCESSFUL_SIGN_IN)
  const signUp = vi.fn(async (): Promise<SignUpResult> => SUCCESSFUL_SIGN_UP_WITH_SESSION)
  const signOut = vi.fn(async (): Promise<SignOutResult> => SUCCESSFUL_SIGN_OUT)
  const client = {
    auth: { onAuthStateChange, signInWithPassword, signUp, signOut },
  } as unknown as SupabaseClient

  return {
    clientState: { status: 'available', client } as const,
    onAuthStateChange,
    signInWithPassword,
    signUp,
    signOut,
    unsubscribeFunctions,
    emit(index: number, event: AuthEvent, session: Session | null) {
      act(() => {
        callbacks[index]!(event, session)
      })
    },
  }
}

let latestAuth: AuthContextValue | null = null

function authContext(): AuthContextValue {
  if (!latestAuth) throw new Error('Auth context was not rendered')
  return latestAuth
}

function AuthProbe() {
  const auth = useAuth()
  const { status, session, user, error, pendingOperation, operationError } = auth

  useEffect(() => {
    latestAuth = auth
  }, [auth])

  return (
    <div>
      <output data-testid="status">{status}</output>
      <output data-testid="session">{session ? 'session' : 'no-session'}</output>
      <output data-testid="user">{user?.id ?? 'no-user'}</output>
      <output data-testid="error">{error ?? 'no-error'}</output>
      <output data-testid="pending-operation">{pendingOperation ?? 'no-pending-operation'}</output>
      <output data-testid="operation-error">{operationError ?? 'no-operation-error'}</output>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    latestAuth = null
  })

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

  it('forwards credentials once and waits for SIGNED_IN before changing lifecycle state', async () => {
    const harness = createAuthHarness()
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', null)

    await act(async () => {
      await authContext().signInWithPassword('person@example.com', 'password-for-supabase-only')
    })

    expect(harness.signInWithPassword).toHaveBeenCalledOnce()
    expect(harness.signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'password-for-supabase-only',
    })
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
    expect(screen.getByTestId('operation-error')).toHaveTextContent('no-operation-error')
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('session')).toHaveTextContent('no-session')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')

    harness.emit(0, 'SIGNED_IN', createSession('signed-in-by-event'))
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('signed-in-by-event')
  })

  it('returns the immediate-session signup outcome without mutating lifecycle state directly', async () => {
    const harness = createAuthHarness()
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', null)

    let outcome: Awaited<ReturnType<AuthContextValue['signUp']>> = null
    await act(async () => {
      outcome = await authContext().signUp('person@example.com', 'password-value')
    })

    expect(outcome).toBe('session')
    expect(harness.signUp).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'password-value',
      options: { emailRedirectTo: new URL('/manage', window.location.origin).href },
    })
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')

    harness.emit(0, 'SIGNED_IN', createSession('new-user'))
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
  })

  it('returns the confirmation-required signup outcome and remains anonymous', async () => {
    const harness = createAuthHarness()
    harness.signUp.mockResolvedValueOnce(SUCCESSFUL_SIGN_UP_WITHOUT_SESSION)
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', null)

    let outcome: Awaited<ReturnType<AuthContextValue['signUp']>> = null
    await act(async () => {
      outcome = await authContext().signUp('person@example.com', 'password-value')
    })

    expect(outcome).toBe('confirmation-required')
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('session')).toHaveTextContent('no-session')
    expect(screen.getByTestId('operation-error')).toHaveTextContent('no-operation-error')
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
  })

  it('returns null and exposes only a safe error when signup fails', async () => {
    const harness = createAuthHarness()
    const rawProviderError = 'provider rejected password-value'
    harness.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error(rawProviderError),
    } as unknown as SignUpResult)
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', null)

    let outcome: Awaited<ReturnType<AuthContextValue['signUp']>> = null
    await act(async () => {
      outcome = await authContext().signUp('person@example.com', 'password-value')
    })

    expect(outcome).toBeNull()
    expect(screen.getByTestId('operation-error')).toHaveTextContent('Unable to create account')
    expect(screen.getByTestId('operation-error')).not.toHaveTextContent(rawProviderError)
    expect(document.body).not.toHaveTextContent('password-value')
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
  })

  it('returns null and exposes only a safe error when signup throws', async () => {
    const harness = createAuthHarness()
    const rawProviderError = 'raw thrown signup failure'
    harness.signUp.mockRejectedValueOnce(new Error(rawProviderError))
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', null)

    let outcome: Awaited<ReturnType<AuthContextValue['signUp']>> = null
    await act(async () => {
      outcome = await authContext().signUp('person@example.com', 'password-value')
    })

    expect(outcome).toBeNull()
    expect(screen.getByTestId('operation-error')).toHaveTextContent('Unable to create account')
    expect(screen.getByTestId('operation-error')).not.toHaveTextContent(rawProviderError)
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
  })

  it('blocks duplicate signup operations and clears pending after completion', async () => {
    const harness = createAuthHarness()
    const signUp = deferred<SignUpResult>()
    harness.signUp.mockReturnValueOnce(signUp.promise)
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', null)

    let firstOperation!: Promise<Awaited<ReturnType<AuthContextValue['signUp']>>>
    let duplicateOperation!: Promise<Awaited<ReturnType<AuthContextValue['signUp']>>>
    act(() => {
      firstOperation = authContext().signUp('person@example.com', 'first-password')
      duplicateOperation = authContext().signUp('person@example.com', 'duplicate-password')
    })

    await act(async () => {
      expect(await duplicateOperation).toBeNull()
    })
    expect(harness.signUp).toHaveBeenCalledOnce()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('signing-up')
    expect(screen.getByTestId('operation-error')).toHaveTextContent('Authentication operation already in progress')

    await act(async () => {
      signUp.resolve(SUCCESSFUL_SIGN_UP_WITH_SESSION)
      expect(await firstOperation).toBe('session')
    })
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
  })

  it('blocks duplicate sign-in calls synchronously and clears pending after success', async () => {
    const harness = createAuthHarness()
    const signIn = deferred<SignInResult>()
    harness.signInWithPassword.mockReturnValueOnce(signIn.promise)
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', null)

    let firstOperation!: Promise<void>
    act(() => {
      firstOperation = authContext().signInWithPassword('person@example.com', 'first-password')
      void authContext().signInWithPassword('person@example.com', 'duplicate-password')
    })

    expect(harness.signInWithPassword).toHaveBeenCalledOnce()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('signing-in')

    await act(async () => {
      signIn.resolve(SUCCESSFUL_SIGN_IN)
      await firstOperation
    })
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
  })

  it('rejects sign-out independently while sign-in is pending and preserves its error after success', async () => {
    const harness = createAuthHarness()
    const signIn = deferred<SignInResult>()
    harness.signInWithPassword.mockReturnValueOnce(signIn.promise)
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', null)

    let signInOperation!: Promise<void>
    let rejectedSignOut!: Promise<void>
    let signInSettled = false
    act(() => {
      signInOperation = authContext().signInWithPassword('person@example.com', 'sign-in-password')
      void signInOperation.then(() => {
        signInSettled = true
      })
      rejectedSignOut = authContext().signOut()
    })

    expect(rejectedSignOut).toBeInstanceOf(Promise)
    expect(rejectedSignOut).not.toBe(signInOperation)
    await act(async () => {
      await rejectedSignOut
    })
    expect(signInSettled).toBe(false)
    expect(harness.signInWithPassword).toHaveBeenCalledOnce()
    expect(harness.signOut).not.toHaveBeenCalled()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('signing-in')
    expect(screen.getByTestId('operation-error').textContent).toBe(
      'Authentication operation already in progress',
    )
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('session')).toHaveTextContent('no-session')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')

    await act(async () => {
      signIn.resolve(SUCCESSFUL_SIGN_IN)
      await signInOperation
    })

    expect(harness.signOut).not.toHaveBeenCalled()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
    expect(screen.getByTestId('operation-error').textContent).toBe(
      'Authentication operation already in progress',
    )

    const nextSignOut = deferred<SignOutResult>()
    harness.signOut.mockReturnValueOnce(nextSignOut.promise)
    let acceptedSignOut!: Promise<void>
    act(() => {
      acceptedSignOut = authContext().signOut()
    })
    expect(harness.signOut).toHaveBeenCalledOnce()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('signing-out')
    expect(screen.getByTestId('operation-error')).toHaveTextContent('no-operation-error')

    await act(async () => {
      nextSignOut.resolve(SUCCESSFUL_SIGN_OUT)
      await acceptedSignOut
    })
  })

  it('replaces a concurrency error with a returned sign-in error and preserves identity', async () => {
    const harness = createAuthHarness()
    const rawProviderError = 'provider rejected secret-password-value'
    const failedSignIn = {
      data: { user: null, session: null },
      error: new Error(rawProviderError),
    } as unknown as SignInResult
    const signIn = deferred<SignInResult>()
    harness.signInWithPassword.mockReturnValueOnce(signIn.promise)

    await expectNoConsoleOutput(async () => {
      render(
        <AuthProvider clientState={harness.clientState}>
          <AuthProbe />
        </AuthProvider>,
      )
      harness.emit(0, 'INITIAL_SESSION', createSession('existing-user'))

      let signInOperation!: Promise<void>
      let rejectedSignOut!: Promise<void>
      act(() => {
        signInOperation = authContext().signInWithPassword('person@example.com', 'secret-password-value')
        rejectedSignOut = authContext().signOut()
      })
      await act(async () => {
        await rejectedSignOut
      })
      expect(screen.getByTestId('operation-error').textContent).toBe(
        'Authentication operation already in progress',
      )

      await act(async () => {
        signIn.resolve(failedSignIn)
        await signInOperation
      })

      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('session')).toHaveTextContent('session')
      expect(screen.getByTestId('user')).toHaveTextContent('existing-user')
      expect(screen.getByTestId('operation-error').textContent).toBe('Unable to sign in')
      expect(screen.getByTestId('operation-error')).not.toHaveTextContent(rawProviderError)
      expect(document.body).not.toHaveTextContent(rawProviderError)
      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
      expect(document.body).not.toHaveTextContent('secret-password-value')
      expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
      expect(harness.signOut).not.toHaveBeenCalled()
    })
  })

  it('replaces a concurrency error with a thrown sign-in failure and preserves identity', async () => {
    const harness = createAuthHarness()
    const rawProviderError = 'raw thrown sign-in failure'
    const signIn = deferred<SignInResult>()
    harness.signInWithPassword.mockReturnValueOnce(signIn.promise)

    await expectNoConsoleOutput(async () => {
      render(
        <AuthProvider clientState={harness.clientState}>
          <AuthProbe />
        </AuthProvider>,
      )
      harness.emit(0, 'INITIAL_SESSION', null)

      let signInOperation!: Promise<void>
      let rejectedSignOut!: Promise<void>
      act(() => {
        signInOperation = authContext().signInWithPassword('person@example.com', 'throwing-password')
        rejectedSignOut = authContext().signOut()
      })
      await act(async () => {
        await rejectedSignOut
      })
      expect(screen.getByTestId('operation-error').textContent).toBe(
        'Authentication operation already in progress',
      )

      await act(async () => {
        signIn.reject(new Error(rawProviderError))
        await signInOperation
      })

      expect(screen.getByTestId('operation-error').textContent).toBe('Unable to sign in')
      expect(screen.getByTestId('operation-error')).not.toHaveTextContent(rawProviderError)
      expect(document.body).not.toHaveTextContent(rawProviderError)
      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
      expect(document.body).not.toHaveTextContent('throwing-password')
      expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
      expect(screen.getByTestId('session')).toHaveTextContent('no-session')
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(harness.signOut).not.toHaveBeenCalled()
    })
  })

  it('uses local-scope sign-out and waits for SIGNED_OUT before changing lifecycle state', async () => {
    const harness = createAuthHarness()
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', createSession('current-user'))

    await act(async () => {
      await authContext().signOut()
    })

    expect(harness.signOut).toHaveBeenCalledOnce()
    expect(harness.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
    expect(screen.getByTestId('operation-error')).toHaveTextContent('no-operation-error')
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('session')).toHaveTextContent('session')
    expect(screen.getByTestId('user')).toHaveTextContent('current-user')

    harness.emit(0, 'SIGNED_OUT', null)
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('session')).toHaveTextContent('no-session')
  })

  it('blocks duplicate sign-out calls synchronously and clears pending after success', async () => {
    const harness = createAuthHarness()
    const signOut = deferred<SignOutResult>()
    harness.signOut.mockReturnValueOnce(signOut.promise)
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', createSession('current-user'))

    let firstOperation!: Promise<void>
    act(() => {
      firstOperation = authContext().signOut()
      void authContext().signOut()
    })

    expect(harness.signOut).toHaveBeenCalledOnce()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('signing-out')

    await act(async () => {
      signOut.resolve(SUCCESSFUL_SIGN_OUT)
      await firstOperation
    })
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
  })

  it('rejects sign-in independently while sign-out is pending and preserves its error after success', async () => {
    const harness = createAuthHarness()
    const signOut = deferred<SignOutResult>()
    harness.signOut.mockReturnValueOnce(signOut.promise)
    render(
      <AuthProvider clientState={harness.clientState}>
        <AuthProbe />
      </AuthProvider>,
    )
    harness.emit(0, 'INITIAL_SESSION', createSession('current-user'))

    let signOutOperation!: Promise<void>
    let rejectedSignIn!: Promise<void>
    let signOutSettled = false
    act(() => {
      signOutOperation = authContext().signOut()
      void signOutOperation.then(() => {
        signOutSettled = true
      })
      rejectedSignIn = authContext().signInWithPassword('person@example.com', 'blocked-password')
    })

    expect(rejectedSignIn).toBeInstanceOf(Promise)
    expect(rejectedSignIn).not.toBe(signOutOperation)
    await act(async () => {
      await rejectedSignIn
    })
    expect(signOutSettled).toBe(false)
    expect(harness.signOut).toHaveBeenCalledOnce()
    expect(harness.signInWithPassword).not.toHaveBeenCalled()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('signing-out')
    expect(screen.getByTestId('operation-error').textContent).toBe(
      'Authentication operation already in progress',
    )
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('session')).toHaveTextContent('session')
    expect(screen.getByTestId('user')).toHaveTextContent('current-user')
    expect(document.body).not.toHaveTextContent('blocked-password')

    await act(async () => {
      signOut.resolve(SUCCESSFUL_SIGN_OUT)
      await signOutOperation
    })

    expect(harness.signInWithPassword).not.toHaveBeenCalled()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
    expect(screen.getByTestId('operation-error').textContent).toBe(
      'Authentication operation already in progress',
    )

    const nextSignIn = deferred<SignInResult>()
    harness.signInWithPassword.mockReturnValueOnce(nextSignIn.promise)
    let acceptedSignIn!: Promise<void>
    act(() => {
      acceptedSignIn = authContext().signInWithPassword('person@example.com', 'accepted-password')
    })
    expect(harness.signInWithPassword).toHaveBeenCalledOnce()
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('signing-in')
    expect(screen.getByTestId('operation-error')).toHaveTextContent('no-operation-error')

    await act(async () => {
      nextSignIn.resolve(SUCCESSFUL_SIGN_IN)
      await acceptedSignIn
    })
  })

  it('replaces a concurrency error with a returned sign-out error and preserves identity', async () => {
    const harness = createAuthHarness()
    const rawProviderError = 'raw returned sign-out error'
    const failedSignOut = {
      error: new Error(rawProviderError),
    } as unknown as SignOutResult
    const signOut = deferred<SignOutResult>()
    harness.signOut.mockReturnValueOnce(signOut.promise)

    await expectNoConsoleOutput(async () => {
      render(
        <AuthProvider clientState={harness.clientState}>
          <AuthProbe />
        </AuthProvider>,
      )
      harness.emit(0, 'INITIAL_SESSION', createSession('current-user'))

      let signOutOperation!: Promise<void>
      let rejectedSignIn!: Promise<void>
      act(() => {
        signOutOperation = authContext().signOut()
        rejectedSignIn = authContext().signInWithPassword('person@example.com', 'blocked-password')
      })
      await act(async () => {
        await rejectedSignIn
      })
      expect(screen.getByTestId('operation-error').textContent).toBe(
        'Authentication operation already in progress',
      )

      await act(async () => {
        signOut.resolve(failedSignOut)
        await signOutOperation
      })

      expect(screen.getByTestId('operation-error').textContent).toBe('Unable to sign out')
      expect(screen.getByTestId('operation-error')).not.toHaveTextContent(rawProviderError)
      expect(document.body).not.toHaveTextContent(rawProviderError)
      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
      expect(document.body).not.toHaveTextContent('blocked-password')
      expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('session')).toHaveTextContent('session')
      expect(screen.getByTestId('user')).toHaveTextContent('current-user')
      expect(harness.signInWithPassword).not.toHaveBeenCalled()
    })
  })

  it('replaces a concurrency error with a thrown sign-out failure and preserves identity', async () => {
    const harness = createAuthHarness()
    const rawProviderError = 'raw thrown sign-out failure'
    const signOut = deferred<SignOutResult>()
    harness.signOut.mockReturnValueOnce(signOut.promise)

    await expectNoConsoleOutput(async () => {
      render(
        <AuthProvider clientState={harness.clientState}>
          <AuthProbe />
        </AuthProvider>,
      )
      harness.emit(0, 'INITIAL_SESSION', createSession('current-user'))

      let signOutOperation!: Promise<void>
      let rejectedSignIn!: Promise<void>
      act(() => {
        signOutOperation = authContext().signOut()
        rejectedSignIn = authContext().signInWithPassword('person@example.com', 'blocked-password')
      })
      await act(async () => {
        await rejectedSignIn
      })
      expect(screen.getByTestId('operation-error').textContent).toBe(
        'Authentication operation already in progress',
      )

      await act(async () => {
        signOut.reject(new Error(rawProviderError))
        await signOutOperation
      })

      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('session')).toHaveTextContent('session')
      expect(screen.getByTestId('user')).toHaveTextContent('current-user')
      expect(screen.getByTestId('operation-error').textContent).toBe('Unable to sign out')
      expect(screen.getByTestId('operation-error')).not.toHaveTextContent(rawProviderError)
      expect(document.body).not.toHaveTextContent(rawProviderError)
      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
      expect(document.body).not.toHaveTextContent('blocked-password')
      expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
      expect(harness.signInWithPassword).not.toHaveBeenCalled()
    })
  })

  it('performs no auth operation when Supabase configuration is unavailable', async () => {
    const harness = createAuthHarness()
    const unavailableClientState = {
      status: 'unavailable',
      message: AUTHENTICATION_UNAVAILABLE_MESSAGE,
      client: harness.clientState.client,
    } as unknown as SupabaseBrowserClientState
    render(
      <AuthProvider clientState={unavailableClientState}>
        <AuthProbe />
      </AuthProvider>,
    )

    await act(async () => {
      await authContext().signInWithPassword('person@example.com', 'password')
      expect(await authContext().signUp('person@example.com', 'password')).toBeNull()
      await authContext().signOut()
    })

    expect(harness.signInWithPassword).not.toHaveBeenCalled()
    expect(harness.signUp).not.toHaveBeenCalled()
    expect(harness.signOut).not.toHaveBeenCalled()
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('error')).toHaveTextContent(AUTHENTICATION_UNAVAILABLE_MESSAGE)
    expect(screen.getByTestId('operation-error')).toHaveTextContent('no-operation-error')
    expect(screen.getByTestId('pending-operation')).toHaveTextContent('no-pending-operation')
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
