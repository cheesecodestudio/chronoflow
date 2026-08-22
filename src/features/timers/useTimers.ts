import { useEffect, useState } from 'react'

import type { Timer, TimerDraft, TimerColor, TimerIcon } from './timer.types'
import type { TimerRepository } from './timer.repository'
import { LocalStorageTimerRepository } from '../../infrastructure/storage/LocalStorageTimerRepository'
import { createTimer, updateTimerCustomization } from './timer.use-cases'

const browserRepository = new LocalStorageTimerRepository()

export function useTimers(repository: TimerRepository = browserRepository) {
  const [timers, setTimers] = useState<Timer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setIsLoading(true)

    try {
      setTimers(await repository.getAll())
      setError(null)
    } catch {
      setError('No se pudieron cargar los timers.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    void repository
      .getAll()
      .then((items) => {
        if (isActive) {
          setTimers(items)
          setError(null)
        }
      })
      .catch(() => {
        if (isActive) {
          setError('No se pudieron cargar los timers.')
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [repository])

  async function create(draft: TimerDraft) {
    await createTimer(repository, draft)
    await reload()
  }

  async function remove(id: string) {
    await repository.delete(id)
    await reload()
  }

  async function restart(id: string) {
    await repository.restart(id)
    await reload()
  }

  async function updateCustomization(id: string, color: TimerColor, icon: TimerIcon) {
    await updateTimerCustomization(repository, id, color, icon)
    await reload()
  }

  return { timers, isLoading, error, create, remove, restart, reload, updateCustomization }
}