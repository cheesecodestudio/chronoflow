import { Temporal } from 'temporal-polyfill'

import type { Timer } from '../features/timers/timer.types'
import {
  calculateElapsed,
  calculateRemaining,
  formatDurationManage,
  isCountdownCompleted,
} from '../features/timers/timer.utils'

interface TimerCardProps {
  timer: Timer
  now: Temporal.Instant
  onDelete: (timer: Timer) => void
  onRestart: (timer: Timer) => void
}

export function TimerCard({ timer, now, onDelete, onRestart }: TimerCardProps) {
  const isCounter = timer.type === 'counter'
  const completed = !isCounter && isCountdownCompleted(timer, now)
  const duration = isCounter
    ? formatDurationManage(calculateElapsed(timer, now))
    : completed
      ? 'Llegó el momento'
      : formatDurationManage(calculateRemaining(timer, now))

  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#101e2c]/90 p-6 shadow-xl shadow-[#020a12]/25 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-cyan-950/30">
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/3 rounded-full bg-cyan-300/10 blur-3xl transition group-hover:bg-cyan-300/20" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span className={`h-2 w-2 rounded-full ${isCounter ? 'bg-cyan-300' : 'bg-amber-300'}`} />
            {isCounter ? 'Counter' : 'Countdown'}
          </div>
          <h2 className="mt-4 max-w-[18rem] break-words font-serif text-2xl leading-tight text-white">
            {timer.title}
          </h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-widest text-slate-500">
          #{timer.position + 1}
        </span>
      </div>

      <div className="relative mt-10 border-t border-white/10 pt-5">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
          {isCounter ? 'Tiempo transcurrido' : completed ? 'Estado' : 'Tiempo restante'}
        </p>
        <p className={`mt-2 text-lg tracking-tight font-mono ${completed ? 'text-amber-200' : 'text-cyan-100'}`}>
          {duration}
        </p>
        <p className="mt-3 text-xs text-slate-500">{timer.timeZone}</p>
      </div>

      <div className="relative mt-6 flex items-center gap-2">
        {isCounter ? (
          <button
            type="button"
            className="min-h-10 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 text-xs font-semibold uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-200/20 focus-visible:outline-2 focus-visible:outline-cyan-200"
            onClick={() => onRestart(timer)}
          >
            Reiniciar
          </button>
        ) : null}
        <button
          type="button"
          className="min-h-10 rounded-full border border-white/10 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:border-red-300/30 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-red-200"
          onClick={() => onDelete(timer)}
        >
          Eliminar
        </button>
      </div>
    </article>
  )
}
