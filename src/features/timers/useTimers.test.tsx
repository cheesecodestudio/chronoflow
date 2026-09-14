import { useEffect } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { TimerRepository } from './timer.repository'
import type { Timer, TimerCustomization, TimerDraft } from './timer.types'
import { useTimers } from './useTimers'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function timer(id: string): Extract<Timer, { type: 'counter' }> {
  return {
    id,
    type: 'counter',
    title: id,
    timeZone: 'UTC',
    position: 0,
    startAt: '2020-01-01T00:00:00Z',
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2020-01-01T00:00:00Z',
  }
}

function stubRepository(overrides: Partial<TimerRepository> = {}): TimerRepository {
  return {
    getAll: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    create: vi.fn(async (created: Timer) => created),
    delete: vi.fn(async () => undefined),
    restart: vi.fn(async () => timer('restarted')),
    updateCustomization: vi.fn(async () => timer('updated')),
    ...overrides,
  }
}

let latestTimers: ReturnType<typeof useTimers> | null = null

function timersApi(): ReturnType<typeof useTimers> {
  if (!latestTimers) throw new Error('Timer hook was not rendered')
  return latestTimers
}

function TimerProbe({ repository }: { repository: TimerRepository }) {
  const result = useTimers(repository)

  useEffect(() => {
    latestTimers = result
  }, [result])

  return (
    <div>
      <output data-testid="loading">{result.isLoading ? 'loading' : 'ready'}</output>
      <output data-testid="error">{result.error ?? 'no-error'}</output>
      <output data-testid="timers">{result.timers.map((item) => item.id).join(',') || 'empty'}</output>
    </div>
  )
}

