import { Temporal } from 'temporal-polyfill'

import type {
  DurationParts,
  Timer,
  TimerDraft,
  TimerValidationError,
  TimerValidationField,
  TimerValidationCode,
} from './timer.types'

export const MAX_TITLE_LENGTH = 100

const DURATION_UNITS: Array<keyof DurationParts> = [
  'years',
  'months',
  'days',
  'hours',
  'minutes',
  'seconds',
]

const DURATION_LABELS: Record<keyof DurationParts, [string, string]> = {
  years: ['año', 'años'],
  months: ['mes', 'meses'],
  days: ['día', 'días'],
  hours: ['hora', 'horas'],
  minutes: ['minuto', 'minutos'],
  seconds: ['segundo', 'segundos'],
}

export function normalizeTitle(title: string): string {
  return title.trim()
}

export function detectTimeZone(): string {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone

  if (!detected) {
    return 'UTC'
  }

  try {
    Temporal.Now.instant().toZonedDateTimeISO(detected)
    return detected
  } catch {
    return 'UTC'
  }
}

export function localDateTimeToInstant(
  localDateTime: string,
  timeZone: string,
): string {
  return Temporal.PlainDateTime.from(localDateTime)
    .toZonedDateTime(timeZone, { disambiguation: 'compatible' })
    .toInstant()
    .toString()
}

export function calculateElapsed(
  timer: Extract<Timer, { type: 'counter' }>,
  now: Temporal.Instant = Temporal.Now.instant(),
): Temporal.Duration {
  const start = Temporal.Instant.from(timer.startAt)

  if (Temporal.Instant.compare(now, start) <= 0) {
    return Temporal.Duration.from({ seconds: 0 })
  }

  return start
    .toZonedDateTimeISO(timer.timeZone)
    .until(now.toZonedDateTimeISO(timer.timeZone), {
      largestUnit: 'years',
      smallestUnit: 'seconds',
    })
}

export function calculateRemaining(
  timer: Extract<Timer, { type: 'countdown' }>,
  now: Temporal.Instant = Temporal.Now.instant(),
): Temporal.Duration {
  const target = Temporal.Instant.from(timer.targetAt)

  if (Temporal.Instant.compare(target, now) <= 0) {
    return Temporal.Duration.from({ seconds: 0 })
  }

  return now
    .toZonedDateTimeISO(timer.timeZone)
    .until(target.toZonedDateTimeISO(timer.timeZone), {
      largestUnit: 'years',
      smallestUnit: 'seconds',
    })
}

export function formatDuration(duration: Temporal.Duration): string {
  const parts = DURATION_UNITS.flatMap((unit) => {
    const value = Math.trunc(duration[unit])

    if (value === 0) {
      return []
    }

    const [singular, plural] = DURATION_LABELS[unit]
    return [`${value} ${Math.abs(value) === 1 ? singular : plural}`]
  })

  return parts.length > 0 ? parts.join(' ') : '0 segundos'
}

export function formatDurationManage(duration: Temporal.Duration): string {
  const units = [
    { unit: 'years' as const, label: 'A' },
    { unit: 'months' as const, label: 'M' },
    { unit: 'days' as const, label: 'D' },
    { unit: 'hours' as const, label: 'H' },
    { unit: 'minutes' as const, label: 'MIN' },
    { unit: 'seconds' as const, label: 'SEG' },
  ]

  const parts = units
    .map(({ unit, label }) => {
      const value = Math.trunc(duration[unit])

      if (unit === 'minutes' || unit === 'seconds') {
        return `${value}${label}`
      }

      if (value === 0) {
        return null
      }

      return `${value}${label}`
    })
    .filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(':') : '0MIN:0SEG'
}

export interface DurationPresentBlock {
  label: string
  value: number
  visible: boolean
}

export interface DurationPresentData {
  block1: DurationPresentBlock[]
  block2: DurationPresentBlock[]
}

export function formatDurationPresent(duration: Temporal.Duration): DurationPresentData {
  const block1Units: Array<{ unit: keyof DurationParts; label: string }> = [
    { unit: 'years', label: 'AÑOS' },
    { unit: 'months', label: 'MESES' },
    { unit: 'days', label: 'DÍAS' },
  ]

  const block2Units: Array<{ unit: keyof DurationParts; label: string }> = [
    { unit: 'hours', label: 'HORAS' },
    { unit: 'minutes', label: 'MINUTOS' },
    { unit: 'seconds', label: 'SEGUNDOS' },
  ]

  const block1 = block1Units.map(({ unit, label }) => ({
    label,
    value: Math.trunc(duration[unit]),
    visible: Math.trunc(duration[unit]) > 0,
  }))

  const block2 = block2Units.map(({ unit, label }) => ({
    label,
    value: Math.trunc(duration[unit]),
    visible: true,
  }))

  return { block1, block2 }
}

export function isCountdownCompleted(
  timer: Extract<Timer, { type: 'countdown' }>,
  now: Temporal.Instant = Temporal.Now.instant(),
): boolean {
  return Temporal.Instant.compare(Temporal.Instant.from(timer.targetAt), now) <= 0
}

export function validateTimerDraft(
  draft: TimerDraft,
  now: Temporal.Instant = Temporal.Now.instant(),
): TimerValidationError[] {
  const errors: TimerValidationError[] = []
  const title = normalizeTitle(draft.title)

  if (title.length === 0) {
    errors.push(validationError('title', 'title_required', 'El título es obligatorio.'))
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.push(
      validationError(
        'title',
        'title_too_long',
        `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`,
      ),
    )
  }

  if (!isValidTimeZone(draft.timeZone)) {
    errors.push(
      validationError('timeZone', 'invalid_time_zone', 'La zona horaria no es válida.'),
    )
  }

  if (draft.type === 'counter') {
    const start = parseInstant(draft.startAt)

    if (!start) {
      errors.push(
        validationError('startAt', 'invalid_start_at', 'La fecha inicial no es válida.'),
      )
    } else if (Temporal.Instant.compare(start, now) > 0) {
      errors.push(
        validationError(
          'startAt',
          'start_at_in_future',
          'La fecha inicial no puede estar en el futuro.',
        ),
      )
    }
  } else {
    const target = parseInstant(draft.targetAt)

    if (!target) {
      errors.push(
        validationError('targetAt', 'invalid_target_at', 'La fecha objetivo no es válida.'),
      )
    } else if (Temporal.Instant.compare(target, now) <= 0) {
      errors.push(
        validationError(
          'targetAt',
          'target_at_not_future',
          'La fecha objetivo debe estar en el futuro.',
        ),
      )
    }
  }

  return errors
}

function parseInstant(value: string): Temporal.Instant | null {
  try {
    return Temporal.Instant.from(value)
  } catch {
    return null
  }
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    Temporal.Now.instant().toZonedDateTimeISO(timeZone)
    return true
  } catch {
    return false
  }
}

function validationError(
  field: TimerValidationField,
  code: TimerValidationCode,
  message: string,
): TimerValidationError {
  return { field, code, message }
}
