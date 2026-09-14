import { createContext, useContext } from 'react'

import type { TimerRepository } from './timer.repository'

export const TIMER_PERSISTENCE_UNAVAILABLE_MESSAGE = 'La persistencia de timers no está disponible. Inténtalo nuevamente más tarde.'

export type TimerRepositoryStatus = 'initializing' | 'available' | 'unavailable'

export interface TimerRepositoryContextValue {
  repository: TimerRepository | null
  status: TimerRepositoryStatus
  error: string | null
}

export const TimerRepositoryContext = createContext<TimerRepositoryContextValue | undefined>(undefined)

export function useTimerRepository(
  injectedRepository?: TimerRepository,
): TimerRepository | null {
  return useTimerRepositoryState(injectedRepository).repository
}

export function useTimerRepositoryState(
  injectedRepository?: TimerRepository,
): TimerRepositoryContextValue {
  const selectedRepository = useContext(TimerRepositoryContext)

  if (selectedRepository !== undefined) return selectedRepository

  if (injectedRepository) {
    return {
      repository: injectedRepository,
      status: 'available',
      error: null,
    }
  }

  throw new Error('useTimerRepositoryState must be used within TimerRepositoryProvider or receive an injected repository')
}
