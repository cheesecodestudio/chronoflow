/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { Temporal } from 'temporal-polyfill'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PresentationPage } from './PresentationPage'
import { FADE_DURATION_MS, getSlideDurationMs } from '../features/timers/presentation.constants'
import { SettingsProvider } from '../features/timers/SettingsContext'
import { writeSettings } from '../infrastructure/storage/SettingsStorage'
import {
  LocalStorageTimerRepository,
  TIMER_STORAGE_KEY,
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

function countdown(id: string): Extract<RepositoryTimer, { type: 'countdown' }> {
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

describe('PresentationPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Temporal.Now, 'instant').mockReturnValue(NOW)
    window.localStorage.clear()
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

    expect(screen.getByRole('heading', { name: 'No hay temporizadores para mostrar.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a gestión' })).toHaveAttribute('href', '/manage')
    expect(screen.queryByRole('button', { name: 'Configuración' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Controles de presentación' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Siguiente temporizador' })).not.toBeInTheDocument()
  })

  it('shows retry and Manage navigation for invalid storage', async () => {
    const storage = new MemoryStorage()
    storage.setItem(TIMER_STORAGE_KEY, '{bad json')
    renderPresentation(new LocalStorageTimerRepository(storage, () => NOW))
    await flushLoading()

    expect(screen.getByRole('heading', { name: 'No pudimos cargar la presentación.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a gestión' })).toHaveAttribute('href', '/manage')
    expect(screen.queryByRole('heading', { name: 'No hay temporizadores para mostrar.' })).not.toBeInTheDocument()

    storage.clear()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await flushLoading()
    expect(screen.getByRole('heading', { name: 'No hay temporizadores para mostrar.' })).toBeInTheDocument()
  })

  it('keeps a single timer stable without automatic transitions', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('Only timer', 0))
    renderPresentation(repository)
    await flushLoading()

    expect(screen.getByRole('heading', { name: 'Only timer' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('data-timer-accent', 'blue')
    expect(screen.getByText('Acento Azul, icono Reloj.')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(getSlideDurationMs() * 2)
    })

    expect(screen.getByRole('heading', { name: 'Only timer' })).toBeInTheDocument()
  })

  it('renders a persisted customization without changing the timer duration', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({
      ...counter('Focused timer', 0),
      accent: 'purple',
      icon: 'focus',
    })
    renderPresentation(repository)
    await flushLoading()

    expect(screen.getByRole('main')).toHaveAttribute('data-timer-accent', 'purple')
    expect(screen.getByText('Acento Morado, icono Enfoque.')).toBeInTheDocument()
    expect(screen.getByText('Tiempo transcurrido')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Hora' })).toBeInTheDocument()
  })

  it('advances manually and loops from the last timer to the first', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('First', 0))
    await repository.create(counter('Second', 1))
    renderPresentation(repository)
    await flushLoading()

    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()

    // Navegación manual: siguiente
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente temporizador' }))
    await act(async () => {
      vi.advanceTimersByTime(280)
      vi.advanceTimersByTime(280)
    })
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()

    // Loop: siguiente desde el último vuelve al primero
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente temporizador' }))
    await act(async () => {
      vi.advanceTimersByTime(280)
      vi.advanceTimersByTime(280)
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
      vi.advanceTimersByTime(getSlideDurationMs())
    })
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reanudar presentación' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await act(async () => {
      vi.advanceTimersByTime(280)
      vi.advanceTimersByTime(280)
    })
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await act(async () => {
      vi.advanceTimersByTime(280)
      vi.advanceTimersByTime(280)
    })
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
    expect(screen.queryByText('Estado')).not.toBeInTheDocument()
  })

  it('does not reserve an empty calendar row for recent counters', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({
      ...counter('Recent counter', 0),
      startAt: Temporal.Now.instant().subtract({ seconds: 30 }).toString(),
    })
    renderPresentation(repository)
    await flushLoading()

    expect(screen.queryByRole('group', { name: 'Fecha' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Hora' })).toBeInTheDocument()
  })

  it('hides controls after inactivity and reveals them on touch', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('Touch controls', 0))
    renderPresentation(repository)
    await flushLoading()

    const pauseButton = screen.getByRole('button', { name: 'Pausar presentación' })
    const controlsBar = pauseButton.closest('footer')
    expect(controlsBar).toHaveAttribute('data-visible', 'true')

    await act(async () => {
      vi.advanceTimersByTime(getSlideDurationMs())
    })
    expect(controlsBar).toHaveAttribute('data-visible', 'false')

    fireEvent.pointerDown(screen.getByRole('main'))
    expect(controlsBar).toHaveAttribute('data-visible', 'true')
  })

  it('keeps long titles and large years intact in a scrollable, in-flow layout', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    const title = 'Una presentación de larga duración '.padEnd(100, 'a')
    await repository.create({ ...counter(title, 0), startAt: '-100000-01-01T00:00:00Z' })
    renderPresentation(repository)
    await flushLoading()

    const main = screen.getByRole('main')
    const content = screen.getByRole('heading', { name: title }).parentElement?.parentElement

    expect(main).toHaveClass('presentation-page')
    expect(content).toHaveClass('presentation-stage')
    expect(screen.getByRole('heading', { name: title })).toHaveTextContent(title)
    expect(within(screen.getByRole('group', { name: 'Fecha' })).getByRole('definition')).toHaveTextContent('102024')
    expect(presentationCss).toContain('overflow-wrap: anywhere')
    expect(presentationCss).toContain('overflow-y: auto')
    expect(presentationCss).not.toMatch(/overflow-y:\s*hidden|text-overflow:\s*ellipsis|position:\s*fixed/)
    expect(presentationCss.match(/\.presentation-stage \{[^}]+\}/)?.[0]).not.toMatch(/position:\s*absolute|overflow:\s*hidden/)
  })

  it('shows accessible numeric definitions and labels, without rings or ticking live regions', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({ ...counter('All units', 0), startAt: '2022-10-20T12:30:40Z' })
    renderPresentation(repository)
    await flushLoading()

    const duration = screen.getByRole('region', { name: 'Tiempo transcurrido' })
    expect(within(duration).getAllByRole('term').map((term) => term.textContent)).toEqual([
      'AÑOS', 'MESES', 'DÍAS', 'HORAS', 'MINUTOS', 'SEGUNDOS',
    ])
    const values = within(duration).getAllByRole('definition')
    expect(values.map((value) => value.textContent)).toEqual(['01', '02', '11', '11', '29', '20'])
    for (const value of values) {
      expect(value.closest('[aria-hidden="true"]')).toBeNull()
      expect(value.closest('[aria-live], [role="status"], [role="timer"]')).toBeNull()
    }
    expect(duration.querySelector('svg, circle')).toBeNull()
    expect(duration.querySelector('.presentation-unit-seconds')).toContainElement(values[5])
    expect(presentationCss).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(presentationCss).toContain('grid-template-columns: repeat(var(--presentation-unit-count), minmax(0, 1fr))')
  })

  it('honors the stored seconds preference and keeps zero hours and minutes visible', async () => {
    writeSettings({ showSeconds: false })
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({ ...counter('Just started', 0), startAt: NOW.toString() })
    renderPresentation(repository)
    await flushLoading()

    const duration = screen.getByRole('region', { name: 'Tiempo transcurrido' })
    expect(within(duration).getAllByRole('term').map((term) => term.textContent)).toEqual(['HORAS', 'MINUTOS'])
    expect(within(duration).getAllByRole('definition').map((value) => value.textContent)).toEqual(['00', '00'])
    expect(screen.queryByRole('group', { name: 'Fecha' })).not.toBeInTheDocument()
  })

  it('renders a future countdown and announces its completion once reached', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({ ...countdown('Coming soon'), targetAt: NOW.add({ seconds: 10 }).toString() })
    renderPresentation(repository)
    await flushLoading()

    expect(screen.getByText('Cuenta atrás')).toBeInTheDocument()
    const duration = screen.getByRole('region', { name: 'Tiempo restante' })
    expect(within(duration).getAllByRole('definition').map((value) => value.textContent)).toEqual(['00', '00', '10'])
    vi.mocked(Temporal.Now.instant).mockReturnValue(NOW.add({ seconds: 10 }))
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(screen.getByRole('status')).toHaveTextContent('Llegó el momento')
    expect(screen.queryByRole('region', { name: 'Tiempo restante' })).not.toBeInTheDocument()
  })

  it.each(['Pausar presentación', 'Volver a gestión'])('keeps controls visible while %s has focus and hides them after blur', async (name) => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('Keyboard focus', 0))
    renderPresentation(repository)
    await flushLoading()
    const control = name === 'Volver a gestión'
      ? screen.getByRole('link', { name })
      : screen.getByRole('button', { name })
    const chrome = control.closest('.presentation-chrome')

    await act(async () => { vi.advanceTimersByTime(getSlideDurationMs()) })
    expect(chrome).toHaveAttribute('data-visible', 'false')
    act(() => control.focus())
    expect(control).toHaveFocus()
    expect(chrome).toHaveAttribute('data-visible', 'true')
    await act(async () => { vi.advanceTimersByTime(getSlideDurationMs() * 2) })
    expect(chrome).toHaveAttribute('data-visible', 'true')
    act(() => control.blur())
    await act(async () => { vi.advanceTimersByTime(getSlideDurationMs()) })
    expect(chrome).toHaveAttribute('data-visible', 'false')
    expect(presentationCss).toContain(".presentation-chrome[data-visible='false']:not(:focus-within)")
    expect(presentationCss).toContain('.presentation-button:focus-visible,')
  })

  it.each(['pointer', 'keyboard'])('recovers inactive controls with %s activity', async (input) => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('Recover controls', 0))
    renderPresentation(repository)
    await flushLoading()
    const chrome = screen.getByRole('button', { name: 'Pausar presentación' }).closest('footer')
    await act(async () => { vi.advanceTimersByTime(getSlideDurationMs()) })
    expect(chrome).toHaveAttribute('data-visible', 'false')
    if (input === 'pointer') {
      fireEvent.pointerMove(screen.getByRole('main'))
    } else {
      expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(true)
    }
    expect(chrome).toHaveAttribute('data-visible', 'true')
  })

  it('preserves native Space on every button and the management link', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('Native keyboard', 0))
    renderPresentation(repository)
    await flushLoading()

    for (const control of [...screen.getAllByRole('button'), screen.getByRole('link', { name: 'Volver a gestión' })]) {
      act(() => control.focus())
      expect(fireEvent.keyDown(control, { key: ' ' })).toBe(true)
      expect(screen.getByRole('button', { name: 'Pausar presentación' })).toBeInTheDocument()
    }
    // jsdom does not synthesize the browser's click from a Space keyup.
    fireEvent.click(screen.getByRole('button', { name: 'Pausar presentación' }))
    expect(screen.getByRole('button', { name: 'Reanudar presentación' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByRole('button', { name: 'Pausar presentación' })).toBeInTheDocument()
  })

  it('automatically advances circularly and keeps the clock ticking while slides are paused', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({ ...counter('First', 0), startAt: NOW.toString() })
    await repository.create(counter('Second', 1))
    renderPresentation(repository)
    await flushLoading()

    await act(async () => { vi.advanceTimersByTime(getSlideDurationMs() + FADE_DURATION_MS) })
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(getSlideDurationMs() + FADE_DURATION_MS) })
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pausar presentación' }))
    vi.mocked(Temporal.Now.instant).mockReturnValue(NOW.add({ seconds: 15 }))
    await act(async () => { vi.advanceTimersByTime(getSlideDurationMs() * 2) })
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Hora' })).getAllByRole('definition')[2]).toHaveTextContent('15')

    fireEvent.click(screen.getByRole('button', { name: 'Temporizador anterior' }))
    await act(async () => { vi.advanceTimersByTime(FADE_DURATION_MS * 2) })
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
  })

  it('resets auto-advance immediately when manual navigation happens at the interval boundary', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create(counter('First', 0))
    await repository.create(counter('Second', 1))
    await repository.create(counter('Third', 2))
    renderPresentation(repository)
    await flushLoading()

    await act(async () => { vi.advanceTimersByTime(getSlideDurationMs() - 1) })
    fireEvent.click(screen.getByRole('button', { name: 'Temporizador anterior' }))
    await act(async () => { vi.advanceTimersByTime(1 + FADE_DURATION_MS * 2) })

    expect(screen.getByRole('heading', { name: 'Third' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Second' })).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Activar pantalla completa' }))
    expect(requestFullscreen).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    })
    act(() => document.dispatchEvent(new Event('fullscreenchange')))
    expect(screen.getByRole('button', { name: 'Salir de pantalla completa' })).toBeInTheDocument()
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
