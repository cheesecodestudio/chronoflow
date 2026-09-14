import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthLifecycleStatus = 'initializing' | 'anonymous' | 'authenticated'
export type PendingAuthOperation = 'signing-in' | 'signing-out' | null

export interface AuthContextValue {
  status: AuthLifecycleStatus
  session: Session | null
  user: User | null
  error: string | null
  pendingOperation: PendingAuthOperation
  operationError: string | null
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) throw new Error('useAuth must be used within AuthProvider')

  return context
}
