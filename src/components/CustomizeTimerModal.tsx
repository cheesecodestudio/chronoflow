import { useCallback, useEffect, useRef, useState } from 'react'

import { AppIcon } from './AppIcon'
import { TimerCustomizationFields } from './TimerCustomizationFields'
import { getEffectiveTimerCustomization } from '../features/timers/timer.customization'
import type { Timer, TimerCustomization } from '../features/timers/timer.types'

interface CustomizeTimerModalProps {
  timer: Timer
  onSubmit: (customization: Required<TimerCustomization>) => Promise<void>
  onClose: () => void
  returnFocusTo: HTMLButtonElement | null
}

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function CustomizeTimerModal({
  timer,
  onSubmit,
  onClose,
  returnFocusTo,
}: CustomizeTimerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [customization, setCustomization] = useState<Required<TimerCustomization>>(
    () => getEffectiveTimerCustomization(timer),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const close = useCallback(() => {
    onClose()
    returnFocusTo?.focus()
  }, [onClose, returnFocusTo])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isSubmitting) {
          return
        }

        event.preventDefault()
        close()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!first || !last) {
        event.preventDefault()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [close, isSubmitting])

  async function handleSubmit() {
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await onSubmit(customization)
      close()
    } catch {
      setSubmitError('No se pudo guardar la personalización. Inténtalo nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#020a12]/85 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) close()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-timer-title"
        aria-describedby="customize-timer-description"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#0b1826] p-6 shadow-2xl shadow-black/50 sm:rounded-[2rem] sm:p-8"
      >
        <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-5">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-cyan-300">
              Identidad del timer
            </p>
            <h2 id="customize-timer-title" className="mt-2 font-serif text-3xl text-white">
              Personalizar “{timer.title}”
            </h2>
            <p id="customize-timer-description" className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Cambia únicamente su acento e icono. El tiempo y los demás datos permanecen intactos.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cerrar personalización"
            disabled={isSubmitting}
            onClick={close}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-200 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            <AppIcon name="xmark" className="size-4" />
          </button>
        </header>

        <div className="mt-6">
          <TimerCustomizationFields
            value={customization}
            onChange={setCustomization}
            disabled={isSubmitting}
          />
        </div>

        {submitError ? (
          <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={close}
            className="min-h-12 rounded-full border border-white/10 px-6 text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="min-h-12 rounded-full bg-cyan-200 px-6 text-sm font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar personalización'}
          </button>
        </div>
      </div>
    </div>
  )
}
