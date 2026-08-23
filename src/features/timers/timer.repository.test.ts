import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'

import {
  LocalStorageTimerRepository,
  TIMER_STORAGE_KEY,
} from '../../infrastructure/storage/LocalStorageTimerRepository'
import type {
  CountdownTimer,
  CounterTimer,
  TimerCustomization,
} from './timer.types'
import { createTimer, TimerValidationException } from './timer.use-cases'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const NOW = Temporal.Instant.from('2024-01-01T00:00:00Z')

function counter(
  id: string,
  position: number,
  customization: TimerCustomization = {},
): CounterTimer {
  return {
    id,
    title: id,
    type: 'counter',
    timeZone: 'UTC',
    startAt: '2023-12-31T00:00:00Z',
    position,
    createdAt: '2023-12-31T00:00:00Z',
    updatedAt: '2023-12-31T00:00:00Z',
    ...customization,
  }
}

function countdown(
  id: string,
  position: number,
  customization: TimerCustomization = {},
): CountdownTimer {
  return {
    id,
    title: id,
    type: 'countdown',
    timeZone: 'UTC',
    targetAt: '2024-02-01T00:00:00Z',
    position,
    createdAt: '2023-12-31T00:00:00Z',
    updatedAt: '2023-12-31T00:00:00Z',
    ...customization,
  }
}

describe('LocalStorageTimerRepository', () => {
  it('creates, reads, sorts and persists timers', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage, () => NOW)

    await repository.create(counter('second', 2))
    await repository.create(countdown('first', 0))

    expect((await repository.getAll()).map((timer) => timer.id)).toEqual(['first', 'second'])
    expect(JSON.parse(storage.getItem(TIMER_STORAGE_KEY) ?? '')).toEqual({
      version: 1,
      timers: expect.any(Array),
    })

    const recreatedRepository = new LocalStorageTimerRepository(storage, () => NOW)
    expect(await recreatedRepository.getById('second')).toEqual(counter('second', 2))
  })

  it('deletes without compacting positions', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage)

    await repository.create(counter('first', 0))
    await repository.create(counter('third', 2))
    await repository.delete('first')

    expect(await repository.getAll()).toEqual([counter('third', 2)])
  })

  it('restarts a counter while preserving its identity and position', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage, () => NOW)
    const original = counter('counter', 3, { accent: 'purple', icon: 'focus' })
    await repository.create(original)

    const restarted = await repository.restart(original.id)

    expect(restarted).toEqual({
      ...original,
      startAt: NOW.toString(),
      updatedAt: NOW.toString(),
    })
  })

  it('rejects restarting a countdown', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage())
    await repository.create(countdown('countdown', 0))

    await expect(repository.restart('countdown')).rejects.toThrow(
      'Solo se pueden reiniciar counters.',
    )
  })

  it('distinguishes empty storage from corrupt and unsupported envelopes', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage)

    expect(await repository.getAll()).toEqual([])

    storage.setItem(TIMER_STORAGE_KEY, '{bad json')
    await expect(repository.getAll()).rejects.toThrow('El almacenamiento de timers no es válido.')

    storage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ version: 2, timers: [counter('old', 0)] }))
    await expect(repository.getAll()).rejects.toThrow('El almacenamiento de timers no es válido.')
  })

  it('keeps valid timers when individual storage records are invalid', async () => {
    const storage = new MemoryStorage()
    storage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
      version: 1,
      timers: [counter('valid', 0), { id: 'invalid', type: 'unknown' }],
    }))

    const repository = new LocalStorageTimerRepository(storage)

    expect(await repository.getAll()).toEqual([counter('valid', 0)])
  })

  it('keeps legacy timers and sanitizes unknown customization without rewriting storage', async () => {
    const storage = new MemoryStorage()
    const legacy = counter('legacy', 0)
    const raw = JSON.stringify({
      version: 1,
      timers: [legacy, { ...countdown('customized', 1), accent: 'teal', icon: 'leaf' }],
    })
    storage.setItem(TIMER_STORAGE_KEY, raw)

    const repository = new LocalStorageTimerRepository(storage)

    expect(await repository.getAll()).toEqual([
      legacy,
      { ...countdown('customized', 1), icon: 'leaf' },
    ])
    expect(storage.getItem(TIMER_STORAGE_KEY)).toBe(raw)
  })

  it('updates only customization and its timestamp', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage, () => NOW)
    const original = countdown('event', 2)
    await repository.create(original)

    const updated = await repository.updateCustomization('event', {
      accent: 'green',
      icon: 'leaf',
    })

    expect(updated).toEqual({
      ...original,
      accent: 'green',
      icon: 'leaf',
      updatedAt: NOW.toString(),
    })
    expect(await new LocalStorageTimerRepository(storage).getById('event')).toEqual(updated)
  })

  it('rejects unknown customization and missing timers', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage())

    await expect(repository.updateCustomization('missing', {
      accent: 'green',
      icon: 'leaf',
    })).rejects.toThrow('No existe un timer')
    await expect(repository.create(counter('invalid', 0, {
      accent: 'teal' as never,
    }))).rejects.toThrow('El timer no tiene un formato válido.')
  })

  it('creates complete entities through the use case', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage())

    const timer = await createTimer(
      repository,
      {
        type: 'counter',
        title: '  No café  ',
        timeZone: 'America/Costa_Rica',
        startAt: '2023-12-31T00:00:00Z',
      },
      { now: NOW, createId: () => 'created-id' },
    )

    expect(timer).toEqual({
      id: 'created-id',
      title: 'No café',
      type: 'counter',
      timeZone: 'America/Costa_Rica',
      startAt: '2023-12-31T00:00:00Z',
      position: 0,
      createdAt: NOW.toString(),
      updatedAt: NOW.toString(),
      accent: 'blue',
      icon: 'clock',
    })
  })

  it('creates and persists an explicit customization', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage)

    const timer = await createTimer(
      repository,
      {
        type: 'counter',
        title: 'Focus',
        timeZone: 'UTC',
        startAt: '2023-12-31T00:00:00Z',
        accent: 'purple',
        icon: 'focus',
      },
      { now: NOW, createId: () => 'focus-id' },
    )

    expect(timer).toMatchObject({ accent: 'purple', icon: 'focus' })
    expect(await new LocalStorageTimerRepository(storage).getById('focus-id')).toEqual(timer)
  })

  it('assigns the next position and rejects invalid drafts', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage())
    await repository.create(counter('existing', 4))

    const timer = await createTimer(
      repository,
      {
        type: 'countdown',
        title: 'Future',
        timeZone: 'UTC',
        targetAt: '2024-01-02T00:00:00Z',
      },
      { now: NOW, createId: () => 'next-id' },
    )

    expect(timer.position).toBe(5)

    await expect(
      createTimer(repository, {
        type: 'countdown',
        title: 'Past',
        timeZone: 'UTC',
        targetAt: '2023-12-31T00:00:00Z',
      }),
    ).rejects.toBeInstanceOf(TimerValidationException)
  })
})
