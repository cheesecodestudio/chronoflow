/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { Temporal } from 'temporal-polyfill'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PresentationPage } from './PresentationPage'
import { FADE_DURATION_MS } from '../features/timers/presentation.constants'
import { SettingsProvider } from '../features/timers/SettingsContext'
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
// Vitest stubs CSS imports; read the source to verify the stylesheet contract.
const presentationCss = readFileSync('src/pages/presentation.css', 'utf8')
type RepositoryTimer = Parameters<LocalStorageTimerRepository['create']>[0]

function counter(id: string, position: number): Extract<RepositoryTimer, { type: 'counter' }> {
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

function renderPresentation(repository: LocalStorageTimerRepository) {
  return render(
    <SettingsProvider>
      <MemoryRouter initialEntries={['/view']}>
        <Routes>
          <Route path="/view" element={<PresentationPage repository={repository} />} />
          <Route path="/manage" element={<p>Manage destination</p>} />
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  )
}

async function flushLoading() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('PresentationPage fade transition', () => {
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

  it('uses FADE_DURATION_MS (280ms) for fade-out and fade-in phases', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('First', 0))
    await repository.create(counter('Second', 1))
    renderPresentation(repository)
    await flushLoading()

    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()

    // Click next timer - this triggers fade-out
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente temporizador' }))
    expect(screen.getByRole('heading', { name: 'First' }).parentElement).toHaveAttribute('data-phase', 'fade-out')

    await act(async () => {
      vi.advanceTimersByTime(FADE_DURATION_MS - 1)
    })
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()

    // Wait for fade-out (FADE_DURATION_MS)
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('heading', { name: 'Second' }).parentElement).toHaveAttribute('data-phase', 'fade-in')

    // Wait for fade-in (FADE_DURATION_MS)
    await act(async () => {
      vi.advanceTimersByTime(FADE_DURATION_MS)
    })

    // Now the second timer should be visible
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Second' }).parentElement).toHaveAttribute('data-phase', 'idle')
  })

  it('uses FADE_DURATION_MS (280ms) for keyboard navigation transitions', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('First', 0))
    await repository.create(counter('Second', 1))
    renderPresentation(repository)
    await flushLoading()

    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()

    // Keyboard navigation: ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    // Wait for fade-out (FADE_DURATION_MS)
    await act(async () => {
      vi.advanceTimersByTime(FADE_DURATION_MS)
    })

    // Wait for fade-in (FADE_DURATION_MS)
    await act(async () => {
      vi.advanceTimersByTime(FADE_DURATION_MS)
    })

    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()

    // Keyboard navigation: ArrowLeft back to first
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    await act(async () => {
      vi.advanceTimersByTime(FADE_DURATION_MS)
    })

    await act(async () => {
      vi.advanceTimersByTime(FADE_DURATION_MS)
    })

    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
  })

  it('applies the correct CSS transition duration based on FADE_DURATION_MS', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('Fade test', 0))
    renderPresentation(repository)
    await flushLoading()

    // The timer container with the fade transition is the direct parent of the heading
    const heading = screen.getByRole('heading', { name: 'Fade test' })
    const timerContainer = heading.parentElement

    expect(timerContainer).toBeInTheDocument()
    expect(timerContainer).toHaveClass('presentation-slide')
    expect(timerContainer?.style.getPropertyValue('--presentation-fade-duration')).toBe(`${FADE_DURATION_MS}ms`)
    expect(presentationCss).toContain('transition: opacity var(--presentation-fade-duration, 280ms) ease')
    expect(presentationCss).toContain(".presentation-slide[data-phase='fade-out'] {\n  opacity: 0;")
  })

  it('removes nonessential transitions and fading for reduced motion without changing navigation timing', async () => {
    const reducedMotionCss = presentationCss.slice(presentationCss.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedMotionCss).toContain('.presentation-slide,')
    expect(reducedMotionCss).toContain('.presentation-chrome,')
    expect(reducedMotionCss).toContain('.presentation-button {\n    transition: none;')
    expect(reducedMotionCss).toContain(".presentation-slide[data-phase='fade-out'] {\n    opacity: 1;")

    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('First', 0))
    await repository.create(counter('Second', 1))
    renderPresentation(repository)
    await flushLoading()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await act(async () => {
      vi.advanceTimersByTime(FADE_DURATION_MS)
    })
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
  })
})
