import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'
import { Dialog } from './Dialog'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir</Button>
      {open ? (
        <Dialog labelledBy="test-title" describedBy="test-description" onClose={() => setOpen(false)}>
          <h2 id="test-title">Prueba de diálogo</h2>
          <p id="test-description">Descripción del diálogo.</p>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <fieldset disabled><input aria-label="Campo deshabilitado" /></fieldset>
          <Button>Confirmar</Button>
        </Dialog>
      ) : null}
    </>
  )
}

describe('Dialog', () => {
  it('isolates the background, traps focus in both directions and restores it on Escape', () => {
    const { container } = render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Prueba de diálogo' })
    const first = screen.getByRole('button', { name: 'Cancelar' })
    const last = screen.getByRole('button', { name: 'Confirmar' })
    expect(dialog).toHaveAccessibleDescription('Descripción del diálogo.')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(container).toHaveAttribute('inert')
    expect(container).toHaveAttribute('aria-hidden', 'true')
    expect(document.body.style.overflow).toBe('hidden')
    expect(first).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(first).toHaveFocus()
    trigger.focus()
    expect(first).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(container).not.toHaveAttribute('inert')
    expect(container).not.toHaveAttribute('aria-hidden')
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('dismisses only on the backdrop and retains pre-existing background attributes on cleanup', () => {
    const { container, unmount } = render(<Harness />)
    container.setAttribute('aria-hidden', 'false')
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(dialog).toBeInTheDocument()
    fireEvent.click(dialog.parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(container).toHaveAttribute('aria-hidden', 'false')
    fireEvent.click(trigger)
    unmount()
    expect(container).not.toHaveAttribute('inert')
    expect(container).toHaveAttribute('aria-hidden', 'false')
  })

  it('uses latest dismissal state without resetting focus on rerender and handles no enabled controls', () => {
    const onClose = vi.fn()
    const content = (dismissible: boolean) => (
      <Dialog labelledBy="busy-title" onClose={onClose} dismissible={dismissible}>
        <h2 id="busy-title">Guardando</h2>
        <Button disabled={!dismissible}>Primero</Button>
        <Button disabled={!dismissible}>Último</Button>
      </Dialog>
    )
    const { rerender } = render(content(true))
    const last = screen.getByRole('button', { name: 'Último' })
    last.focus()
    rerender(content(true))
    expect(last).toHaveFocus()
    rerender(content(false))
    fireEvent.keyDown(document, { key: 'Escape' })
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog.parentElement!)
    expect(onClose).not.toHaveBeenCalled()
    dialog.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(dialog).toHaveFocus()
    rerender(content(true))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
