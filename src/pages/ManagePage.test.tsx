import { Temporal } from 'temporal-polyfill'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { ManagePage } from './ManagePage'
import { SettingsProvider } from '../features/timers/SettingsContext'
import {
  LocalStorageTimerRepository,
  TIMER_STORAGE_KEY,
} from '../infrastructure/storage/LocalStorageTimerRepository'
import { SETTINGS_STORAGE_KEY } from '../infrastructure/storage/SettingsStorage'
import { PRESENTATION_SETTINGS_STORAGE_KEY } from '../features/timers/presentation.settings'

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

class FailingCustomizationRepository extends LocalStorageTimerRepository {
  override async updateCustomization(): Promise<never> {
    throw new Error('Storage unavailable')
  }
}

const NOW = Temporal.Instant.from('2024-01-01T00:00:00Z')

function renderManage(repository: LocalStorageTimerRepository) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <ManagePage repository={repository} />
      </SettingsProvider>
    </MemoryRouter>,
  )
}

describe('ManagePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('shows the empty state when there are no timers', async () => {
    renderManage(new LocalStorageTimerRepository(new MemoryStorage(), () => NOW))

    expect(await screen.findByRole('heading', { name: 'Aún no tienes timers.' })).toBeInTheDocument()
    expect(screen.getByText('Aún no hay momentos guardados.')).toBeInTheDocument()
  })

  it('opens the settings shell from Manage and closes it without persistence', async () => {
    const storage = new MemoryStorage()
    renderManage(new LocalStorageTimerRepository(storage, () => NOW))

    const trigger = await screen.findByRole('button', { name: 'Configuración' })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Configuración' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Duración por slide' })).toHaveValue('5')
    expect(screen.getByText('5 s')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar configuración' }))
    expect(storage.getItem('chronoflow:settings:v1')).toBeNull()

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar configuración' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Configuración' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
    expect(storage.getItem('chronoflow:settings:v1')).toBeNull()
  })

  it('closes the settings shell from the backdrop but not from its panel', async () => {
    renderManage(new LocalStorageTimerRepository(new MemoryStorage(), () => NOW))
    fireEvent.click(await screen.findByRole('button', { name: 'Configuración' }))

    const dialog = screen.getByRole('dialog', { name: 'Configuración' })
    fireEvent.click(dialog)
    expect(screen.getByRole('dialog', { name: 'Configuración' })).toBeInTheDocument()

    fireEvent.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog', { name: 'Configuración' })).not.toBeInTheDocument()
  })

  it('toggles and restores the seconds preference from local storage', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    const firstRender = renderManage(repository)

    fireEvent.click(await screen.findByRole('button', { name: 'Configuración' }))
    const toggle = screen.getByRole('switch', { name: 'Ocultar segundos' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(toggle)
    expect(screen.getByRole('switch', { name: 'Mostrar segundos' })).toHaveAttribute('aria-checked', 'false')
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"showSeconds":false')

    firstRender.unmount()
    renderManage(repository)
    fireEvent.click(await screen.findByRole('button', { name: 'Configuración' }))

    expect(screen.getByRole('switch', { name: 'Mostrar segundos' })).toHaveAttribute('aria-checked', 'false')
  })

  it('changes the slide duration in seconds and persists milliseconds', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    renderManage(repository)

    fireEvent.click(await screen.findByRole('button', { name: 'Configuración' }))
    const slider = screen.getByRole('slider', { name: 'Duración por slide' })

    expect(slider).toHaveAttribute('min', '2')
    expect(slider).toHaveAttribute('max', '60')
    expect(slider).toHaveAttribute('step', '1')

    fireEvent.change(slider, { target: { value: '12' } })
    expect(screen.getByText('12 s')).toBeInTheDocument()

    fireEvent.blur(slider)
    expect(window.localStorage.getItem(PRESENTATION_SETTINGS_STORAGE_KEY)).toContain('"slideDurationMs":12000')
  })

  it('creates a counter from the form', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    renderManage(repository)

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo timer' }))
    expect(screen.getByRole('radio', { name: 'Azul' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Reloj' })).toBeChecked()
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'No tomar café' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear timer' }))

    expect(await screen.findByText('No tomar café')).toBeInTheDocument()
    expect(screen.getByText('Counter')).toBeInTheDocument()
    expect(screen.getAllByText('01')).toHaveLength(2)
    expect(await repository.getById((await repository.getAll())[0]!.id)).toMatchObject({
      accent: 'blue',
      icon: 'clock',
    })
  })

  it('creates a timer with the selected visual customization', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage, () => NOW)
    renderManage(repository)

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo timer' }))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Deep work' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Morado' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Enfoque' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear timer' }))

    expect(await screen.findByText('Deep work')).toBeInTheDocument()
    expect(screen.getByText('Acento Morado, icono Enfoque.')).toBeInTheDocument()
    expect(await repository.getAll()).toEqual([
      expect.objectContaining({ accent: 'purple', icon: 'focus' }),
    ])
    expect(await new LocalStorageTimerRepository(storage).getAll()).toEqual([
      expect.objectContaining({ accent: 'purple', icon: 'focus' }),
    ])
  })

  it('personalizes an existing timer through the injected repository and restores focus', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage, () => NOW)
    await repository.create({
      id: 'legacy',
      title: 'Legacy timer',
      type: 'counter',
      timeZone: 'UTC',
      startAt: '2023-12-31T00:00:00Z',
      position: 0,
      createdAt: '2023-12-31T00:00:00Z',
      updatedAt: '2023-12-31T00:00:00Z',
    })
    renderManage(repository)

    const trigger = await screen.findByRole('button', { name: 'Personalizar Legacy timer' })
    fireEvent.click(trigger)

    expect(screen.getByRole('dialog', { name: 'Personalizar “Legacy timer”' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Azul' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Reloj' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Verde' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Hoja' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar personalización' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Personalizar “Legacy timer”' })).not.toBeInTheDocument()
    })
    expect(await repository.getById('legacy')).toMatchObject({
      title: 'Legacy timer',
      startAt: '2023-12-31T00:00:00Z',
      accent: 'green',
      icon: 'leaf',
    })
    expect(window.localStorage.getItem(TIMER_STORAGE_KEY)).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(screen.getByText('Acento Verde, icono Hoja.')).toBeInTheDocument()
  })

  it('closes personalization with Escape without persisting changes', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({
      id: 'cancel-customization',
      title: 'Keep blue',
      type: 'counter',
      timeZone: 'UTC',
      startAt: '2023-12-31T00:00:00Z',
      position: 0,
      createdAt: NOW.toString(),
      updatedAt: NOW.toString(),
      accent: 'blue',
      icon: 'clock',
    })
    renderManage(repository)

    const trigger = await screen.findByRole('button', { name: 'Personalizar Keep blue' })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('radio', { name: 'Rojo' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Personalizar “Keep blue”' })).not.toBeInTheDocument()
    expect(await repository.getById('cancel-customization')).toMatchObject({
      accent: 'blue',
      icon: 'clock',
    })
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps personalization open and reports persistence errors', async () => {
    const repository = new FailingCustomizationRepository(new MemoryStorage(), () => NOW)
    await repository.create({
      id: 'failed-customization',
      title: 'Cannot save',
      type: 'counter',
      timeZone: 'UTC',
      startAt: '2023-12-31T00:00:00Z',
      position: 0,
      createdAt: NOW.toString(),
      updatedAt: NOW.toString(),
    })
    renderManage(repository)

    fireEvent.click(await screen.findByRole('button', { name: 'Personalizar Cannot save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar personalización' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo guardar la personalización. Inténtalo nuevamente.',
    )
    expect(screen.getByRole('dialog', { name: 'Personalizar “Cannot save”' })).toBeInTheDocument()
  })

  it('creates a countdown and renders its remaining duration', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    renderManage(repository)

    await screen.findByText('Aún no tienes timers.')
    fireEvent.click(screen.getByRole('button', { name: 'Crear primer timer' }))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Viaje' } })
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'countdown' } })
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2099-01-01' } })
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '12:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear timer' }))

    expect(await screen.findByText('Viaje')).toBeInTheDocument()
    expect(screen.getByText('Countdown')).toBeInTheDocument()
    expect(screen.getByText('Tiempo restante')).toBeInTheDocument()
  })

  it('shows an actionable error instead of the empty state for invalid storage', async () => {
    const storage = new MemoryStorage()
    storage.setItem(TIMER_STORAGE_KEY, '{bad json')
    renderManage(new LocalStorageTimerRepository(storage, () => NOW))

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar tus timers.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Aún no tienes timers.' })).not.toBeInTheDocument()

    storage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ version: 1, timers: [] }))
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Aún no tienes timers.' })).toBeInTheDocument()
  })

  it('requires confirmation before deleting a timer', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage, () => NOW)
    await repository.create({
      id: 'delete-me',
      title: 'Temporary',
      type: 'counter',
      timeZone: 'UTC',
      startAt: '2023-12-31T00:00:00Z',
      position: 0,
      createdAt: NOW.toString(),
      updatedAt: NOW.toString(),
    })
    renderManage(repository)

    expect(await screen.findByText('Temporary')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    // Modal should open
    expect(await screen.findByRole('alertdialog', { name: 'Eliminar timer' })).toBeInTheDocument()
    expect(screen.getByText('Temporary')).toBeInTheDocument()
    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Temporary')).toBeInTheDocument()
  })

  it('deletes and restarts after confirmation', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageTimerRepository(storage, () => NOW)
    await repository.create({
      id: 'counter',
      title: 'Daily reset',
      type: 'counter',
      timeZone: 'UTC',
      startAt: '2023-12-31T00:00:00Z',
      position: 0,
      createdAt: NOW.toString(),
      updatedAt: NOW.toString(),
    })
    renderManage(repository)

    expect(await screen.findByText('Daily reset')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }))
    // Modal should open
    expect(await screen.findByRole('alertdialog', { name: 'Reiniciar counter' })).toBeInTheDocument()
    // Click confirm in modal - target the button inside the alertdialog
    const modal = await screen.findByRole('alertdialog', { name: 'Reiniciar counter' })
    fireEvent.click(within(modal).getByRole('button', { name: 'Reiniciar' }))
    await waitFor(async () => {
      const restarted = await repository.getById('counter')
      expect(restarted?.type).toBe('counter')
      if (restarted?.type === 'counter') {
        expect(restarted.startAt).toBe(NOW.toString())
      }
    })

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(await screen.findByRole('alertdialog', { name: 'Eliminar timer' })).toBeInTheDocument()
    const deleteModal = await screen.findByRole('alertdialog', { name: 'Eliminar timer' })
    fireEvent.click(within(deleteModal).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByText('Daily reset')).not.toBeInTheDocument())
    expect(screen.getByText('Aún no tienes timers.')).toBeInTheDocument()
  })
})
