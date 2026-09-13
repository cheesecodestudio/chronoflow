import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { AuthContext, type AuthLifecycleStatus } from './AuthContext'
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

  return (
    <AuthContext.Provider value={{
      ...authState,
      user: authState.session?.user ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
