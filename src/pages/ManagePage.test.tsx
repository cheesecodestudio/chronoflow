import { Temporal } from 'temporal-polyfill'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { ManagePage } from './ManagePage'
import { AuthContext, type AuthContextValue } from '../features/auth/AuthContext'
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

const unavailableAuth: AuthContextValue = {
  status: 'anonymous',
  session: null,
  user: null,
  error: 'Authentication unavailable',
  pendingOperation: null,
  operationError: null,
  signInWithPassword: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
}

function renderManage(
  repository: LocalStorageTimerRepository,
  auth: AuthContextValue = unavailableAuth,
) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <SettingsProvider>
          <ManagePage repository={repository} />
        </SettingsProvider>
      </AuthContext.Provider>
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
    expect(screen.getByRole('heading', { name: 'Mis timers', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Presentar' })).toHaveAttribute('href', '/view')
  })

  it('composes anonymous authentication into the header without replacing existing actions', async () => {
    renderManage(new LocalStorageTimerRepository(new MemoryStorage(), () => NOW), {
      ...unavailableAuth,
      error: null,
    })

    await screen.findByRole('heading', { name: 'Aún no tienes timers.' })
    const headerActions = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(headerActions).getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(within(headerActions).getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    expect(within(headerActions).getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(within(headerActions).getByRole('link', { name: 'Presentar' })).toHaveAttribute('href', '/view')
    expect(within(headerActions).getByRole('button', { name: 'Ajustes' })).toBeInTheDocument()
  })

  it('opens the settings shell from Manage and closes it without persistence', async () => {
    const storage = new MemoryStorage()
    renderManage(new LocalStorageTimerRepository(storage, () => NOW))

    const trigger = await screen.findByRole('button', { name: 'Ajustes' })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Ajustes' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Duración por timer' })).toHaveValue('5')
    expect(screen.getByText('5 s')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar ajustes' }))
    expect(storage.getItem('chronoflow:settings:v1')).toBeNull()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('slider', { name: 'Duración por timer' }))
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar ajustes' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Ajustes' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
    expect(storage.getItem('chronoflow:settings:v1')).toBeNull()
  })

  it('closes the settings shell from the backdrop but not from its panel', async () => {
    renderManage(new LocalStorageTimerRepository(new MemoryStorage(), () => NOW))
    fireEvent.click(await screen.findByRole('button', { name: 'Ajustes' }))

    const dialog = screen.getByRole('dialog', { name: 'Ajustes' })
    fireEvent.click(dialog)
    expect(screen.getByRole('dialog', { name: 'Ajustes' })).toBeInTheDocument()

    fireEvent.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog', { name: 'Ajustes' })).not.toBeInTheDocument()
  })

  it('toggles and restores the seconds preference from local storage', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    const firstRender = renderManage(repository)

    fireEvent.click(await screen.findByRole('button', { name: 'Ajustes' }))
    const toggle = screen.getByRole('switch', { name: 'Ocultar segundos' })
    expect(toggle).toHaveAttribute('type', 'checkbox')
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(toggle)
    expect(screen.getByRole('switch', { name: 'Mostrar segundos' })).toHaveAttribute('aria-checked', 'false')
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"showSeconds":false')

    firstRender.unmount()
    renderManage(repository)
    fireEvent.click(await screen.findByRole('button', { name: 'Ajustes' }))

    expect(screen.getByRole('switch', { name: 'Mostrar segundos' })).toHaveAttribute('aria-checked', 'false')
  })

  it('changes the slide duration in seconds and persists milliseconds', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    renderManage(repository)

    fireEvent.click(await screen.findByRole('button', { name: 'Ajustes' }))
    const slider = screen.getByRole('slider', { name: 'Duración por timer' })

    expect(slider).toHaveAttribute('min', '2')
    expect(slider).toHaveAttribute('max', '60')
    expect(slider).toHaveAttribute('step', '1')

    fireEvent.change(slider, { target: { value: '12' } })
    expect(screen.getByText('12 s')).toBeInTheDocument()
    expect(window.localStorage.getItem(PRESENTATION_SETTINGS_STORAGE_KEY)).toBeNull()

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
    expect(screen.getByText('Contador')).toBeInTheDocument()
    expect(screen.getAllByRole('definition').map((element) => element.textContent)).toEqual(['1', '1', '0'])
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
    expect(screen.getByText('Cuenta atrás')).toBeInTheDocument()
    expect(screen.getByText('Tiempo restante')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo timer' })).toHaveFocus()
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
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Temporary' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar Daily reset' }))
    // Modal should open
    expect(await screen.findByRole('alertdialog', { name: 'Reiniciar contador' })).toBeInTheDocument()
    // Click confirm in modal - target the button inside the alertdialog
    const modal = await screen.findByRole('alertdialog', { name: 'Reiniciar contador' })
    fireEvent.click(within(modal).getByRole('button', { name: 'Reiniciar' }))
    await waitFor(async () => {
      const restarted = await repository.getById('counter')
      expect(restarted?.type).toBe('counter')
      if (restarted?.type === 'counter') {
        expect(restarted.startAt).toBe(NOW.toString())
      }
    })

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Daily reset' }))
    expect(await screen.findByRole('alertdialog', { name: 'Eliminar timer' })).toBeInTheDocument()
    const deleteModal = await screen.findByRole('alertdialog', { name: 'Eliminar timer' })
    fireEvent.click(within(deleteModal).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByText('Daily reset')).not.toBeInTheDocument())
    expect(screen.getByText('Aún no tienes timers.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo timer' })).toHaveFocus()
  })

  it.each(['Nuevo timer', 'Crear primer timer'])('contains creation focus and restores it to %s on dismissal', async (name) => {
    const { container } = renderManage(new LocalStorageTimerRepository(new MemoryStorage(), () => NOW))
    await screen.findByText('Aún no tienes timers.')
    const trigger = screen.getByRole('button', { name })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Crear nuevo timer' })
    const title = screen.getByRole('textbox', { name: 'Título' })
    expect(title).toHaveFocus()
    expect(container).toHaveAttribute('inert')
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Crear timer' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(title).toHaveFocus()
    fireEvent.click(dialog)
    expect(dialog).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(container).not.toHaveAttribute('inert')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it.each([
    ['Eliminar', 'Eliminar timer'],
    ['Reiniciar', 'Reiniciar contador'],
  ])('contains %s confirmation focus and cancels through Escape and backdrop', async (action, title) => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({
      id: 'focus-test', title: 'Una referencia', type: 'counter', timeZone: 'UTC',
      startAt: '2023-12-31T00:00:00Z', position: 0, createdAt: NOW.toString(), updatedAt: NOW.toString(),
    })
    const { container } = renderManage(repository)
    const trigger = await screen.findByRole('button', { name: `${action} Una referencia` })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('alertdialog', { name: title })
    expect(dialog).toHaveAccessibleDescription(/Una referencia/)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(container).toHaveAttribute('inert')
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(within(dialog).getByRole('button', { name: action })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('alertdialog').parentElement!)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(container).not.toHaveAttribute('inert')
    expect(await repository.getById('focus-test')).toMatchObject({ startAt: '2023-12-31T00:00:00Z' })
  })

  it.each(['Escape', 'backdrop', 'button'])('persists the pending duration on settings close via %s', async (method) => {
    renderManage(new LocalStorageTimerRepository(new MemoryStorage(), () => NOW))
    const trigger = await screen.findByRole('button', { name: 'Ajustes' })
    fireEvent.click(trigger)
    fireEvent.change(screen.getByRole('slider', { name: 'Duración por timer' }), { target: { value: '17' } })
    expect(window.localStorage.getItem(PRESENTATION_SETTINGS_STORAGE_KEY)).toBeNull()
    if (method === 'Escape') fireEvent.keyDown(document, { key: 'Escape' })
    else if (method === 'backdrop') fireEvent.click(screen.getByRole('dialog').parentElement!)
    else fireEvent.click(screen.getByRole('button', { name: 'Cerrar ajustes' }))
    expect(window.localStorage.getItem(PRESENTATION_SETTINGS_STORAGE_KEY)).toContain('"slideDurationMs":17000')
    expect(trigger).toHaveFocus()
  })

  it('retains validation and associates the error with the focused field', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    renderManage(repository)
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo timer' }))
    const title = screen.getByRole('textbox', { name: 'Título' })
    fireEvent.change(title, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear timer' }))
    const error = await screen.findByRole('alert')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAccessibleDescription(error.textContent!)
    expect(title).toHaveFocus()
    expect(await repository.getAll()).toEqual([])
    expect(screen.getByRole('dialog', { name: 'Crear nuevo timer' })).toBeInTheDocument()
  })

  it('traps personalization focus and cancels the selected appearance through the backdrop', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    await repository.create({
      id: 'appearance-focus', title: 'Referencia', type: 'counter', timeZone: 'UTC',
      startAt: '2023-12-31T00:00:00Z', position: 0, createdAt: NOW.toString(), updatedAt: NOW.toString(),
      accent: 'blue', icon: 'clock',
    })
    renderManage(repository)
    const trigger = await screen.findByRole('button', { name: 'Personalizar Referencia' })
    fireEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Cerrar personalización' })).toHaveFocus()
    expect(screen.getAllByRole('radio')).toHaveLength(12)
    expect(screen.getByRole('radio', { name: 'Pizarra' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Guardar personalización' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Cerrar personalización' })).toHaveFocus()
    fireEvent.click(screen.getByRole('radio', { name: 'Pizarra' }))
    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(trigger).toHaveFocus()
    expect(await repository.getById('appearance-focus')).toMatchObject({ accent: 'blue', icon: 'clock' })
  })
})
