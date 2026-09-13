import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthLifecycleStatus = 'initializing' | 'anonymous' | 'authenticated'

export interface AuthContextValue {
  status: AuthLifecycleStatus
  session: Session | null
  user: User | null
  error: string | null
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) throw new Error('useAuth must be used within AuthProvider')

  return context
}