describe('useTimers repository identity guards', () => {
  it('hides the previous collection immediately and ignores stale load success', async () => {
    latestTimers = null
    const firstLoad = deferred<Timer[]>()
    const secondLoad = deferred<Timer[]>()
    const repositoryA = stubRepository({ getAll: vi.fn(() => firstLoad.promise) })
    const repositoryB = stubRepository({ getAll: vi.fn(() => secondLoad.promise) })
    const view = render(<TimerProbe repository={repositoryA} />)

    view.rerender(<TimerProbe repository={repositoryB} />)
    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    expect(screen.getByTestId('timers')).toHaveTextContent('empty')

    await act(async () => {
      secondLoad.resolve([timer('user-b')])
      await secondLoad.promise
    })
    expect(screen.getByTestId('timers')).toHaveTextContent('user-b')

    await act(async () => {
      firstLoad.resolve([timer('user-a')])
      await firstLoad.promise
    })
    expect(screen.getByTestId('timers')).toHaveTextContent('user-b')
    expect(screen.getByTestId('error')).toHaveTextContent('no-error')
  })

  it('ignores stale load failure without replacing the current identity state', async () => {
    latestTimers = null
    const firstLoad = deferred<Timer[]>()
    const repositoryA = stubRepository({ getAll: vi.fn(() => firstLoad.promise) })
    const repositoryB = stubRepository({ getAll: vi.fn(async () => [timer('user-b')]) })
    const view = render(<TimerProbe repository={repositoryA} />)

    view.rerender(<TimerProbe repository={repositoryB} />)
    expect(await screen.findByText('user-b')).toBeInTheDocument()

    await act(async () => {
      firstLoad.reject(new Error('stale failure'))
      await firstLoad.promise.catch(() => undefined)
    })
    expect(screen.getByTestId('timers')).toHaveTextContent('user-b')
    expect(screen.getByTestId('error')).toHaveTextContent('no-error')
  })

  it('does not reload when a rerender keeps the same repository identity', async () => {
    latestTimers = null
    const getAll = vi.fn(async () => [timer('same-user')])
    const repository = stubRepository({ getAll })
    const view = render(<TimerProbe repository={repository} />)

    expect(await screen.findByText('same-user')).toBeInTheDocument()
    view.rerender(<TimerProbe repository={repository} />)

    expect(getAll).toHaveBeenCalledOnce()
  })

  it.each(['create', 'delete', 'restart', 'customization'] as const)(
    'does not apply a stale %s response to the next identity',
    async (operation) => {
      latestTimers = null
      const mutation = deferred<Timer | void>()
      const getAllA = vi.fn(async () => [timer('user-a')])
      const repositoryA = stubRepository({
        getAll: getAllA,
        create: vi.fn(() => mutation.promise as Promise<Timer>),
        delete: vi.fn(() => mutation.promise as Promise<void>),
        restart: vi.fn(() => mutation.promise as Promise<Timer>),
        updateCustomization: vi.fn(() => mutation.promise as Promise<Timer>),
      })
      const repositoryB = stubRepository({ getAll: vi.fn(async () => [timer('user-b')]) })
      const view = render(<TimerProbe repository={repositoryA} />)
      expect(await screen.findByText('user-a')).toBeInTheDocument()

      let operationPromise!: Promise<boolean>
      const draft: TimerDraft = {
        type: 'counter',
        title: 'Created',
        timeZone: 'UTC',
        startAt: '2020-01-01T00:00:00Z',
      }
      const customization: Required<TimerCustomization> = { accent: 'green', icon: 'leaf' }

      await act(async () => {
        if (operation === 'create') operationPromise = timersApi().create(draft)
        else if (operation === 'delete') operationPromise = timersApi().remove('user-a')
        else if (operation === 'restart') operationPromise = timersApi().restart('user-a')
        else operationPromise = timersApi().updateCustomization('user-a', customization)
        await Promise.resolve()
      })

      const mutationMock = operation === 'create'
        ? repositoryA.create
        : operation === 'delete'
          ? repositoryA.delete
          : operation === 'restart'
            ? repositoryA.restart
            : repositoryA.updateCustomization
      await waitFor(() => expect(mutationMock).toHaveBeenCalledOnce())

      view.rerender(<TimerProbe repository={repositoryB} />)
      expect(await screen.findByText('user-b')).toBeInTheDocument()

      let applied!: boolean
      await act(async () => {
        mutation.resolve(operation === 'delete' ? undefined : timer('stale-response'))
        applied = await operationPromise
      })

      expect(applied).toBe(false)
      expect(screen.getByTestId('timers')).toHaveTextContent('user-b')
      expect(screen.getByTestId('timers')).not.toHaveTextContent('stale-response')
      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
      expect(repositoryB.getAll).toHaveBeenCalledOnce()
    },
  )

  it('does not issue create after its position lookup becomes stale', async () => {
    latestTimers = null
    const positionLookup = deferred<Timer[]>()
    const create = vi.fn(async (created: Timer) => created)
    const repositoryA = stubRepository({
      getAll: vi.fn()
        .mockResolvedValueOnce([timer('user-a')])
        .mockReturnValueOnce(positionLookup.promise),
      create,
    })
    const repositoryB = stubRepository({ getAll: vi.fn(async () => [timer('user-b')]) })
    const view = render(<TimerProbe repository={repositoryA} />)
    expect(await screen.findByText('user-a')).toBeInTheDocument()

    const operationPromise = timersApi().create({
      type: 'counter',
      title: 'Created',
      timeZone: 'UTC',
      startAt: '2020-01-01T00:00:00Z',
    })
    await waitFor(() => expect(repositoryA.getAll).toHaveBeenCalledTimes(2))

    view.rerender(<TimerProbe repository={repositoryB} />)
    expect(await screen.findByText('user-b')).toBeInTheDocument()

    await act(async () => {
      positionLookup.resolve([timer('user-a')])
      await expect(operationPromise).resolves.toBe(false)
    })
    expect(create).not.toHaveBeenCalled()
    expect(screen.getByTestId('timers')).toHaveTextContent('user-b')
  })

  it('ignores a stale mutation failure instead of surfacing it to the new identity', async () => {
    latestTimers = null
    const mutation = deferred<void>()
    const repositoryA = stubRepository({
      getAll: vi.fn(async () => [timer('user-a')]),
      delete: vi.fn(() => mutation.promise),
    })
    const repositoryB = stubRepository({ getAll: vi.fn(async () => [timer('user-b')]) })
    const view = render(<TimerProbe repository={repositoryA} />)
    expect(await screen.findByText('user-a')).toBeInTheDocument()

    const operationPromise = timersApi().remove('user-a')
    await waitFor(() => expect(repositoryA.delete).toHaveBeenCalledOnce())
    view.rerender(<TimerProbe repository={repositoryB} />)
    expect(await screen.findByText('user-b')).toBeInTheDocument()

    await act(async () => {
      mutation.reject(new Error('stale delete failure'))
      await expect(operationPromise).resolves.toBe(false)
    })
    expect(screen.getByTestId('timers')).toHaveTextContent('user-b')
    expect(screen.getByTestId('error')).toHaveTextContent('no-error')
  })

  it('invalidates an old operation even when the same repository object is selected again', async () => {
    latestTimers = null
    const firstLoad = deferred<Timer[]>()
    const repositoryA = stubRepository({
      getAll: vi.fn()
        .mockReturnValueOnce(firstLoad.promise)
        .mockResolvedValueOnce([timer('fresh-user-a')]),
    })
    const repositoryB = stubRepository({ getAll: vi.fn(async () => [timer('user-b')]) })
    const view = render(<TimerProbe repository={repositoryA} />)

    view.rerender(<TimerProbe repository={repositoryB} />)
    expect(await screen.findByText('user-b')).toBeInTheDocument()
    view.rerender(<TimerProbe repository={repositoryA} />)
    expect(await screen.findByText('fresh-user-a')).toBeInTheDocument()

    await act(async () => {
      firstLoad.resolve([timer('stale-user-a')])
      await firstLoad.promise
    })
    expect(screen.getByTestId('timers')).toHaveTextContent('fresh-user-a')
    expect(screen.getByTestId('timers')).not.toHaveTextContent('stale-user-a')
  })
})
