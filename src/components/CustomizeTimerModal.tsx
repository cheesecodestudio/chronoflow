import { useEffect, useRef, useState, type RefObject } from 'react'

import { AppIcon } from './AppIcon'
import type { Timer, TimerColor, TimerIcon } from '../features/timers/timer.types'
import { useTimers } from '../features/timers/useTimers'
import {
  TIMER_COLORS_ORDERED,
  TIMER_ICONS_ORDERED,
  TIMER_COLOR_LABELS,
  TIMER_ICON_LABELS,
  getTimerColorHex,
  getTimerIconName,
} from '../features/timers/timer.customization'

interface CustomizeTimerModalProps {
  timer: Timer
  onClose: () => void
  returnFocusRef: RefObject<HTMLElement | null>
}

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function CustomizeTimerModal({ timer, onClose, returnFocusRef }: CustomizeTimerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { updateCustomization } = useTimers()
  const [color, setColor] = useState<TimerColor>(timer.color ?? 'neutral')
  const [icon, setIcon] = useState<TimerIcon>(timer.icon ?? 'none')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function close() {
    onClose()
    returnFocusRef.current?.focus()
  }

  async function handleSave() {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await updateCustomization(timer.id, color, icon)
      close()
    } catch {
      setSubmitError('No se pudo actualizar la personalización.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#020a12]/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-modal-title"
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#0b1826] p-6 shadow-2xl shadow-black/50 sm:rounded-[2rem] sm:p-8"
      >
        <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-5">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-amber-300">Visual language</p>
            <h2 id="customize-modal-title" className="mt-2 font-serif text-3xl text-white">Personalizar &ldquo;{timer.title}&rdquo;</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Elige un color de acento e icono para identificar este timer rápidamente.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cerrar personalización"
            onClick={close}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-xl text-slate-400 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-200 focus-visible:outline-offset-2"
          >
            <AppIcon name="xmark" className="size-4" />
          </button>
        </header>

        <div className="mt-6 space-y-5">
          <fieldset className="border border-white/10 rounded-2xl p-4" disabled={isSubmitting}>
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Color de acento</legend>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Seleccionar color de acento">
              {TIMER_COLORS_ORDERED.map((c) => {
                const isSelected = color === c
                const hex = getTimerColorHex(c, false)
                const darkHex = getTimerColorHex(c, true)
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={TIMER_COLOR_LABELS[c]}
                    disabled={isSubmitting}
                    onClick={() => !isSubmitting && setColor(c)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                      if (!isSubmitting && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        setColor(c)
                      }
                    }}
                    className={`relative size-10 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isSelected
                        ? 'ring-2 ring-white scale-110 shadow-lg'
                        : 'hover:scale-105 focus-visible:ring-amber-300/50'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${hex} 0%, ${darkHex} 100%)`,
                      boxShadow: isSelected ? `0 0 0 2px ${hex}, 0 0 0 4px ${darkHex}` : undefined,
                    }}
                  >
                    {isSelected && <AppIcon name="xmark" className="absolute inset-0 m-auto size-5 text-white drop-shadow" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-[0.65rem] text-slate-500">
              {TIMER_COLORS_ORDERED.map((c) => (
                <span key={c} className={`${color === c ? 'font-semibold text-white' : ''}`}>{TIMER_COLOR_LABELS[c]}</span>
              ))}
            </div>
          </fieldset>

          <fieldset className="border border-white/10 rounded-2xl p-4" disabled={isSubmitting}>
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Icono</legend>
            <div className="grid grid-cols-5 gap-3" role="radiogroup" aria-label="Seleccionar icono">
              {TIMER_ICONS_ORDERED.map((i) => {
                const isSelected = icon === i
                const iconName = getTimerIconName(i)
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={TIMER_ICON_LABELS[i]}
                    disabled={isSubmitting}
                    onClick={() => !isSubmitting && setIcon(i)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
                      if (!isSubmitting && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        setIcon(i)
                      }
                    }}
                    className={`relative aspect-square rounded-xl border-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isSelected
                        ? 'border-amber-300 bg-amber-300/10 scale-105'
                        : 'border-white/10 hover:border-white/30 hover:bg-white/5 focus-visible:border-amber-300/50'
                    }`}
                  >
                    {i === 'none' ? (
                      <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-medium text-slate-500">Ø</span>
                    ) : (
                      <AppIcon name={iconName!} className="absolute inset-0 m-auto size-6 text-slate-300" aria-hidden="true" />
                    )}
                    {isSelected && <AppIcon name="xmark" className="absolute top-1 right-1 size-4 text-amber-300" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {submitError ? (
            <p className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={close}
            disabled={isSubmitting}
            className="min-h-12 flex-1 rounded-full border border-white/10 px-5 text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60 disabled:cursor-wait"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="min-h-12 flex-1 rounded-full bg-amber-200 px-5 text-sm font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-60 disabled:cursor-wait"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}