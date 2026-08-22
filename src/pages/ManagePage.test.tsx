import { Temporal } from 'temporal-polyfill'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { ManagePage } from './ManagePage'
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

function renderManage(repository: LocalStorageTimerRepository) {
  return render(
    <MemoryRouter>
      <ManagePage repository={repository} />
    </MemoryRouter>,
  )
}

describe('ManagePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the empty state when there are no timers', async () => {
    renderManage(new LocalStorageTimerRepository(new MemoryStorage(), () => NOW))

    expect(await screen.findByText('Make the first moment count.')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay momentos guardados.')).toBeInTheDocument()
  })

  it('creates a counter from the form', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    renderManage(repository)

    fireEvent.click(screen.getByRole('button', { name: '+ Nuevo timer' }))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'No tomar café' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear timer' }))

    expect(await screen.findByText('No tomar café')).toBeInTheDocument()
    expect(screen.getByText('Counter')).toBeInTheDocument()
    expect(screen.getAllByText('01')).toHaveLength(2)
  })

  it('creates a countdown and renders its remaining duration', async () => {
    const repository = new LocalStorageTimerRepository(new MemoryStorage(), () => NOW)
    renderManage(repository)

    await screen.findByText('Make the first moment count.')
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
    expect(screen.getByText('Make the first moment count.')).toBeInTheDocument()
  })
})
