import { Temporal } from 'temporal-polyfill'

import {
  isTimerAccent,
  isTimerIcon,
} from '../../features/timers/timer.customization'
import type { Timer, TimerAccent, TimerIcon } from '../../features/timers/timer.types'
import type { TimerInsert, TimerRow } from './database.types'

type ValidTimerRow = Omit<TimerRow, 'accent' | 'icon' | 'start_at' | 'target_at' | 'type'> & {
  accent: TimerAccent | null
  icon: TimerIcon | null
} & (
  | { type: 'counter'; start_at: string; target_at: null }
  | { type: 'countdown'; start_at: null; target_at: string }
)

export class InvalidSupabaseTimerRowError extends Error {
  constructor() {
    super('La fila remota del timer no tiene un formato válido.')
    this.name = 'InvalidSupabaseTimerRowError'
  }
}

export function timerFromRow(value: unknown): Timer {
  if (!isTimerRow(value)) throw new InvalidSupabaseTimerRowError()

  const common = {
    id: value.id,
    title: value.title,
    timeZone: value.time_zone,
    position: value.position,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    ...(value.accent === null ? {} : { accent: value.accent }),
    ...(value.icon === null ? {} : { icon: value.icon }),
  }

  return value.type === 'counter'
    ? { ...common, type: 'counter', startAt: value.start_at }
    : { ...common, type: 'countdown', targetAt: value.target_at }
}

export function timerToInsert(timer: Timer, userId: string): TimerInsert {
  assertValidDomainTimer(timer)

  const common = {
    id: timer.id,
    user_id: userId,
    title: timer.title,
    type: timer.type,
    time_zone: timer.timeZone,
    position: timer.position,
    accent: timer.accent ?? null,
    icon: timer.icon ?? null,
    created_at: timer.createdAt,
    updated_at: timer.updatedAt,
  }

  return timer.type === 'counter'
    ? { ...common, start_at: timer.startAt, target_at: null }
    : { ...common, start_at: null, target_at: timer.targetAt }
}

function isTimerRow(value: unknown): value is ValidTimerRow {
  if (!value || typeof value !== 'object') return false

  const row = value as Record<string, unknown>
  const hasValidCommonFields =
    typeof row.id === 'string' &&
    typeof row.user_id === 'string' &&
    isValidTitle(row.title) &&
    typeof row.time_zone === 'string' &&
    isTimeZone(row.time_zone) &&
    isValidPosition(row.position) &&
    typeof row.created_at === 'string' &&
    isInstant(row.created_at) &&
    typeof row.updated_at === 'string' &&
    isInstant(row.updated_at) &&
    (row.accent === null || isTimerAccent(row.accent)) &&
    (row.icon === null || isTimerIcon(row.icon))

  if (!hasValidCommonFields) return false

  if (row.type === 'counter') {
    return typeof row.start_at === 'string' && isInstant(row.start_at) && row.target_at === null
  }

  if (row.type === 'countdown') {
    return typeof row.target_at === 'string' && isInstant(row.target_at) && row.start_at === null
  }

  return false
}

function assertValidDomainTimer(timer: Timer): void {
  const hasValidCommonFields =
    typeof timer.id === 'string' &&
    isValidTitle(timer.title) &&
    typeof timer.timeZone === 'string' &&
    isTimeZone(timer.timeZone) &&
    isValidPosition(timer.position) &&
    isInstant(timer.createdAt) &&
    isInstant(timer.updatedAt) &&
    (timer.accent === undefined || isTimerAccent(timer.accent)) &&
    (timer.icon === undefined || isTimerIcon(timer.icon))

  const hasValidTypeFields = timer.type === 'counter'
    ? isInstant(timer.startAt)
    : timer.type === 'countdown' && isInstant(timer.targetAt)

  if (!hasValidCommonFields || !hasValidTypeFields) {
    throw new Error('El timer no tiene un formato válido.')
  }
}

function isValidTitle(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 100
}

function isValidPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false

  try {
    Temporal.Instant.from(value)
    return true
  } catch {
    return false
  }
}

function isTimeZone(value: string): boolean {
  try {
    Temporal.Now.instant().toZonedDateTimeISO(value)
    return true
  } catch {
    return false
  }
}
