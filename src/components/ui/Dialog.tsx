import { useEffectEvent, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import './ui.css'

interface DialogProps {
  children: ReactNode
  labelledBy: string
  describedBy?: string
  onClose: () => void
  returnFocusTo?: HTMLElement | null
  returnFocusRef?: RefObject<HTMLElement | null>
  fallbackFocusRef?: RefObject<HTMLElement | null>
  dismissible?: boolean
  role?: 'dialog' | 'alertdialog'
}

const focusableSelector = 'button, [href], input, select, textarea, [tabindex]'

function getTabStops(panel: HTMLElement) {
  return [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => {
    if (element.tabIndex < 0 || element.matches(':disabled, [hidden], input[type="hidden"]')) return false
    if (element instanceof HTMLInputElement && element.type === 'radio' && element.name) {
      const checked = [...panel.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
        .find((radio) => radio.name === element.name && radio.checked)
      return !checked || checked === element
    }
    return true
  })
}

/** Mount while open. Owns focus, background isolation and dismissal for every modal. */
export function Dialog({ children, labelledBy, describedBy, onClose, returnFocusTo, returnFocusRef, fallbackFocusRef, dismissible = true, role = 'dialog' }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const dismiss = useEffectEvent(() => {
    if (dismissible) onClose()
  })

  useLayoutEffect(() => {
    const panel = panelRef.current!
    const overlay = overlayRef.current!
    const previousFocus = returnFocusTo ?? returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const fallbackFocus = fallbackFocusRef?.current
    const siblings = [...document.body.children]
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
      .map((element) => ({ element, inert: element.getAttribute('inert'), hidden: element.getAttribute('aria-hidden') }))
    const overflow = document.body.style.overflow

    // Move focus before hiding its previous ancestor from assistive technology.
    const initial = panel.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? getTabStops(panel)[0] ?? panel
    initial.focus()
    for (const { element } of siblings) {
      element.setAttribute('inert', '')
      element.setAttribute('aria-hidden', 'true')
    }
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismiss()
      } else if (event.key === 'Tab') {
        const stops = getTabStops(panel)
        const first = stops[0] ?? panel
        const last = stops[stops.length - 1] ?? panel
        if (!stops.some((element) => element === document.activeElement) ||
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        }
      }
    }

    function containFocus(event: FocusEvent) {
      if (event.target instanceof Node && !panel.contains(event.target)) {
        ;(getTabStops(panel)[0] ?? panel).focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', containFocus)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', containFocus)
      for (const { element, inert, hidden } of siblings) {
        if (inert === null) element.removeAttribute('inert')
        else element.setAttribute('inert', inert)
        if (hidden === null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', hidden)
      }
      document.body.style.overflow = overflow
      if (previousFocus?.isConnected) previousFocus.focus()
      else if (fallbackFocus?.isConnected) fallbackFocus.focus()
      // A successful creation can remove the empty-state trigger later in this commit.
      queueMicrotask(() => {
        if (!previousFocus?.isConnected && fallbackFocus?.isConnected) fallbackFocus.focus()
      })
    }
  }, [returnFocusTo, returnFocusRef, fallbackFocusRef])

  return createPortal(
    <div ref={overlayRef} className="cf-dialog-backdrop" role="presentation"
      onClick={(event) => { if (event.target === event.currentTarget && dismissible) onClose() }}>
      <section ref={panelRef} className="cf-dialog" role={role} aria-modal="true"
        aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}>
        {children}
      </section>
    </div>,
    document.body,
  )
}

export function AlertDialog(props: Omit<DialogProps, 'role'>) {
  return <Dialog {...props} role="alertdialog" />
}
