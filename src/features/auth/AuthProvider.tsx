import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import {
  AuthContext,
  type AuthLifecycleStatus,
  type PendingAuthOperation,
  type SignUpOutcome,
} from './AuthContext'
import {
  AUTHENTICATION_UNAVAILABLE_MESSAGE,
  supabaseBrowserClient,
  type SupabaseBrowserClientState,
} from '../../infrastructure/supabase/client'

interface AuthState {
  status: AuthLifecycleStatus
  session: Session | null
  error: string | null
}

interface AuthProviderProps {
  children: ReactNode
  clientState?: SupabaseBrowserClientState
}

const INITIAL_AUTH_STATE: AuthState = {
  status: 'initializing',
  session: null,
  error: null,
}

const SIGN_IN_ERROR_MESSAGE = 'Unable to sign in'
const SIGN_UP_ERROR_MESSAGE = 'Unable to create account'
const SIGN_OUT_ERROR_MESSAGE = 'Unable to sign out'
const OPERATION_IN_PROGRESS_ERROR_MESSAGE = 'Authentication operation already in progress'

function initialState(clientState: SupabaseBrowserClientState): AuthState {
  if (clientState.status === 'available') return INITIAL_AUTH_STATE

  return {
    status: 'anonymous',
    session: null,
    error: clientState.message,
  }
}

function stateFromSession(session: Session | null): AuthState {
  return {
    status: session ? 'authenticated' : 'anonymous',
    session,
    error: null,
  }
}

export function AuthProvider({ children, clientState = supabaseBrowserClient }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(() => initialState(clientState))
  const [pendingOperation, setPendingOperation] = useState<PendingAuthOperation>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const pendingOperationRef = useRef<PendingAuthOperation>(null)

  useEffect(() => {
    if (clientState.status === 'unavailable') return

    let isActive = true

    try {
      const { data: { subscription } } = clientState.client.auth.onAuthStateChange((_event, session) => {
        if (isActive) setAuthState(stateFromSession(session))
      })

      return () => {
        isActive = false
        subscription.unsubscribe()
      }
    } catch {
      queueMicrotask(() => {
        if (isActive) {
          setAuthState({
            status: 'anonymous',
            session: null,
            error: AUTHENTICATION_UNAVAILABLE_MESSAGE,
          })
        }
      })

      return () => {
        isActive = false
      }
    }
  }, [clientState])

  function beginOperation(operation: Exclude<PendingAuthOperation, null>): boolean {
    if (clientState.status === 'unavailable') return false

    if (pendingOperationRef.current) {
      setOperationError(OPERATION_IN_PROGRESS_ERROR_MESSAGE)
      return false
    }

    pendingOperationRef.current = operation
    setPendingOperation(operation)
    setOperationError(null)
    return true
  }

  function finishOperation() {
    pendingOperationRef.current = null
    setPendingOperation(null)
  }

  async function signInWithPassword(email: string, password: string): Promise<void> {
    if (clientState.status === 'unavailable' || !beginOperation('signing-in')) return

    try {
      const { error } = await clientState.client.auth.signInWithPassword({ email, password })
      if (error) setOperationError(SIGN_IN_ERROR_MESSAGE)
    } catch {
      setOperationError(SIGN_IN_ERROR_MESSAGE)
    } finally {
      finishOperation()
    }
  }

  async function signUp(email: string, password: string): Promise<SignUpOutcome | null> {
    if (clientState.status === 'unavailable' || !beginOperation('signing-up')) return null

    try {
      const emailRedirectTo =
        new URL('/manage', window.location.origin).href
      const { data, error } = await clientState.client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      })

      if (error || !data.user) {
        setOperationError(SIGN_UP_ERROR_MESSAGE)
        return null
      }

      return data.session ? 'session' : 'confirmation-required'
    } catch {
      setOperationError(SIGN_UP_ERROR_MESSAGE)
      return null
    } finally {
      finishOperation()
    }
  }

  async function signOut(): Promise<void> {
    if (clientState.status === 'unavailable' || !beginOperation('signing-out')) return

    try {
      const { error } = await clientState.client.auth.signOut({ scope: 'local' })
      if (error) setOperationError(SIGN_OUT_ERROR_MESSAGE)
    } catch {
      setOperationError(SIGN_OUT_ERROR_MESSAGE)
    } finally {
      finishOperation()
    }
  }

  return (
    <AuthContext.Provider value={{
      ...authState,
      user: authState.session?.user ?? null,
      pendingOperation,
      operationError,
      signInWithPassword,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
