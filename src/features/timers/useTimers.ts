import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { Timer, TimerCustomization, TimerDraft } from './timer.types'
import type { TimerRepository } from './timer.repository'
import { createTimer, updateTimerCustomization } from './timer.use-cases'
import {
  TIMER_PERSISTENCE_UNAVAILABLE_MESSAGE,
  useTimerRepositoryState,
  type TimerRepositoryStatus,
} from './TimerRepositoryContext'

interface RepositoryIdentity {
  repository: TimerRepository | null
  status: TimerRepositoryStatus
}

interface TimerState {
  error: string | null
  identity: RepositoryIdentity | null
  isLoading: boolean
  timers: Timer[]
}

const INITIAL_STATE: TimerState = {
  error: null,
  identity: null,
  isLoading: true,
  timers: [],
}

export function useTimers(injectedRepository?: TimerRepository) {
  const repositoryState = useTimerRepositoryState(injectedRepository)
  const { repository } = repositoryState
  const identity = useMemo<RepositoryIdentity>(() => ({
    repository,
    status: repositoryState.status,
  }), [repository, repositoryState.status])
  const identityRef = useRef(identity)
  const [state, setState] = useState<TimerState>(INITIAL_STATE)

  useLayoutEffect(() => {
    identityRef.current = identity
  }, [identity])

  function isCurrent(operationIdentity: RepositoryIdentity): boolean {
    return identityRef.current === operationIdentity
  }

  async function load(operationIdentity: RepositoryIdentity): Promise<boolean> {
    const operationRepository = operationIdentity.repository
    if (!operationRepository || !isCurrent(operationIdentity)) return false

    setState((current) => ({
      error: null,
      identity: operationIdentity,
      isLoading: true,
      timers: current.identity === operationIdentity ? current.timers : [],
    }))

    try {
      const timers = await operationRepository.getAll()
      if (!isCurrent(operationIdentity)) return false

      setState({
        error: null,
        identity: operationIdentity,
        isLoading: false,
        timers,
      })
      return true
    } catch {
      if (!isCurrent(operationIdentity)) return false

      setState({
        error: 'No se pudieron cargar los timers.',
        identity: operationIdentity,
        isLoading: false,
        timers: [],
      })
      return false
    }
  }

  useEffect(() => {
    if (identity.status === 'initializing') {
      setState({
        error: null,
        identity,
        isLoading: true,
        timers: [],
      })
      return
    }

    if (identity.status === 'unavailable') {
      setState({
        error: TIMER_PERSISTENCE_UNAVAILABLE_MESSAGE,
        identity,
        isLoading: false,
        timers: [],
      })
      return
    }

    void load(identity)
  }, [identity])

  async function reload(): Promise<boolean> {
    return load(identityRef.current)
  }

  async function create(draft: TimerDraft): Promise<boolean> {
    const operationIdentity = identityRef.current
    const operationRepository = operationIdentity.repository
    if (!operationRepository) return false

    try {
      await createTimer(operationRepository, draft, {
        canPersist: () => isCurrent(operationIdentity),
      })
      if (!isCurrent(operationIdentity)) return false
      await load(operationIdentity)
      return isCurrent(operationIdentity)
    } catch (error) {
      if (isCurrent(operationIdentity)) throw error
      return false
    }
  }

  async function remove(id: string): Promise<boolean> {
    const operationIdentity = identityRef.current
    const operationRepository = operationIdentity.repository
    if (!operationRepository) return false

    try {
      await operationRepository.delete(id)
      if (!isCurrent(operationIdentity)) return false
      await load(operationIdentity)
      return isCurrent(operationIdentity)
    } catch (error) {
      if (isCurrent(operationIdentity)) throw error
      return false
    }
  }

  async function restart(id: string): Promise<boolean> {
    const operationIdentity = identityRef.current
    const operationRepository = operationIdentity.repository
    if (!operationRepository) return false

    try {
      await operationRepository.restart(id)
      if (!isCurrent(operationIdentity)) return false
      await load(operationIdentity)
      return isCurrent(operationIdentity)
    } catch (error) {
      if (isCurrent(operationIdentity)) throw error
      return false
    }
  }

  async function updateCustomization(
    id: string,
    customization: Required<TimerCustomization>,
  ): Promise<boolean> {
    const operationIdentity = identityRef.current
    const operationRepository = operationIdentity.repository
    if (!operationRepository) return false

    try {
      const updatedTimer = await updateTimerCustomization(operationRepository, id, customization)
      if (!isCurrent(operationIdentity)) return false

      setState((current) => current.identity === operationIdentity
        ? {
            ...current,
            error: null,
            timers: current.timers.map((timer) => (
              timer.id === updatedTimer.id ? updatedTimer : timer
            )),
          }
        : current)
      return true
    } catch (error) {
      if (isCurrent(operationIdentity)) throw error
      return false
    }
  }

  const hasCurrentState = state.identity === identity

  return {
    timers: hasCurrentState ? state.timers : [],
    isLoading: !hasCurrentState || state.isLoading,
    error: hasCurrentState ? state.error : null,
    repositoryIdentity: identity,
    create,
    remove,
    restart,
    updateCustomization,
    reload,
  }
}
