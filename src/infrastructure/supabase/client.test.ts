import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import {
  AUTHENTICATION_UNAVAILABLE_MESSAGE,
  createSupabaseBrowserClientState,
  type SupabaseBrowserEnvironment,
} from './client'

describe('Supabase browser client configuration', () => {
  it.each([
    ['empty configuration', {}],
    ['missing project URL', { VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key' }],
    ['missing publishable key', { VITE_SUPABASE_URL: 'https://project.supabase.co' }],
    [
      'blank values',
      {
        VITE_SUPABASE_URL: '   ',
        VITE_SUPABASE_PUBLISHABLE_KEY: '\t',
      },
    ],
  ] satisfies Array<[string, SupabaseBrowserEnvironment]>)('returns unavailable for %s', (_name, environment) => {
    const clientFactory = vi.fn(() => ({}) as SupabaseClient)

    expect(createSupabaseBrowserClientState(environment, clientFactory)).toEqual({
      status: 'unavailable',
      message: AUTHENTICATION_UNAVAILABLE_MESSAGE,
    })
    expect(clientFactory).not.toHaveBeenCalled()
  })

  it('creates a client with only the approved trimmed browser values', () => {
    const client = {} as SupabaseClient
    const clientFactory = vi.fn(() => client)
    const environment = {
      VITE_SUPABASE_URL: '  https://project.supabase.co  ',
      VITE_SUPABASE_PUBLISHABLE_KEY: '  publishable-key  ',
      VITE_SUPABASE_SERVICE_ROLE_KEY: 'must-not-be-used',
    }

    expect(createSupabaseBrowserClientState(environment, clientFactory)).toEqual({
      status: 'available',
      client,
    })
    expect(clientFactory).toHaveBeenCalledOnce()
    expect(clientFactory).toHaveBeenCalledWith('https://project.supabase.co', 'publishable-key')
  })

  it('returns a generic unavailable result without logging configuration failures', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const clientFactory = vi.fn(() => {
      throw new Error('sensitive provider details')
    })

    expect(createSupabaseBrowserClientState({
      VITE_SUPABASE_URL: 'invalid-url',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    }, clientFactory)).toEqual({
      status: 'unavailable',
      message: AUTHENTICATION_UNAVAILABLE_MESSAGE,
    })
    expect(consoleError).not.toHaveBeenCalled()
  })
})
