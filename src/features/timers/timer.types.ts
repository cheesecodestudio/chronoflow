export type TimerType = 'counter' | 'countdown'

export interface TimerBase {
  id: string
  title: string
  timeZone: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface CounterTimer extends TimerBase {
  type: 'counter'
  startAt: string
}

export interface CountdownTimer extends TimerBase {
  type: 'countdown'
  targetAt: string
}

export type Timer = CounterTimer | CountdownTimer

export type TimerDraft =
  | {
      type: 'counter'
      title: string
      timeZone: string
      startAt: string
    }
  | {
      type: 'countdown'
      title: string
      timeZone: string
      targetAt: string
    }

export interface DurationParts {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export type TimerValidationField = 'title' | 'timeZone' | 'startAt' | 'targetAt'

export type TimerValidationCode =
  | 'title_required'
  | 'title_too_long'
  | 'invalid_time_zone'
  | 'invalid_start_at'
  | 'start_at_in_future'
  | 'invalid_target_at'
  | 'target_at_not_future'

export interface TimerValidationError {
  field: TimerValidationField
  code: TimerValidationCode
  message: string
}
