import { useId } from 'react'
import { Temporal } from 'temporal-polyfill'

import { AppIcon } from './AppIcon'
import { Button } from './ui/Button'
import { getTimerAppIconName } from './timerCustomizationIcon'
import type { Timer } from '../features/timers/timer.types'
import {
  getEffectiveTimerCustomization,
  TIMER_ACCENT_COLORS,
  TIMER_ACCENT_LABELS,
  TIMER_ICON_LABELS,
} from '../features/timers/timer.customization'
import {
  calculateElapsed,
  calculateRemaining,
  formatDurationManageParts,
  isCountdownCompleted,
} from '../features/timers/timer.utils'
import { useSettings } from '../features/timers/SettingsContext'

interface TimerCardProps {
  timer: Timer
  now: Temporal.Instant
  onDelete: (timer: Timer) => void
  onRestart: (timer: Timer) => void
  onCustomize: (timer: Timer, trigger: HTMLButtonElement) => void
}

export function TimerCard({ timer, now, onDelete, onRestart, onCustomize }: TimerCardProps) {
  const titleId = useId()
  const { showSeconds } = useSettings()
  const isCounter = timer.type === 'counter'
  const completed = !isCounter && isCountdownCompleted(timer, now)
  const customization = getEffectiveTimerCustomization(timer)
  const accentColor = TIMER_ACCENT_COLORS[customization.accent]
  const durationParts = isCounter
    ? formatDurationManageParts(calculateElapsed(timer, now), showSeconds)
    : completed
      ? []
      : formatDurationManageParts(calculateRemaining(timer, now), showSeconds)

  return (
    <article aria-labelledby={titleId} data-timer-accent={customization.accent}
      className="cf-timer-card" style={{ borderLeftColor: accentColor }}>
      <div className="cf-card-header">
        <span aria-hidden="true" className="cf-card-icon" style={{ color: accentColor }}>
          <AppIcon name={getTimerAppIconName(customization.icon)} />
        </span>
        <div className="cf-card-title">
          <p className="cf-eyebrow">{isCounter ? 'Contador' : 'Cuenta atrás'}</p>
          <h2 id={titleId}>{timer.title}</h2>
          <span className="cf-sr-only">Acento {TIMER_ACCENT_LABELS[customization.accent]}, icono {TIMER_ICON_LABELS[customization.icon]}.</span>
        </div>
        <span className="cf-card-number">{(timer.position + 1).toString().padStart(2, '0')}</span>
      </div>

      <div className="cf-card-time">
        <p className="cf-eyebrow">{isCounter ? 'Tiempo transcurrido' : completed ? 'Estado' : 'Tiempo restante'}</p>
        {completed ? (
          <p className="cf-completed">Llegó el momento</p>
        ) : (
          <p className="cf-duration">
            {durationParts.filter((part) => part.visible).map((part) => (
              <span key={part.label} className="cf-duration-part">
                <span className="cf-duration-value">{part.value}</span>
                <span className="cf-duration-unit">{part.label}</span>
              </span>
            ))}
          </p>
        )}
        <p className="cf-timezone">{timer.timeZone}</p>
      </div>

      <div className="cf-card-actions">
        {isCounter ? (
          <Button variant="ghost" aria-label={`Reiniciar ${timer.title}`} aria-haspopup="dialog" onClick={(event) => { event.currentTarget.focus(); onRestart(timer) }}>
            <AppIcon name="rotateRight" />Reiniciar
          </Button>
        ) : null}
        <Button variant="ghost" aria-label={`Personalizar ${timer.title}`} aria-haspopup="dialog"
          onClick={(event) => onCustomize(timer, event.currentTarget)}>
          <AppIcon name="gear" />Personalizar
        </Button>
        <Button variant="ghost" className="cf-delete" aria-label={`Eliminar ${timer.title}`} aria-haspopup="dialog"
          onClick={(event) => { event.currentTarget.focus(); onDelete(timer) }}>
          <AppIcon name="trash" />Eliminar
        </Button>
      </div>
    </article>
  )
}
