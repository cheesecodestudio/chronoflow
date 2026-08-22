import { Temporal } from 'temporal-polyfill'

import type { Timer, TimerColor, TimerIcon } from '../../features/timers/timer.types'
import type { TimerRepository } from '../../features/timers/timer.repository'
import { isValidTimerColor, isValidTimerIcon, normalizeTimerColor, normalizeTimerIcon } from '../../features/timers/timer.customization'

export const TIMER_STORAGE_KEY = 'chronoflow:timers:v2'
export const TIMER_STORAGE_VERSION = 2

interface TimerStorageEnvelope {
  version: typeof TIMER_STORAGE_VERSION
  timers: Timer[]
}

export class LocalStorageTimerRepository implements TimerRepository {
  private readonly storage: Storage
  private readonly now: () => Temporal.Instant

  constructor(
    storage: Storage = getBrowserStorage(),
    now: () => Temporal.Instant = () => Temporal.Now.instant(),
  ) {
    this.storage = storage
    this.now = now
  }

  async getAll(): Promise<Timer[]> {
    return this.readTimers().sort((first, second) => first.position - second.position)
  }

  async getById(id: string): Promise<Timer | null> {
    return (await this.getAll()).find((timer) => timer.id === id) ?? null
  }

  async create(timer: Timer): Promise<Timer> {
    assertValidTimer(timer)

    const timers = await this.getAll()

    if (timers.some((existing) => existing.id === timer.id)) {
      throw new Error(`Ya existe un timer con el id ${timer.id}.`)
    }

    this.writeTimers([...timers, timer])
    return timer
  }

  async delete(id: string): Promise<void> {
    const timers = await this.getAll()
    this.writeTimers(timers.filter((timer) => timer.id !== id))
  }

  async restart(id: string): Promise<Timer> {
    const timer = await this.getById(id)

    if (!timer) {
      throw new Error(`No existe un timer con el id ${id}.`)
    }

    if (timer.type !== 'counter') {
      throw new Error('Solo se pueden reiniciar counters.')
    }

    const timestamp = this.now().toString()
    const restartedTimer: Timer = {
      ...timer,
      startAt: timestamp,
      updatedAt: timestamp,
    }

    await this.delete(id)
    this.writeTimers([...(await this.getAll()), restartedTimer])
    return restartedTimer
  }

  async updateCustomization(id: string, color: TimerColor, icon: TimerIcon): Promise<Timer> {
    const timer = await this.getById(id)

    if (!timer) {
      throw new Error(`No existe un timer con el id ${id}.`)
    }

    const timestamp = this.now().toString()
    const updatedTimer: Timer = {
      ...timer,
      color,
      icon,
      updatedAt: timestamp,
    }

    await this.delete(id)
    this.writeTimers([...(await this.getAll()), updatedTimer])
    return updatedTimer
  }

  private readTimers(): Timer[] {
    const raw = this.storage.getItem(TIMER_STORAGE_KEY)

    if (!raw) {
      return []
    }

    try {
      const parsed: unknown = JSON.parse(raw)

      if (!isStorageEnvelope(parsed)) {
        return []
      }

      return parsed.timers
        .map(migrateTimer)
        .filter(isTimer)
    } catch {
      return []
    }
  }

  private writeTimers(timers: Timer[]): void {
    const envelope: TimerStorageEnvelope = {
      version: TIMER_STORAGE_VERSION,
      timers,
    }

    this.storage.setItem(TIMER_STORAGE_KEY, JSON.stringify(envelope))
  }
}

function getBrowserStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Se debe proporcionar un storage fuera del navegador.')
  }

  return window.localStorage
}

function isStorageEnvelope(value: unknown): value is TimerStorageEnvelope {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return candidate.version === TIMER_STORAGE_VERSION && Array.isArray(candidate.timers)
}

function migrateTimer(value: unknown): Timer | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.timeZone !== 'string' ||
    typeof candidate.position !== 'number' ||
    !Number.isFinite(candidate.position) ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return null
  }

  if (!isInstant(candidate.createdAt) || !isInstant(candidate.updatedAt) || !isTimeZone(candidate.timeZone)) {
    return null
  }

  const color = normalizeTimerColor(candidate.color)
  const icon = normalizeTimerIcon(candidate.icon)

  if (candidate.type === 'counter') {
    if (typeof candidate.startAt !== 'string' || !isInstant(candidate.startAt)) {
      return null
    }
    return {
      id: candidate.id,
      title: candidate.title,
      timeZone: candidate.timeZone,
      position: candidate.position,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      type: 'counter',
      startAt: candidate.startAt,
      color,
      icon,
    }
  }

  if (candidate.type === 'countdown') {
    if (typeof candidate.targetAt !== 'string' || !isInstant(candidate.targetAt)) {
      return null
    }
    return {
      id: candidate.id,
      title: candidate.title,
      timeZone: candidate.timeZone,
      position: candidate.position,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      type: 'countdown',
      targetAt: candidate.targetAt,
      color,
      icon,
    }
  }

  return null
}

function isTimer(value: unknown): value is Timer {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.timeZone !== 'string' ||
    typeof candidate.position !== 'number' ||
    !Number.isFinite(candidate.position) ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return false
  }

  if (!isInstant(candidate.createdAt) || !isInstant(candidate.updatedAt) || !isTimeZone(candidate.timeZone)) {
    return false
  }

  // color e icon son opcionales; si vienen, deben ser válidos
  if (candidate.color !== undefined && !isValidTimerColor(candidate.color)) {
    return false
  }
  if (candidate.icon !== undefined && !isValidTimerIcon(candidate.icon)) {
    return false
  }

  if (candidate.type === 'counter') {
    return typeof candidate.startAt === 'string' && isInstant(candidate.startAt)
  }

  if (candidate.type === 'countdown') {
    return typeof candidate.targetAt === 'string' && isInstant(candidate.targetAt)
  }

  return false
}

function assertValidTimer(timer: Timer): void {
  if (!isTimer(timer)) {
    throw new Error('El timer no tiene un formato válido.')
  }
}

function isInstant(value: string): boolean {
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

export class InvalidTimerStorageError extends Error {
  constructor() {
    super('El almacenamiento de timers no es válido.')
    this.name = 'InvalidTimerStorageError'
  }
}