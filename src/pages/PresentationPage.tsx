import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Temporal } from 'temporal-polyfill'

import { AppIcon } from '../components/AppIcon'
import { getTimerAppIconName } from '../components/timerCustomizationIcon'
import type { Timer } from '../features/timers/timer.types'
import {
  getEffectiveTimerCustomization,
  TIMER_ACCENT_COLORS,
  TIMER_ACCENT_LABELS,
  TIMER_ICON_LABELS,
} from '../features/timers/timer.customization'
import type { TimerRepository } from '../features/timers/timer.repository'
import { calculateElapsed, calculateRemaining, formatDurationPresent, isCountdownCompleted, type DurationPresentBlock } from '../features/timers/timer.utils'
import { FADE_DURATION_MS, getSlideDurationMs } from '../features/timers/presentation.constants'
import { useTimers } from '../features/timers/useTimers'
import { useSettings } from '../features/timers/SettingsContext'
import './presentation.css'

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
  const autoAdvanceTimeout = useRef<number | null>(null)
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

  const scheduleControlsHide = useCallback(() => {
    if (controlsTimeout.current !== null) {
      window.clearTimeout(controlsTimeout.current)
    }

    controlsTimeout.current = window.setTimeout(() => {
      if (!presentationRef.current?.contains(document.activeElement)) {
        setAreControlsVisible(false)
      }
      controlsTimeout.current = null
    }, getSlideDurationMs())
  }, [])

  const moveTimerManually = useCallback((direction: number) => {
    if (autoAdvanceTimeout.current !== null) {
      window.clearTimeout(autoAdvanceTimeout.current)
      autoAdvanceTimeout.current = null
    }
    moveTimer(direction)
  }, [moveTimer])

  const revealControls = useCallback(() => {
    setAreControlsVisible(true)
    scheduleControlsHide()
  }, [scheduleControlsHide])

  useEffect(() => {
    scheduleControlsHide()
  }, [scheduleControlsHide])

  useEffect(() => {
    if (isPaused || timers.length < 2) {
      return
    }

    const duration = getSlideDurationMs()
    autoAdvanceTimeout.current = window.setTimeout(() => {
      autoAdvanceTimeout.current = null
      moveTimer(1)
    }, duration)
    return () => {
      if (autoAdvanceTimeout.current !== null) {
        window.clearTimeout(autoAdvanceTimeout.current)
        autoAdvanceTimeout.current = null
      }
    }
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
      revealControls()
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveTimerManually(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveTimerManually(1)
      } else if (event.key === ' ') {
        if (target?.closest('button, a, [role="button"], [role="link"]')) {
          return
        }
        event.preventDefault()
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
  }, [moveTimerManually, navigate, revealControls])

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
    return (
      <main className="presentation-page presentation-state">
        <div role="status">
          <p className="presentation-eyebrow">Presentación</p>
          <p className="presentation-state-title">Cargando presentación…</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="presentation-page presentation-state">
        <div>
          <div role="alert">
            <p className="presentation-eyebrow presentation-error">Presentación</p>
            <h1 className="presentation-state-title">No pudimos cargar la presentación.</h1>
            <p className="presentation-state-description">Puedes intentarlo de nuevo o volver a gestión.</p>
          </div>
          <div className="presentation-state-actions">
            <button
              type="button"
              onClick={() => void reload()}
              className="presentation-button presentation-button-primary"
            >
              Reintentar
            </button>
            <Link className="presentation-button" to="/manage">Volver a gestión</Link>
          </div>
        </div>
      </main>
    )
  }

  if (!currentTimer) {
    return <EmptyPresentation />
  }

  const customization = getEffectiveTimerCustomization(currentTimer)
  const accentColor = TIMER_ACCENT_COLORS[customization.accent]

  return (
    <main
      ref={presentationRef}
      data-timer-accent={customization.accent}
      className="presentation-page"
      onPointerMove={revealControls}
      onPointerDown={revealControls}
      onFocusCapture={revealControls}
      onBlurCapture={revealControls}
    >
      <header className="presentation-chrome presentation-header" data-visible={areControlsVisible}>
        <Link to="/manage" className="presentation-back">
          <AppIcon name="arrowLeft" className="presentation-icon" />
          Volver a gestión
        </Link>
        <p className="presentation-brand">Chronoflow</p>
      </header>

      <div className="presentation-stage">
        <div
          className="presentation-slide"
          data-phase={transitionPhase}
          style={{ '--presentation-fade-duration': `${FADE_DURATION_MS}ms` } as CSSProperties}
        >
          <div className="presentation-eyebrow presentation-type">
            <span className="presentation-accent" style={{ backgroundColor: accentColor }} aria-hidden="true" />
            <span
              aria-hidden="true"
              className="presentation-timer-icon"
              style={{ color: accentColor }}
            >
              <AppIcon name={getTimerAppIconName(customization.icon)} className="presentation-icon" />
            </span>
            {currentTimer.type === 'counter' ? 'Contador' : 'Cuenta atrás'}
          </div>
          <h1 className="presentation-title">
            {currentTimer.title}
          </h1>
          <p className="presentation-sr-only">
            Acento {TIMER_ACCENT_LABELS[customization.accent]}, icono {TIMER_ICON_LABELS[customization.icon]}.
          </p>
          <p className="presentation-timezone"><span className="presentation-sr-only">Zona horaria: </span>{currentTimer.timeZone}</p>

          <PresentationDuration timer={currentTimer} now={now} showSeconds={showSeconds} />
        </div>
      </div>

      <footer className="presentation-chrome presentation-footer" data-visible={areControlsVisible}>
        <div className="presentation-controls-bar">
          <div className="presentation-position">
            <span className="presentation-sr-only">Temporizador </span>
            <span className="presentation-position-current">{String((currentIndex % timers.length) + 1).padStart(2, '0')}</span>
            <span aria-hidden="true">/</span><span className="presentation-sr-only">de</span>
            <span>{String(timers.length).padStart(2, '0')}</span>
            <span aria-hidden="true">·</span>
            <span>{isPaused ? 'En pausa' : 'Reproduciendo'}</span>
          </div>
          <div className="presentation-controls" role="group" aria-label="Controles de presentación">
            <button type="button" aria-label="Temporizador anterior" onClick={() => moveTimerManually(-1)} className="presentation-button presentation-icon-button"><AppIcon name="arrowLeft" className="presentation-icon" /></button>
            <button type="button" aria-label={isPaused ? 'Reanudar presentación' : 'Pausar presentación'} onClick={() => setIsPaused((paused) => !paused)} className="presentation-button presentation-pause">
              <AppIcon name={isPaused ? 'play' : 'pause'} className="presentation-icon" />
              <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
            </button>
            <button type="button" aria-label="Siguiente temporizador" onClick={() => moveTimerManually(1)} className="presentation-button presentation-icon-button"><AppIcon name="arrowRight" className="presentation-icon" /></button>
            <button type="button" aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa'} onClick={() => void toggleFullscreen()} className="presentation-button presentation-icon-button">
              <AppIcon name={isFullscreen ? 'compress' : 'expand'} className="presentation-icon" />
            </button>
          </div>
        </div>
      </footer>
    </main>
  )
}

