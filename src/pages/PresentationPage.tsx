import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Temporal } from 'temporal-polyfill'

import { AppIcon } from '../components/AppIcon'
import type { Timer } from '../features/timers/timer.types'
import type { TimerRepository } from '../features/timers/timer.repository'
import { calculateElapsed, calculateRemaining, formatDurationPresent, isCountdownCompleted, type DurationPresentBlock } from '../features/timers/timer.utils'
import { FADE_DURATION_MS, getSlideDurationMs } from '../features/timers/presentation.constants'
import { useTimers } from '../features/timers/useTimers'
import { useSettings } from '../features/timers/SettingsContext'

interface PresentationPageProps {
  repository?: TimerRepository
}

export function PresentationPage({ repository }: PresentationPageProps) {
  const navigate = useNavigate()
  const { timers, isLoading, error, reload } = useTimers(repository)
  const { showSeconds } = useSettings()
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
    }, getSlideDurationMs())
  }, [])

  useEffect(() => {
    controlsTimeout.current = window.setTimeout(() => {
      setAreControlsVisible(false)
      controlsTimeout.current = null
    }, getSlideDurationMs())
  }, [])

  useEffect(() => {
    if (isPaused || timers.length < 2) {
      return
    }

    const duration = getSlideDurationMs()
    const interval = window.setInterval(() => moveTimer(1), duration)
    return () => window.clearInterval(interval)
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
    return <main className="grid min-h-dvh h-auto place-items-center overflow-x-hidden overflow-y-auto bg-[#050b13] text-sm text-slate-500 sm:h-dvh sm:min-h-0 sm:overflow-hidden" role="status">Cargando presentación...</main>
  }

  if (error) {
    return (
      <main className="grid min-h-dvh h-auto place-items-center overflow-x-hidden overflow-y-auto bg-[#050b13] px-6 text-center text-red-100 sm:h-dvh sm:min-h-0 sm:overflow-hidden" role="alert">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-red-300">Presentation View</p>
          <h1 className="mt-4 font-serif text-4xl">No pudimos cargar la presentación.</h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-slate-400">Puedes intentarlo nuevamente o volver a Manage.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex rounded-full bg-cyan-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-white"
            >
              Reintentar
            </button>
            <Link className="inline-flex rounded-full border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:border-white/40 focus-visible:outline-2 focus-visible:outline-white" to="/manage">Volver a Manage</Link>
          </div>
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
      className="relative h-auto min-h-dvh overflow-x-hidden overflow-y-auto bg-[#050b13] text-white sm:h-dvh sm:min-h-0 sm:overflow-hidden"
      onPointerMove={revealControls}
      onPointerDown={revealControls}
      onFocusCapture={revealControls}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="pointer-events-none absolute -left-32 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-amber-300/[0.07] blur-[120px]" />

      <div className={`absolute inset-x-0 top-0 z-10 p-3 transition duration-500 sm:p-6 lg:p-8 ${areControlsVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-5 opacity-0'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/manage" className="group inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500 transition hover:text-white sm:gap-3 sm:text-xs sm:tracking-[0.2em]" aria-label="Salir a Manage View">
            <span className="grid size-9 place-items-center rounded-full border border-white/15 text-base transition group-hover:border-cyan-200/50 group-hover:text-cyan-100"><AppIcon name="arrowLeft" className="size-3.5" /></span>
            Manage View
          </Link>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-slate-600 sm:text-[0.65rem] sm:tracking-[0.24em]">Chronoflow / live</p>
        </div>
      </div>

      <div className="relative flex min-h-[calc(100dvh-8.5rem)] w-full items-center justify-center overflow-visible px-3 py-12 sm:absolute sm:inset-x-0 sm:bottom-[6.5rem] sm:top-[5.5rem] sm:min-h-0 sm:w-auto sm:overflow-hidden sm:px-8 sm:py-0 lg:bottom-[7.5rem] lg:top-[6.5rem]">
        <div className={`w-full max-w-6xl text-center transition duration-[${FADE_DURATION_MS}ms] ${transitionPhase !== 'idle' ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="flex items-center justify-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-cyan-300 sm:gap-3 sm:text-xs sm:tracking-[0.3em]">
            <span className={`h-2 w-2 rounded-full ${currentTimer.type === 'counter' ? 'bg-cyan-300' : 'bg-amber-300'}`} />
            {currentTimer.type === 'counter' ? 'Counter' : 'Countdown'}
          </div>
          <h1 className={`mx-auto mt-2 max-w-5xl break-words font-serif leading-[0.92] tracking-tight text-white sm:mt-4 lg:mt-5 ${getPresentationTitleSize(currentTimer.title)}`}>
            {currentTimer.title}
          </h1>
          <p className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-slate-500 sm:mt-4 sm:text-[0.65rem] sm:tracking-[0.2em] lg:mt-5">{currentTimer.timeZone}</p>

          <PresentationDuration timer={currentTimer} now={now} showSeconds={showSeconds} />
        </div>
      </div>

      <div className={`absolute inset-x-0 bottom-0 z-10 p-2.5 transition duration-500 sm:p-6 lg:p-8 ${areControlsVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-5 opacity-0'}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 rounded-[1.25rem] border border-white/10 bg-[#0a1420]/85 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl sm:gap-4 sm:rounded-[1.75rem] sm:p-4">
          <div className="flex shrink-0 items-center gap-1.5 px-1 font-mono text-[0.65rem] text-slate-500 sm:gap-3 sm:px-2 sm:text-xs">
            <span className="font-mono text-cyan-200">{String((currentIndex % timers.length) + 1).padStart(2, '0')}</span>
            <span>/</span>
            <span className="font-mono">{String(timers.length).padStart(2, '0')}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{isPaused ? 'En pausa' : 'Reproduciendo'}</span>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
            <button type="button" aria-label="Timer anterior" onClick={() => moveTimer(-1)} className="presentation-control"><AppIcon name="arrowLeft" className="size-3.5" /></button>
            <button type="button" aria-label={isPaused ? 'Reanudar presentación' : 'Pausar presentación'} onClick={() => setIsPaused((paused) => !paused)} className="presentation-control presentation-control-wide">
              <AppIcon name={isPaused ? 'play' : 'pause'} className="size-3" />
              <span className="hidden sm:inline">{isPaused ? 'Reanudar' : 'Pausar'}</span>
            </button>
            <button type="button" aria-label="Siguiente timer" onClick={() => moveTimer(1)} className="presentation-control"><AppIcon name="arrowRight" className="size-3.5" /></button>
            <button type="button" aria-label={isFullscreen ? 'Salir de fullscreen' : 'Activar fullscreen'} onClick={() => void toggleFullscreen()} className="presentation-control border-amber-200/20 text-amber-100 hover:bg-amber-100/10 sm:ml-2">
              <AppIcon name={isFullscreen ? 'compress' : 'expand'} className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function getPresentationTitleSize(title: string): string {
  if (title.length > 60) {
    return 'text-xl sm:text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl'
  }

  if (title.length > 24) {
    return 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl'
  }

  return 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl 2xl:text-9xl'
}

function PresentationDuration({ timer, now, showSeconds }: { timer: Timer; now: Temporal.Instant; showSeconds: boolean }) {
  const completed = timer.type === 'countdown' && isCountdownCompleted(timer, now)
  const durationData = timer.type === 'counter'
    ? formatDurationPresent(calculateElapsed(timer, now), showSeconds)
    : completed
      ? null
      : formatDurationPresent(calculateRemaining(timer, now), showSeconds)

  if (completed) {
    return (
      <div className="mt-6 sm:mt-10 lg:mt-12" aria-live="polite">
        <p className="font-serif text-3xl tracking-tight text-amber-100 sm:text-5xl lg:text-6xl">
          Llegó el momento
        </p>
      </div>
    )
  }

  if (!durationData) {
    return null
  }

  const renderBlock = (blocks: DurationPresentBlock[], isFirstBlock: boolean) => {
    const visibleBlocks = blocks.filter((block) => block.visible)

    if (visibleBlocks.length === 0) {
      return null
    }

    return (
      <div key={isFirstBlock ? 'block1' : 'block2'} className="flex flex-col items-center">
        <div className="flex items-end gap-2 sm:gap-5 lg:gap-8" role="group" aria-label={isFirstBlock ? 'Fecha' : 'Hora'}>
          {visibleBlocks.map((block) => {
            const progress = Math.min(block.value, 59) / 59
            const dashoffset = 283 - 283 * progress
            return (
              <div key={block.label} className="flex flex-col items-center gap-1.5 sm:gap-2 lg:gap-3">
                <div className="relative flex size-16 items-center justify-center sm:size-20 md:size-24 lg:size-28 2xl:size-36" aria-hidden="true">
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
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl lg:text-4xl 2xl:text-5xl">
                    {String(block.value).padStart(2, '0')}
                  </span>
                </div>
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-slate-400 sm:text-[0.6rem] sm:tracking-[0.16em] lg:text-xs lg:tracking-[0.2em]">{block.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 sm:mt-6 lg:mt-8" aria-live="polite">
      <p className="mb-3 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-slate-500 sm:mb-5 sm:text-[0.65rem] sm:tracking-[0.24em] lg:mb-7 lg:text-[0.7rem] lg:tracking-[0.28em]">
        {timer.type === 'counter' ? 'Tiempo transcurrido' : 'Tiempo restante'}
      </p>
      <div className="flex flex-col items-center gap-3 sm:gap-6 2xl:gap-8">
        {renderBlock(durationData.block1, true)}
        {renderBlock(durationData.block2, false)}
      </div>
    </div>
  )
}

function EmptyPresentation() {
  return (
    <main className="grid min-h-dvh h-auto place-items-center overflow-x-hidden overflow-y-auto bg-[#050b13] px-6 text-center text-white sm:h-dvh sm:min-h-0 sm:overflow-hidden">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">Presentation View</p>
        <h1 className="mt-5 font-serif text-5xl leading-none sm:text-7xl">No hay timers para mostrar.</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-slate-400">Crea uno desde Manage View para comenzar la secuencia.</p>
        <Link to="/manage" className="mt-8 inline-flex rounded-full bg-cyan-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-white">Volver a Manage</Link>
      </div>
    </main>
  )
}
