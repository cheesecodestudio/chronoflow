import { Temporal } from 'temporal-polyfill'

import type { Timer, TimerCustomization, TimerDraft, TimerValidationError } from './timer.types'
import {
  DEFAULT_TIMER_ACCENT,
  DEFAULT_TIMER_ICON,
  isValidTimerCustomization,
} from './timer.customization'
import { normalizeTitle, validateTimerDraft } from './timer.utils'
import type { TimerRepository } from './timer.repository'

export class TimerValidationException extends Error {
  public readonly errors: TimerValidationError[]

  constructor(errors: TimerValidationError[]) {
    super('El timer no es válido.')
    this.name = 'TimerValidationException'
    this.errors = errors
  }
}

export interface TimerCreationOptions {
  now?: Temporal.Instant
  createId?: () => string
  canPersist?: () => boolean
}

export async function createTimer(
  repository: TimerRepository,
  draft: TimerDraft,
  options: TimerCreationOptions = {},
): Promise<Timer> {
  const now = options.now ?? Temporal.Now.instant()
  const errors = validateTimerDraft(draft, now)

  if (errors.length > 0) {
    throw new TimerValidationException(errors)
  }

  const timers = await repository.getAll()
  const timestamp = now.toString()
  const base = {
    id: options.createId?.() ?? crypto.randomUUID(),
    title: normalizeTitle(draft.title),
    timeZone: draft.timeZone,
    position: nextPosition(timers),
    createdAt: timestamp,
    updatedAt: timestamp,
    accent: draft.accent ?? DEFAULT_TIMER_ACCENT,
    icon: draft.icon ?? DEFAULT_TIMER_ICON,
  }

  const timer: Timer =
    draft.type === 'counter'
      ? { ...base, type: 'counter', startAt: draft.startAt }
      : { ...base, type: 'countdown', targetAt: draft.targetAt }

  if (options.canPersist?.() === false) {
    throw new Error('El repositorio de timers cambió antes de completar la creación.')
  }

  return repository.create(timer)
}

export async function updateTimerCustomization(
  repository: TimerRepository,
  id: string,
  customization: Required<TimerCustomization>,
): Promise<Timer> {
  if (!isValidTimerCustomization(customization)) {
    throw new Error('La personalización del timer no es válida.')
  }

  return repository.updateCustomization(id, customization)
}

export function nextPosition(timers: Timer[]): number {
  return timers.reduce((highest, timer) => Math.max(highest, timer.position), -1) + 1
}
