import { Temporal } from 'temporal-polyfill'

import { AppIcon } from './AppIcon'
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
  formatDurationManage,
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
  const { showSeconds } = useSettings()
  const isCounter = timer.type === 'counter'
  const completed = !isCounter && isCountdownCompleted(timer, now)
  const customization = getEffectiveTimerCustomization(timer)
  const accentColor = TIMER_ACCENT_COLORS[customization.accent]
  const duration = isCounter
    ? formatDurationManage(calculateElapsed(timer, now))
    : completed
      ? 'Llegó el momento'
      : formatDurationManage(calculateRemaining(timer, now))
  const durationParts = isCounter
    ? formatDurationManageParts(calculateElapsed(timer, now), showSeconds)
    : completed
      ? []
      : formatDurationManageParts(calculateRemaining(timer, now), showSeconds)

  return (
    <article
      data-timer-accent={customization.accent}
      className="group relative overflow-hidden rounded-[1.75rem] border border-l-4 border-white/10 bg-[#101e2c]/90 p-6 shadow-xl shadow-[#020a12]/25 transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-cyan-950/30"
      style={{ borderLeftColor: accentColor }}
    >
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/3 rounded-full bg-cyan-300/10 blur-3xl transition group-hover:bg-cyan-300/20" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]"
            style={{ color: accentColor }}
          >
            <AppIcon name={getTimerAppIconName(customization.icon)} className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span className={`h-2 w-2 rounded-full ${isCounter ? 'bg-cyan-300' : 'bg-amber-300'}`} />
              {isCounter ? 'Counter' : 'Countdown'}
            </div>
            <h2 className="mt-4 max-w-[18rem] break-words font-serif text-2xl leading-tight text-white">
              {timer.title}
            </h2>
            <span className="sr-only">
              Acento {TIMER_ACCENT_LABELS[customization.accent]}, icono {TIMER_ICON_LABELS[customization.icon]}.
            </span>
          </div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-widest text-slate-500">
          #{timer.position + 1}
        </span>
      </div>

      <div className="relative mt-10 border-t border-white/10 pt-5">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
          {isCounter ? 'Tiempo transcurrido' : completed ? 'Estado' : 'Tiempo restante'}
        </p>
        {completed ? (
          <p className="mt-2 text-lg tracking-tight font-mono text-amber-200">
            {duration}
          </p>
        ) : (
          <p className="mt-2 text-lg tracking-tight font-mono flex flex-wrap items-center gap-x-3 gap-y-1">
            {durationParts
              .filter((part) => part.visible)
              .map((part, index) => (
                <span key={part.label} className="flex items-center gap-1">
                  {index > 0 && <span className="px-1 text-slate-500">:</span>}
                  <span className="text-cyan-100 tabular-nums">{part.value}</span>
                  <span className="text-[0.7rem] uppercase tracking-[0.1em] text-slate-400">{part.label}</span>
                </span>
              ))}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">{timer.timeZone}</p>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center gap-2">
        {isCounter ? (
          <button
            type="button"
            className="min-h-10 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 text-xs font-semibold uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-200/20 focus-visible:outline-2 focus-visible:outline-cyan-200"
            onClick={() => onRestart(timer)}
          >
            <AppIcon name="rotateRight" className="size-3" />
            Reiniciar
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Personalizar ${timer.title}`}
          className="min-h-10 rounded-full border border-white/10 px-4 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-200"
          onClick={(event) => onCustomize(timer, event.currentTarget)}
        >
          <AppIcon name="gear" className="size-3" />
          Personalizar
        </button>
        <button
          type="button"
          className="min-h-10 rounded-full border border-white/10 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:border-red-300/30 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-red-200"
          onClick={() => onDelete(timer)}
        >
          <AppIcon name="trash" className="size-3" />
          Eliminar
        </button>
      </div>
    </article>
  )
}
