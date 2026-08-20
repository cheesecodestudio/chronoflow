import { Temporal } from 'temporal-polyfill'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PresentationPage } from './PresentationPage'
import {
  LocalStorageTimerRepository,
} from '../infrastructure/storage/LocalStorageTimerRepository'

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

function counter(id: string, position: number): Parameters<LocalStorageTimerRepository['create']>[0] {
  return {
    id,
    title: id,
    type: 'counter',
    timeZone: 'UTC',
    startAt: '2023-12-31T00:00:00Z',
    position,
    createdAt: NOW.toString(),
    updatedAt: NOW.toString(),
  }
}

function countdown(id: string): Parameters<LocalStorageTimerRepository['create']>[0] {
  return {
    id,
    title: id,
    type: 'countdown',
    timeZone: 'UTC',
    targetAt: '2023-12-31T00:00:00Z',
    position: 0,
    createdAt: NOW.toString(),
    updatedAt: NOW.toString(),
  }
}

function renderPresentation(repository: LocalStorageTimerRepository) {
  return render(
    <MemoryRouter initialEntries={['/view']}>
      <Routes>
        <Route path="/view" element={<PresentationPage repository={repository} />} />
        <Route path="/manage" element={<p>Manage destination</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function flushLoading() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('PresentationPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })
  })

  it('shows the empty state when there are no timers', async () => {
    renderPresentation(new LocalStorageTimerRepository(new MemoryStorage(), () => NOW))
    await flushLoading()

    expect(screen.getByText('The screen is ready.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Manage View' })).toHaveAttribute('href', '/manage')
  })

  it('advances automatically and loops from the last timer to the first', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('First', 0))
    await repository.create(counter('Second', 1))
    renderPresentation(repository)
    await flushLoading()

    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
  })

  it('supports pause, resume, previous, next and keyboard controls', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('First', 0))
    await repository.create(counter('Second', 1))
    renderPresentation(repository)
    await flushLoading()

    fireEvent.click(screen.getByRole('button', { name: 'Pausar presentación' }))
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reanudar presentación' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByRole('button', { name: 'Pausar presentación' })).toBeInTheDocument()
  })

  it('shows the completed state for a past countdown', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(countdown('Finished'))
    renderPresentation(repository)
    await flushLoading()

    expect(screen.getByText('Llegó el momento')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
  })

  it('uses Fullscreen API and exits fullscreen with Escape', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('Fullscreen timer', 0))
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    const exitFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })

    renderPresentation(repository)
    await flushLoading()
    fireEvent.click(screen.getByRole('button', { name: 'Activar fullscreen' }))
    expect(requestFullscreen).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    })
    document.dispatchEvent(new Event('fullscreenchange'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('leaves Presentation View with Escape when not fullscreen', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('Escape timer', 0))
    renderPresentation(repository)
    await flushLoading()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText('Manage destination')).toBeInTheDocument()
  })
})
