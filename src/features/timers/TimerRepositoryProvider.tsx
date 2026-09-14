import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { useAuth } from '../auth/AuthContext'
import type { TimerRepository } from './timer.repository'
import {
  TIMER_PERSISTENCE_UNAVAILABLE_MESSAGE,
  TimerRepositoryContext,
  type TimerRepositoryContextValue,
} from './TimerRepositoryContext'
import { LocalStorageTimerRepository } from '../../infrastructure/storage/LocalStorageTimerRepository'
import { SupabaseTimerRepository } from '../../infrastructure/supabase/SupabaseTimerRepository'
import {
  supabaseBrowserClient,
  type SupabaseBrowserClientState,
} from '../../infrastructure/supabase/client'

type SupabaseRepositoryFactory = (
  client: Extract<SupabaseBrowserClientState, { status: 'available' }>['client'],
  userId: string,
) => TimerRepository

const createSupabaseRepository: SupabaseRepositoryFactory = (client, userId) => (
  new SupabaseTimerRepository(client, userId)
)

type LocalRepositoryFactory = () => TimerRepository

const createLocalRepository: LocalRepositoryFactory = () => new LocalStorageTimerRepository()

interface TimerRepositoryProviderProps {
  children: ReactNode
  clientState?: SupabaseBrowserClientState
  localRepository?: TimerRepository
  localRepositoryFactory?: LocalRepositoryFactory
  supabaseRepositoryFactory?: SupabaseRepositoryFactory
}

export function TimerRepositoryProvider({
  children,
  clientState = supabaseBrowserClient,
  localRepository,
  localRepositoryFactory = createLocalRepository,
  supabaseRepositoryFactory = createSupabaseRepository,
}: TimerRepositoryProviderProps) {
  const { status, user } = useAuth()
  const userId = status === 'authenticated' ? user?.id ?? null : null
  const client = clientState.status === 'available' ? clientState.client : null
  const [resolvedLocalRepository, setResolvedLocalRepository] = useState<TimerRepository | null>(
    () => localRepository ?? null,
  )

  useEffect(() => {
    if (status !== 'anonymous' || resolvedLocalRepository) return

    let isActive = true
    queueMicrotask(() => {
      if (isActive) setResolvedLocalRepository(localRepository ?? localRepositoryFactory())
    })

    return () => {
      isActive = false
    }
  }, [localRepository, localRepositoryFactory, resolvedLocalRepository, status])

  const repositoryState = useMemo<TimerRepositoryContextValue>(() => {
    if (status === 'initializing') {
      return { repository: null, status: 'initializing', error: null }
    }

    if (status === 'anonymous') {
      return resolvedLocalRepository
        ? { repository: resolvedLocalRepository, status: 'available', error: null }
        : { repository: null, status: 'initializing', error: null }
    }

    if (!client || !userId) {
      return {
        repository: null,
        status: 'unavailable',
        error: TIMER_PERSISTENCE_UNAVAILABLE_MESSAGE,
      }
    }

    return {
      repository: supabaseRepositoryFactory(client, userId),
      status: 'available',
      error: null,
    }
  }, [client, resolvedLocalRepository, status, supabaseRepositoryFactory, userId])

  return (
    <TimerRepositoryContext.Provider value={repositoryState}>
      {children}
    </TimerRepositoryContext.Provider>
  )
}
