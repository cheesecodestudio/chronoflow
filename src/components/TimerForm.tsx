import { useState, type FormEvent } from 'react'
import { Temporal } from 'temporal-polyfill'

import type { TimerDraft, TimerType } from '../features/timers/timer.types'
import { detectTimeZone, localDateTimeToInstant } from '../features/timers/timer.utils'
import { TimerValidationException } from '../features/timers/timer.use-cases'

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
  }
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
          ? { type: 'counter', title: form.title, timeZone: form.timeZone, startAt: instant }
          : { type: 'countdown', title: form.title, timeZone: form.timeZone, targetAt: instant }

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
