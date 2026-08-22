import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Temporal } from 'temporal-polyfill'

import type { TimerDraft, TimerType, TimerColor, TimerIcon } from '../features/timers/timer.types'
import { detectTimeZone, localDateTimeToInstant } from '../features/timers/timer.utils'
import { TimerValidationException } from '../features/timers/timer.use-cases'
import {
  TIMER_COLORS_ORDERED,
  TIMER_ICONS_ORDERED,
  DEFAULT_TIMER_COLOR,
  DEFAULT_TIMER_ICON,
  TIMER_COLOR_LABELS,
  TIMER_ICON_LABELS,
  getTimerColorHex,
  getTimerIconName,
} from '../features/timers/timer.customization'

interface TimerFormProps {
  onSubmit: (draft: TimerDraft) => Promise<void>
  onCancel: () => void
}

interface FormState {
  title: string
  type: TimerType
  date: string
  time: string
  timeZone: string
  color: TimerColor
  icon: TimerIcon
}

function getInitialState(): FormState {
  const timeZone = detectTimeZone()
  const now = Temporal.Now.zonedDateTimeISO(timeZone)

  return {
    title: '',
    type: 'counter',
    date: now.toPlainDate().toString(),
    time: now.toPlainTime().toString({ smallestUnit: 'minute' }).slice(0, 5),
    timeZone,
    color: DEFAULT_TIMER_COLOR,
    icon: DEFAULT_TIMER_ICON,
  }
}

function ColorSelector({ value, onChange, disabled }: { value: TimerColor; onChange: (color: TimerColor) => void; disabled?: boolean }) {
  return (
    <fieldset className="border border-white/10 rounded-2xl p-4" disabled={disabled}>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Color de acento</legend>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Seleccionar color de acento">
        {TIMER_COLORS_ORDERED.map((color) => {
          const isSelected = value === color
          const hex = getTimerColorHex(color, false)
          const darkHex = getTimerColorHex(color, true)
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={TIMER_COLOR_LABELS[color]}
              disabled={disabled}
              onClick={() => !disabled && onChange(color)}
              onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onChange(color)
                }
              }}
              className={`relative size-10 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isSelected
                  ? 'ring-2 ring-white scale-110 shadow-lg'
                  : 'hover:scale-105 focus-visible:ring-cyan-300/50'
              }`}
              style={{
                background: `linear-gradient(135deg, ${hex} 0%, ${darkHex} 100%)`,
                boxShadow: isSelected ? `0 0 0 2px ${hex}, 0 0 0 4px ${darkHex}` : undefined,
              }}
            >
              {isSelected && <span className="absolute inset-0 flex items-center justify-center size-5 text-white drop-shadow">✓</span>}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[0.65rem] text-slate-500">
        {TIMER_COLORS_ORDERED.map((color) => (
          <span key={color} className={`${value === color ? 'font-semibold text-white' : ''}`}>{TIMER_COLOR_LABELS[color]}</span>
        ))}
      </div>
    </fieldset>
  )
}

function IconSelector({ value, onChange, disabled }: { value: TimerIcon; onChange: (icon: TimerIcon) => void; disabled?: boolean }) {
  return (
    <fieldset className="border border-white/10 rounded-2xl p-4" disabled={disabled}>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Icono</legend>
      <div className="grid grid-cols-5 gap-3" role="radiogroup" aria-label="Seleccionar icono">
        {TIMER_ICONS_ORDERED.map((icon) => {
          const isSelected = value === icon
          const iconName = getTimerIconName(icon)
          return (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={TIMER_ICON_LABELS[icon]}
              disabled={disabled}
              onClick={() => !disabled && onChange(icon)}
              onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onChange(icon)
                }
              }}
              className={`relative aspect-square rounded-xl border-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isSelected
                  ? 'border-cyan-300 bg-cyan-300/10 scale-105'
                  : 'border-white/10 hover:border-white/30 hover:bg-white/5 focus-visible:border-cyan-300/50'
              }`}
            >
              {icon === 'none' ? (
                <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-medium text-slate-500">Ø</span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center size-6 text-slate-300" data-icon={iconName ?? ''} aria-hidden="true">{iconName}</span>
              )}
              {isSelected && <span className="absolute top-1 right-1 size-4 text-cyan-300">✓</span>}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function TimerForm({ onSubmit, onCancel }: TimerFormProps) {
  const [form, setForm] = useState<FormState>(getInitialState)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    try {
      const instant = localDateTimeToInstant(`${form.date}T${form.time}:00`, form.timeZone)
      const draft: TimerDraft =
        form.type === 'counter'
          ? { type: 'counter', title: form.title, timeZone: form.timeZone, startAt: instant, color: form.color, icon: form.icon }
          : { type: 'countdown', title: form.title, timeZone: form.timeZone, targetAt: instant, color: form.color, icon: form.icon }

      await onSubmit(draft)
      setForm(getInitialState())
    } catch (error) {
      if (error instanceof TimerValidationException) {
        setFormError(error.errors[0]?.message ?? 'Revisa los datos del timer.')
      } else {
        setFormError('No se pudo guardar el timer.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-cyan-300">Nuevo registro</p>
        <h2 className="mt-2 font-serif text-3xl text-white">Capture a moment.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Guarda el instante base. Chronoflow calcula el tiempo en vivo.
        </p>
      </div>

      {formError ? (
        <p className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">
          {formError}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Título</span>
        <input
          required
          maxLength={100}
          name="title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.currentTarget.value })}
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-[#091522] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-200/10"
          placeholder="No tomar café"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</span>
        <select
          name="type"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.currentTarget.value as TimerType })}
          className="min-h-12 w-full appearance-none rounded-2xl border border-white/10 bg-[#091522] px-4 text-white outline-none transition focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-200/10"
        >
          <option value="counter">Counter · tiempo transcurrido</option>
          <option value="countdown">Countdown · tiempo restante</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Fecha</span>
          <input
            required
            type="date"
            name="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.currentTarget.value })}
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-[#091522] px-3 text-sm text-white outline-none focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-200/10"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Hora</span>
          <input
            required
            type="time"
            name="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.currentTarget.value })}
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-[#091522] px-3 text-sm text-white outline-none focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-200/10"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">Zona horaria detectada</p>
        <p className="mt-1 font-mono text-sm text-cyan-100">{form.timeZone}</p>
      </div>

      <ColorSelector value={form.color} onChange={(color) => setForm({ ...form, color })} disabled={isSubmitting} />
      <IconSelector value={form.icon} onChange={(icon) => setForm({ ...form, icon })} disabled={isSubmitting} />

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 flex-1 rounded-full bg-cyan-200 px-5 text-sm font-bold uppercase tracking-wider text-[#07111f] transition hover:bg-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-white"
        >
          {isSubmitting ? 'Guardando...' : 'Crear timer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-full border border-white/10 px-5 text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}