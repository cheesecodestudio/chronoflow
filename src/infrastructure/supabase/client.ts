import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

export const AUTHENTICATION_UNAVAILABLE_MESSAGE = 'Authentication unavailable' as const

export interface SupabaseBrowserEnvironment {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

export type SupabaseBrowserClientState =
  | {
      readonly status: 'available'
      readonly client: SupabaseClient<Database>
    }
  | {
      readonly status: 'unavailable'
      readonly message: typeof AUTHENTICATION_UNAVAILABLE_MESSAGE
    }

type SupabaseClientFactory = (url: string, publishableKey: string) => SupabaseClient<Database>

function unavailableState(): SupabaseBrowserClientState {
  return {
    status: 'unavailable',
    message: AUTHENTICATION_UNAVAILABLE_MESSAGE,
  }
}

export function createSupabaseBrowserClientState(
  environment: SupabaseBrowserEnvironment,
  clientFactory: SupabaseClientFactory = (url, publishableKey) => createClient<Database>(url, publishableKey),
): SupabaseBrowserClientState {
  const url = environment.VITE_SUPABASE_URL?.trim()
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url || !publishableKey) return unavailableState()

  try {
    return {
      status: 'available',
      client: clientFactory(url, publishableKey),
    }
  } catch {
    return unavailableState()
  }
}

export const supabaseBrowserClient = createSupabaseBrowserClientState({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
})
