import { useEffect, useRef, useState, type RefObject } from 'react'

import { AppIcon } from './AppIcon'
import { readPresentationSettings, writePresentationSettings, getSlideDurationErrorMessage, MIN_SLIDE_DURATION_MS, MAX_SLIDE_DURATION_MS, SLIDE_DURATION_STEP_MS } from '../features/timers/presentation.settings'
import { useSettings } from '../features/timers/SettingsContext'

interface SettingsModalProps {
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

export function SettingsModal({ onClose, returnFocusRef }: SettingsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [slideDuration, setSlideDuration] = useState<number>(() => readPresentationSettings().slideDurationMs)
  const [slideDurationError, setSlideDurationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { showSeconds, setShowSeconds } = useSettings()

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
        aria-labelledby="settings-modal-title"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#0b1826] p-6 shadow-2xl shadow-black/50 sm:rounded-[2rem] sm:p-8"
      >
        <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-5">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-cyan-300">Workspace settings</p>
            <h2 id="settings-modal-title" className="mt-2 font-serif text-3xl text-white">Configuración</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Un espacio para preparar las preferencias que harán tu observatorio más tuyo.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Cerrar configuración"
            onClick={close}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-xl text-slate-400 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-200 focus-visible:outline-offset-2"
          >
            <AppIcon name="xmark" className="size-4" />
          </button>
        </header>

        <div className="mt-6 space-y-5">
          <section aria-labelledby="settings-presentation-title" className="rounded-[1.5rem] border border-cyan-200/15 bg-cyan-200/[0.035] p-5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl border border-cyan-200/20 bg-cyan-200/10 font-mono text-sm text-cyan-100">01</span>
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-cyan-300/80">Presentation layer</p>
                <h3 id="settings-presentation-title" className="mt-1 font-serif text-2xl text-white">Configuración / Presentación</h3>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-slate-500">MVP-113</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">Mostrar u ocultar segundos</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showSeconds}
                  aria-label={showSeconds ? 'Ocultar segundos' : 'Mostrar segundos'}
                  onClick={() => setShowSeconds(!showSeconds)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-cyan-200 focus-visible:outline-offset-2 ${
                    showSeconds ? 'bg-cyan-300' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showSeconds ? 'translate-x-6' : 'translate-x-1'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <div className="space-y-2">
                <label htmlFor="slide-duration" className="block font-mono text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">
                  Duración por slide (ms)
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="slide-duration"
                    type="number"
                    min={MIN_SLIDE_DURATION_MS}
                    max={MAX_SLIDE_DURATION_MS}
                    step={SLIDE_DURATION_STEP_MS}
                    value={slideDuration}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setSlideDuration(value)
                      const error = getSlideDurationErrorMessage(value)
                      setSlideDurationError(error)
                    }}
                    onBlur={() => {
                      const error = getSlideDurationErrorMessage(slideDuration)
                      if (error) {
                        setSlideDurationError(error)
                      } else {
                        setSlideDurationError(null)
                        writePresentationSettings({ slideDurationMs: slideDuration })
                        setSlideDuration(slideDuration)
                      }
                    }}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300"
                    aria-describedby={slideDurationError ? 'slide-duration-error' : undefined}
                    aria-invalid={slideDurationError ? 'true' : 'false'}
                  />
                  {slideDurationError && (
                    <p id="slide-duration-error" className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-red-400" role="alert" aria-live="polite">
                      {slideDurationError}
                    </p>
                  )}
                </div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-slate-500">
                  Mínimo {MIN_SLIDE_DURATION_MS}ms, máximo {MAX_SLIDE_DURATION_MS}ms, incrementos de {SLIDE_DURATION_STEP_MS}ms
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="settings-customization-title" className="rounded-[1.5rem] border border-amber-200/15 bg-amber-200/[0.035] p-5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl border border-amber-200/20 bg-amber-200/10 font-mono text-sm text-amber-100">02</span>
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-amber-200/70">Visual language</p>
                <h3 id="settings-customization-title" className="mt-1 font-serif text-2xl text-white">Personalización visual</h3>
              </div>
            </div>
            <div className="mt-5">
              <PlaceholderCard ticket="MVP-115" title="Personalización visual de timers" />
            </div>
          </section>
        </div>

        <p className="mt-6 border-t border-white/10 pt-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">
          Estas secciones se activarán en las próximas tareas del MVP 1.1.
        </p>
      </div>
    </div>
  )
}

function PlaceholderCard({ ticket, title }: { ticket: string; title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-slate-500">{ticket}</p>
          <p className="mt-1 text-sm font-medium text-slate-200">{title}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-slate-500">Próximamente</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Espacio reservado para una configuración futura.</p>
    </div>
  )
}
