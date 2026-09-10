import { useRef, useState, type FormEvent } from 'react'
import { Temporal } from 'temporal-polyfill'

import { TimerCustomizationFields } from './TimerCustomizationFields'
import { Button } from './ui/Button'
import {
  DEFAULT_TIMER_ACCENT,
  DEFAULT_TIMER_ICON,
} from '../features/timers/timer.customization'
import type {
  TimerAccent,
  TimerDraft,
  TimerIcon,
  TimerType,
  TimerValidationField,
} from '../features/timers/timer.types'
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
  accent: TimerAccent
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
    accent: DEFAULT_TIMER_ACCENT,
    icon: DEFAULT_TIMER_ICON,
  }
}

export function TimerForm({ onSubmit, onCancel }: TimerFormProps) {
  const [form, setForm] = useState<FormState>(getInitialState)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invalidField, setInvalidField] = useState<TimerValidationField | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setInvalidField(null)
    setIsSubmitting(true)

    try {
      const instant = localDateTimeToInstant(`${form.date}T${form.time}:00`, form.timeZone)
      const draft: TimerDraft =
        form.type === 'counter'
          ? {
              type: 'counter',
              title: form.title,
              timeZone: form.timeZone,
              startAt: instant,
              accent: form.accent,
              icon: form.icon,
            }
          : {
              type: 'countdown',
              title: form.title,
              timeZone: form.timeZone,
              targetAt: instant,
              accent: form.accent,
              icon: form.icon,
            }

      await onSubmit(draft)
      setForm(getInitialState())
    } catch (error) {
      if (error instanceof TimerValidationException) {
        setFormError(error.errors[0]?.message ?? 'Revisa los datos del timer.')
        const field = error.errors[0]?.field ?? null
        setInvalidField(field)
        if (field === 'title') titleRef.current?.focus()
        else if (field === 'startAt' || field === 'targetAt') dateRef.current?.focus()
      } else {
        setFormError('No se pudo guardar el timer.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="cf-form" onSubmit={handleSubmit}>
      <div className="cf-dialog-header">
        <div>
          <h2 id="new-timer-title" className="cf-dialog-title">Crear nuevo timer</h2>
          <p className="cf-dialog-description">
            Elige qué quieres medir y su fecha de referencia.
          </p>
        </div>
      </div>

      {formError ? (
        <p id="timer-form-error" className="cf-error" role="alert">
          {formError}
        </p>
      ) : null}

      <label className="cf-label">
        <span>Título</span>
        <input
          ref={titleRef}
          required
          maxLength={100}
          name="title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.currentTarget.value })}
          className="cf-field"
          aria-invalid={invalidField === 'title' || undefined}
          aria-describedby={invalidField === 'title' ? 'timer-form-error' : undefined}
          placeholder="No tomar café"
        />
      </label>

      <label className="cf-label">
        <span>Tipo</span>
        <select
          name="type"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.currentTarget.value as TimerType })}
          className="cf-field"
        >
          <option value="counter">Contador · tiempo transcurrido</option>
          <option value="countdown">Cuenta atrás · tiempo restante</option>
        </select>
      </label>

      <div className="cf-form-columns">
        <label className="cf-label">
          <span>Fecha</span>
          <input
            ref={dateRef}
            required
            type="date"
            name="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.currentTarget.value })}
            className="cf-field"
            aria-invalid={invalidField === 'startAt' || invalidField === 'targetAt' || undefined}
            aria-describedby={invalidField === 'startAt' || invalidField === 'targetAt' ? 'timer-form-error' : undefined}
          />
        </label>
        <label className="cf-label">
          <span>Hora</span>
          <input
            required
            type="time"
            name="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.currentTarget.value })}
            className="cf-field"
            aria-invalid={invalidField === 'startAt' || invalidField === 'targetAt' || undefined}
            aria-describedby={invalidField === 'startAt' || invalidField === 'targetAt' ? 'timer-form-error' : undefined}
          />
        </label>
      </div>

      <div className="cf-form-note">
        <p className="cf-eyebrow">Zona horaria detectada</p>
        <p className="cf-timezone">{form.timeZone}</p>
      </div>

      <section
        aria-labelledby="new-timer-appearance"
        className="cf-appearance"
      >
        <h3 id="new-timer-appearance">Apariencia</h3>
        <TimerCustomizationFields
          value={{ accent: form.accent, icon: form.icon }}
          disabled={isSubmitting}
          onChange={(customization) => setForm({ ...form, ...customization })}
        />
      </section>

      <div className="cf-dialog-actions">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : 'Crear timer'}
        </Button>
      </div>
    </form>
  )
}
