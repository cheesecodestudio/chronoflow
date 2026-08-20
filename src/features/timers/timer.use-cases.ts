import { Temporal } from 'temporal-polyfill'

import type { Timer, TimerDraft, TimerValidationError } from './timer.types'
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
  }

  const timer: Timer =
    draft.type === 'counter'
      ? { ...base, type: 'counter', startAt: draft.startAt }
      : { ...base, type: 'countdown', targetAt: draft.targetAt }

  return repository.create(timer)
}

export function nextPosition(timers: Timer[]): number {
  return timers.reduce((highest, timer) => Math.max(highest, timer.position), -1) + 1
}
