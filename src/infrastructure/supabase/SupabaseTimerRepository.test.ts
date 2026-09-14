import { Temporal } from 'temporal-polyfill'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import type { Timer, TimerCustomization } from '../../features/timers/timer.types'
import type { Database, TimerRow } from './database.types'
import { SupabaseTimerRepository } from './SupabaseTimerRepository'
import { InvalidSupabaseTimerRowError } from './timerRow'

const NOW = Temporal.Instant.from('2026-09-14T12:00:00Z')

type QueryResponse = {
  data: unknown
  error: Error | null
}

interface QueryBuilder extends PromiseLike<QueryResponse> {
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

function queryBuilder(response: QueryResponse): QueryBuilder {
  const builder = {} as QueryBuilder
  builder.delete = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.insert = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.select = vi.fn(() => builder)
  builder.single = vi.fn(() => builder)
  builder.update = vi.fn(() => builder)
  builder.then = (onFulfilled, onRejected) => Promise.resolve(response).then(onFulfilled, onRejected)
  return builder
}

function repositoryHarness(...builders: QueryBuilder[]) {
  const from = vi.fn()
  for (const builder of builders) from.mockReturnValueOnce(builder)

  const client = { from } as unknown as SupabaseClient<Database>
  return {
    repository: new SupabaseTimerRepository(client, 'bound-user', () => NOW),
    from,
  }
}

function counterRow(overrides: Partial<TimerRow> = {}): TimerRow {
  return {
    id: 'counter-id',
    user_id: 'bound-user',
    type: 'counter',
    title: 'Counter',
    time_zone: 'UTC',
    position: 0,
    start_at: '2026-09-01T00:00:00Z',
    target_at: null,
    accent: 'purple',
    icon: 'focus',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

function countdownRow(overrides: Partial<TimerRow> = {}): TimerRow {
  return counterRow({
    id: 'countdown-id',
    type: 'countdown',
    title: 'Countdown',
    position: 1,
    start_at: null,
    target_at: '2026-10-01T00:00:00Z',
    accent: null,
    icon: null,
    ...overrides,
  })
}

function counterTimer(): Extract<Timer, { type: 'counter' }> {
  return {
    id: 'counter-id',
    type: 'counter',
    title: 'Counter',
    timeZone: 'UTC',
    position: 0,
    startAt: '2026-09-01T00:00:00Z',
    accent: 'purple',
    icon: 'focus',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  }
}

describe('SupabaseTimerRepository', () => {
  it('loads ordered rows and maps both database variants without filtering', async () => {
    const query = queryBuilder({
      data: [counterRow(), countdownRow()],
      error: null,
    })
    const { repository, from } = repositoryHarness(query)

    expect(await repository.getAll()).toEqual([
      counterTimer(),
      {
        id: 'countdown-id',
        type: 'countdown',
        title: 'Countdown',
        timeZone: 'UTC',
        position: 1,
        targetAt: '2026-10-01T00:00:00Z',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ])
    expect(from).toHaveBeenCalledWith('timers')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'bound-user')
    expect(query.order).toHaveBeenCalledWith('position', { ascending: true })
  })

  it('fails the whole load for a malformed remote row', async () => {
    const query = queryBuilder({
      data: [counterRow(), counterRow({ time_zone: 'Not/A-Time-Zone' })],
      error: null,
    })
    const { repository } = repositoryHarness(query)

    await expect(repository.getAll()).rejects.toBeInstanceOf(InvalidSupabaseTimerRowError)
  })

  it('gets one timer or null and propagates Supabase errors', async () => {
    const found = queryBuilder({ data: countdownRow(), error: null })
    const missing = queryBuilder({ data: null, error: null })
    const providerError = new Error('provider failure')
    const failed = queryBuilder({ data: null, error: providerError })
    const { repository } = repositoryHarness(found, missing, failed)

    await expect(repository.getById('countdown-id')).resolves.toMatchObject({
      id: 'countdown-id',
      type: 'countdown',
    })
    expect(found.eq).toHaveBeenCalledWith('id', 'countdown-id')
    expect(found.eq).toHaveBeenCalledWith('user_id', 'bound-user')
    await expect(repository.getById('missing')).resolves.toBeNull()
    await expect(repository.getById('failed')).rejects.toBe(providerError)
  })

  it('creates a timer with the repository user_id and returns the database row', async () => {
    const query = queryBuilder({ data: counterRow(), error: null })
    const { repository } = repositoryHarness(query)

    await expect(repository.create(counterTimer())).resolves.toEqual(counterTimer())
    expect(query.insert).toHaveBeenCalledWith({
      id: 'counter-id',
      user_id: 'bound-user',
      type: 'counter',
      title: 'Counter',
      time_zone: 'UTC',
      position: 0,
      start_at: '2026-09-01T00:00:00Z',
      target_at: null,
      accent: 'purple',
      icon: 'focus',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    })
    expect(query.single).toHaveBeenCalledOnce()
  })

  it('deletes only by id and does not hide authenticated failures', async () => {
    const success = queryBuilder({ data: null, error: null })
    const providerError = new Error('delete denied')
    const failure = queryBuilder({ data: null, error: providerError })
    const { repository } = repositoryHarness(success, failure)

    await expect(repository.delete('counter-id')).resolves.toBeUndefined()
    expect(success.delete).toHaveBeenCalledOnce()
    expect(success.eq).toHaveBeenCalledWith('id', 'counter-id')
    expect(success.eq).toHaveBeenCalledWith('user_id', 'bound-user')
    await expect(repository.delete('counter-id')).rejects.toBe(providerError)
  })

  it('restarts only counters with a server update and maps the returned row', async () => {
    const restartedRow = counterRow({ start_at: NOW.toString(), updated_at: NOW.toString() })
    const update = queryBuilder({ data: restartedRow, error: null })
    const { repository } = repositoryHarness(update)

    await expect(repository.restart('counter-id')).resolves.toEqual({
      ...counterTimer(),
      startAt: NOW.toString(),
      updatedAt: NOW.toString(),
    })
    expect(update.update).toHaveBeenCalledWith({
      start_at: NOW.toString(),
      updated_at: NOW.toString(),
    })
    expect(update.eq).toHaveBeenCalledWith('id', 'counter-id')
    expect(update.eq).toHaveBeenCalledWith('user_id', 'bound-user')
    expect(update.eq).toHaveBeenCalledWith('type', 'counter')
  })

  it('surfaces database failure when attempting to restart a countdown', async () => {
    const providerError = new Error('countdown restart rejected')
    const update = queryBuilder({ data: null, error: providerError })
    const { repository } = repositoryHarness(update)

    await expect(repository.restart('countdown-id')).rejects.toBe(providerError)
    expect(update.eq).toHaveBeenCalledWith('id', 'countdown-id')
    expect(update.eq).toHaveBeenCalledWith('user_id', 'bound-user')
    expect(update.eq).toHaveBeenCalledWith('type', 'counter')
  })

  it('updates validated customization and returns the updated timer', async () => {
    const updatedRow = counterRow({ accent: 'green', icon: 'leaf', updated_at: NOW.toString() })
    const query = queryBuilder({ data: updatedRow, error: null })
    const { repository } = repositoryHarness(query)
    const customization: Required<TimerCustomization> = { accent: 'green', icon: 'leaf' }

    await expect(repository.updateCustomization('counter-id', customization)).resolves.toMatchObject({
      id: 'counter-id',
      ...customization,
      updatedAt: NOW.toString(),
    })
    expect(query.update).toHaveBeenCalledWith({
      accent: 'green',
      icon: 'leaf',
      updated_at: NOW.toString(),
    })
    expect(query.eq).toHaveBeenCalledWith('id', 'counter-id')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'bound-user')
  })
})