function PresentationDuration({ timer, now, showSeconds }: { timer: Timer; now: Temporal.Instant; showSeconds: boolean }) {
  const completed = timer.type === 'countdown' && isCountdownCompleted(timer, now)
  const counterTimer = timer as Extract<Timer, { type: 'counter' }>
  const countdownTimer = timer as Extract<Timer, { type: 'countdown' }>
  const durationData = timer.type === 'counter'
    ? formatDurationPresent(calculateElapsed(counterTimer, now), showSeconds)
    : completed
      ? null
      : formatDurationPresent(calculateRemaining(countdownTimer, now), showSeconds)

  if (completed) {
    return (
      <div className="presentation-completed" role="status">
        <p>
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
      <div className="presentation-unit-group" role="group" aria-label={isFirstBlock ? 'Fecha' : 'Hora'}>
        {visibleBlocks.map((block) => (
          <dl
            key={block.label}
            className={`presentation-unit${block.label === 'SEGUNDOS' ? ' presentation-unit-seconds' : ''}`}
            style={{ '--presentation-digits': Math.max(2, String(block.value).length) } as CSSProperties}
          >
            <dt className="presentation-unit-label">{block.label}</dt>
            <dd className="presentation-value">{String(block.value).padStart(2, '0')}</dd>
          </dl>
        ))}
      </div>
    )
  }

  return (
    <section className="presentation-duration" aria-label={timer.type === 'counter' ? 'Tiempo transcurrido' : 'Tiempo restante'}>
      <p className="presentation-duration-caption">
        {timer.type === 'counter' ? 'Tiempo transcurrido' : 'Tiempo restante'}
      </p>
      <div
        className="presentation-units"
        style={{ '--presentation-unit-count': [...durationData.block1, ...durationData.block2].filter((block) => block.visible).length } as CSSProperties}
      >
        {renderBlock(durationData.block1, true)}
        {renderBlock(durationData.block2, false)}
      </div>
    </section>
  )
}

function EmptyPresentation() {
  return (
    <main className="presentation-page presentation-state">
      <div>
        <p className="presentation-eyebrow">Presentación</p>
        <h1 className="presentation-state-title">No hay temporizadores para mostrar.</h1>
        <p className="presentation-state-description">Crea un contador o una cuenta atrás en gestión para comenzar.</p>
        <div className="presentation-state-actions">
          <Link to="/manage" className="presentation-button presentation-button-primary">Volver a gestión</Link>
        </div>
      </div>
    </main>
  )
}
