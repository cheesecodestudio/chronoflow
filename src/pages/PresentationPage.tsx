import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Temporal } from 'temporal-polyfill'

import type { Timer } from '../features/timers/timer.types'
import type { TimerRepository } from '../features/timers/timer.repository'
import { calculateElapsed, calculateRemaining, formatDurationPresent, isCountdownCompleted, type DurationPresentBlock } from '../features/timers/timer.utils'
import { FADE_DURATION_MS, SLIDE_DURATION_MS } from '../features/timers/presentation.constants'
import { useTimers } from '../features/timers/useTimers'

interface PresentationPageProps {
  repository?: TimerRepository
}

export function PresentationPage({ repository }: PresentationPageProps) {
  const navigate = useNavigate()
  const { timers, isLoading, error } = useTimers(repository)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [areControlsVisible, setAreControlsVisible] = useState(true)
  const [now, setNow] = useState(() => Temporal.Now.instant())
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'fade-out' | 'fade-in'>('idle')
  const transitionTimeout = useRef<number | null>(null)
  const controlsTimeout = useRef<number | null>(null)
  const presentationRef = useRef<HTMLElement>(null)

  const moveTimer = useCallback(
    (direction: number) => {
      if (timers.length === 0) {
        return
      }

      // Fase 1: iniciar fade-out
      setTransitionPhase('fade-out')

      if (transitionTimeout.current !== null) {
        window.clearTimeout(transitionTimeout.current)
      }

      // Esperar FADE_DURATION_MS para que termine el fade-out
      transitionTimeout.current = window.setTimeout(() => {
        // Fase 2: AHORA cambiar el timer (mientras está invisible)
        setCurrentIndex((index) => (index + direction + timers.length) % timers.length)
        setTransitionPhase('fade-in')

        // Fase 3: fade-in
        transitionTimeout.current = window.setTimeout(() => {
          setTransitionPhase('idle')
          transitionTimeout.current = null
        }, FADE_DURATION_MS)
      }, FADE_DURATION_MS)
    },
    [timers.length],
  )

  const revealControls = useCallback(() => {
    setAreControlsVisible(true)

    if (controlsTimeout.current !== null) {
      window.clearTimeout(controlsTimeout.current)
    }

    controlsTimeout.current = window.setTimeout(() => {
      setAreControlsVisible(false)
      controlsTimeout.current = null
    }, SLIDE_DURATION_MS)
  }, [])

  useEffect(() => {
    if (isPaused || timers.length < 2) {
      return
    }

    const interval = window.setTimeout(() => moveTimer(1), SLIDE_DURATION_MS)
    return () => window.clearTimeout(interval)
  }, [isPaused, moveTimer, timers.length, currentIndex])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Temporal.Now.instant()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', syncFullscreenState)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      if (transitionTimeout.current !== null) {
        window.clearTimeout(transitionTimeout.current)
      }
      if (controlsTimeout.current !== null) {
        window.clearTimeout(controlsTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        revealControls()
        moveTimer(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        revealControls()
        moveTimer(1)
      } else if (event.key === ' ') {
        event.preventDefault()
        revealControls()
        setIsPaused((paused) => !paused)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        if (document.fullscreenElement) {
          void document.exitFullscreen()
        } else {
          navigate('/manage')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveTimer, navigate, revealControls])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (presentationRef.current?.requestFullscreen) {
        await presentationRef.current.requestFullscreen()
      }
    } catch {
      // Fullscreen can be rejected by the browser or the current permission context.
    }
  }

  const currentTimer = timers.length > 0 ? timers[currentIndex % timers.length] : null

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center bg-[#050b13] text-sm text-slate-500">Cargando presentación...</main>
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050b13] px-6 text-center text-red-100">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-red-300">Presentation View</p>
          <h1 className="mt-4 font-serif text-4xl">No se pudieron cargar los timers.</h1>
          <Link className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white" to="/manage">Volver a Manage</Link>
        </div>
      </main>
    )
  }

  if (!currentTimer) {
    return <EmptyPresentation />
  }

  return (
    <main
      ref={presentationRef}
      className="relative flex min-h-screen overflow-hidden bg-[#050b13] text-white"
      onPointerMove={revealControls}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-amber-300/[0.07] blur-[120px]" />

      {/* Barra superior con misma visibilidad que controles inferiores */}
      <div className={`fixed inset-x-0 top-0 z-10 p-5 transition duration-500 sm:p-8 ${areControlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-5 opacity-0'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/manage" className="group inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 transition hover:text-white" aria-label="Salir a Manage View">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-base transition group-hover:border-cyan-200/50 group-hover:text-cyan-100">←</span>
            Manage View
          </Link>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-slate-600">Chronoflow / live</p>
        </div>
      </div>

      {/* Contenido principal - quitar el padding-top py-20 ya que la barra superior es fixed */}
      <div className={`relative m-auto w-full max-w-6xl px-6 pt-28 pb-20 transition duration-[400ms] sm:px-12 ${transitionPhase !== 'idle' ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="mt-12 text-center sm:mt-16">
          <div className="flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">
            <span className={`h-2 w-2 rounded-full ${currentTimer.type === 'counter' ? 'bg-cyan-300' : 'bg-amber-300'}`} />
            {currentTimer.type === 'counter' ? 'Counter' : 'Countdown'}
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl break-words font-serif text-6xl leading-[0.92] tracking-tight text-white sm:text-8xl lg:text-[9rem]">
            {currentTimer.title}
          </h1>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-slate-500">{currentTimer.timeZone}</p>

          <PresentationDuration timer={currentTimer} now={now} />
        </div>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-10 p-5 transition duration-500 sm:p-8 ${areControlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}>
        <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-[#0a1420]/85 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-center gap-3 px-2 text-xs text-slate-500">
            <span className="font-mono text-cyan-200">{String((currentIndex % timers.length) + 1).padStart(2, '0')}</span>
            <span>/</span>
            <span className="font-mono">{String(timers.length).padStart(2, '0')}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{isPaused ? 'En pausa' : 'Reproduciendo'}</span>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button type="button" aria-label="Timer anterior" onClick={() => moveTimer(-1)} className="presentation-control">←</button>
            <button type="button" aria-label={isPaused ? 'Reanudar presentación' : 'Pausar presentación'} onClick={() => setIsPaused((paused) => !paused)} className="presentation-control presentation-control-wide">
              {isPaused ? '▶ Reanudar' : 'Ⅱ Pausar'}
            </button>
            <button type="button" aria-label="Siguiente timer" onClick={() => moveTimer(1)} className="presentation-control">→</button>
            <button type="button" aria-label={isFullscreen ? 'Salir de fullscreen' : 'Activar fullscreen'} onClick={() => void toggleFullscreen()} className="presentation-control ml-2 border-amber-200/20 text-amber-100 hover:bg-amber-100/10">
              {isFullscreen ? '↙' : '↗'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function PresentationDuration({ timer, now }: { timer: Timer; now: Temporal.Instant }) {
  const completed = timer.type === 'countdown' && isCountdownCompleted(timer, now)
  const durationData = timer.type === 'counter'
    ? formatDurationPresent(calculateElapsed(timer, now))
    : completed
      ? null
      : formatDurationPresent(calculateRemaining(timer, now))

  if (completed) {
    return (
      <div className="mt-16" aria-live="polite">
        <p className="font-serif text-4xl sm:text-6xl text-amber-100 tracking-tight">
          Llegó el momento
        </p>
      </div>
    )
  }

  if (!durationData) {
    return null
  }

  const renderBlock = (blocks: DurationPresentBlock[], isFirstBlock: boolean) => (
    <div key={isFirstBlock ? 'block1' : 'block2'} className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-6 sm:gap-10" role="group" aria-label={isFirstBlock ? 'Fecha' : 'Hora'}>
        {blocks
          .filter((b) => b.visible)
          .map((block) => {
            const progress = Math.min(block.value, 59) / 59
            const dashoffset = 283 - 283 * progress
            return (
              <div key={block.label} className="flex flex-col items-center gap-3">
                <div className="relative flex h-32 w-32 sm:h-36 sm:w-36 lg:h-40 lg:w-40 items-center justify-center" aria-hidden="true">
                  <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="283"
                      strokeDashoffset="283"
                      className="text-white/10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="283"
                      strokeDashoffset={dashoffset}
                      className={isFirstBlock ? 'text-cyan-300' : 'text-amber-300'}
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 2px currentColor)' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-3xl sm:text-4xl lg:text-5xl font-bold tabular-nums text-white">
                    {String(block.value).padStart(2, '0')}
                  </span>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">{block.label}</span>
              </div>
            )
          })}
      </div>
    </div>
  )

  return (
    <div className="mt-16" aria-live="polite">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-slate-500 mb-8">
        {timer.type === 'counter' ? 'Tiempo transcurrido' : 'Tiempo restante'}
      </p>
      <div className="flex flex-col items-center gap-12">
        {renderBlock(durationData.block1, true)}
        {renderBlock(durationData.block2, false)}
      </div>
    </div>
  )
}

function EmptyPresentation() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#050b13] px-6 text-center text-white">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">Presentation View</p>
        <h1 className="mt-5 font-serif text-5xl leading-none sm:text-7xl">The screen is ready.</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-slate-400">Crea un timer desde Manage View para comenzar la secuencia.</p>
        <Link to="/manage" className="mt-8 inline-flex rounded-full bg-cyan-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-white">Ir a Manage View</Link>
      </div>
    </main>
  )
}
