import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'

import {
  calculateElapsed,
  calculateRemaining,
  formatDuration,
  formatDurationManage,
  formatDurationManageParts,
  formatDurationPresent,
  isCountdownCompleted,
  localDateTimeToInstant,
  validateTimerDraft,
} from './timer.utils'

import type { CounterTimer, CountdownTimer } from './timer.types'

const NOW = Temporal.Instant.from('2024-01-01T00:00:00Z')

function counter(startAt: string, timeZone = 'UTC'): CounterTimer {
  return {
    id: 'counter-1',
    title: 'Counter',
    type: 'counter',
    timeZone,
    startAt,
    position: 0,
    createdAt: NOW.toString(),
    updatedAt: NOW.toString(),
  }
}

function countdown(targetAt: string, timeZone = 'UTC'): CountdownTimer {
  return {
    id: 'countdown-1',
    title: 'Countdown',
    type: 'countdown',
    timeZone,
    targetAt,
    position: 0,
    createdAt: NOW.toString(),
    updatedAt: NOW.toString(),
  }
}

describe('timer duration utilities', () => {
  it('calculates basic elapsed values', () => {
    expect(formatDuration(calculateElapsed(counter('2023-12-31T23:59:59Z'), NOW))).toBe(
      '1 segundo',
    )
    expect(formatDuration(calculateElapsed(counter('2023-12-31T23:00:00Z'), NOW))).toBe(
      '1 hora',
    )
    expect(formatDuration(calculateElapsed(counter('2023-12-30T00:00:00Z'), NOW))).toBe(
      '2 días',
    )
  })

  it('uses calendar months and years instead of fixed day counts', () => {
    const start = Temporal.ZonedDateTime.from('2023-01-01T00:00:00-05:00[America/New_York]')
    const now = Temporal.ZonedDateTime.from('2024-01-01T00:00:00-05:00[America/New_York]')

    expect(formatDuration(calculateElapsed(counter(start.toInstant().toString(), 'America/New_York'), now.toInstant()))).toBe(
      '1 año',
    )
    expect(
      formatDuration(
        calculateElapsed(counter('2024-01-01T00:00:00Z'), Temporal.Instant.from('2024-02-01T00:00:00Z')),
      ),
    ).toBe('1 mes')
  })

  it('handles UTC and America/Costa_Rica calendar boundaries', () => {
    expect(
      formatDuration(
        calculateElapsed(
          counter('2023-12-31T06:00:00Z', 'America/Costa_Rica'),
          Temporal.Instant.from('2024-01-01T06:00:00Z'),
        ),
      ),
    ).toBe('1 día')
    expect(
      formatDuration(
        calculateElapsed(counter('2023-12-31T00:00:00Z'), Temporal.Instant.from('2024-01-01T00:00:00Z')),
      ),
    ).toBe('1 día')
  })

  it('returns zero for a counter that starts in the future', () => {
    expect(formatDuration(calculateElapsed(counter('2024-01-01T00:00:01Z'), NOW))).toBe(
      '0 segundos',
    )
  })

  it('calculates countdown values and never returns negatives', () => {
    expect(formatDuration(calculateRemaining(countdown('2024-01-01T00:00:01Z'), NOW))).toBe(
      '1 segundo',
    )
    expect(formatDuration(calculateRemaining(countdown('2023-12-31T23:59:59Z'), NOW))).toBe(
      '0 segundos',
    )
    expect(isCountdownCompleted(countdown('2024-01-01T00:00:00Z'), NOW)).toBe(true)
    expect(isCountdownCompleted(countdown('2024-01-01T00:00:01Z'), NOW)).toBe(false)
  })

  it('respects the timezone during DST transitions', () => {
    const beforeSpringTransition = Temporal.ZonedDateTime.from(
      '2024-03-10T00:00:00-05:00[America/New_York]',
    )
    const afterSpringTransition = Temporal.ZonedDateTime.from(
      '2024-03-11T00:00:00-04:00[America/New_York]',
    )

    expect(
      formatDuration(
        calculateElapsed(
          counter(beforeSpringTransition.toInstant().toString(), 'America/New_York'),
          afterSpringTransition.toInstant(),
        ),
      ),
    ).toBe('1 día')
  })

  it('uses compatible disambiguation for nonexistent and repeated local times', () => {
    expect(localDateTimeToInstant('2024-03-10T02:30:00', 'America/New_York')).toBe(
      '2024-03-10T07:30:00Z',
    )
    expect(localDateTimeToInstant('2024-11-03T01:30:00', 'America/New_York')).toBe(
      '2024-11-03T05:30:00Z',
    )
  })
})

describe('timer draft validation', () => {
  it('accepts a valid counter and normalizes the title separately', () => {
    expect(
      validateTimerDraft(
        {
          type: 'counter',
          title: '  No café  ',
          timeZone: 'America/Costa_Rica',
          startAt: '2023-12-31T23:00:00Z',
        },
        NOW,
      ),
    ).toEqual([])
  })

  it('rejects invalid titles and future counters', () => {
    const errors = validateTimerDraft(
      {
        type: 'counter',
        title: 'x'.repeat(101),
        timeZone: 'UTC',
        startAt: '2024-01-01T00:00:01Z',
      },
      NOW,
    )

    expect(errors.map((error) => error.code)).toEqual([
      'title_too_long',
      'start_at_in_future',
    ])
  })

  it('rejects an empty title after trimming', () => {
    const errors = validateTimerDraft(
      {
        type: 'counter',
        title: '   ',
        timeZone: 'UTC',
        startAt: '2023-12-31T23:00:00Z',
      },
      NOW,
    )

    expect(errors.map((error) => error.code)).toEqual(['title_required'])
  })

  it('rejects a countdown that is not in the future', () => {
    const errors = validateTimerDraft(
      {
        type: 'countdown',
        title: 'Trip',
        timeZone: 'UTC',
        targetAt: NOW.toString(),
      },
      NOW,
    )

    expect(errors).toEqual([
      {
        field: 'targetAt',
        code: 'target_at_not_future',
        message: 'La fecha objetivo debe estar en el futuro.',
      },
    ])
  })

  it('rejects invalid dates and timezones', () => {
    const errors = validateTimerDraft(
      {
        type: 'countdown',
        title: 'Trip',
        timeZone: 'Not/AZone',
        targetAt: 'not-an-instant',
      },
      NOW,
    )

    expect(errors.map((error) => error.code)).toEqual([
      'invalid_time_zone',
      'invalid_target_at',
    ])
  })
})

describe('formatDurationManage', () => {
  it('formats all units when all have values', () => {
    const duration = Temporal.Duration.from({ years: 1, months: 2, days: 3, hours: 4, minutes: 5, seconds: 6 })
    expect(formatDurationManage(duration)).toBe('1A:2M:3D:4H:5MIN:6SEG')
  })

  it('omits years and months when zero', () => {
    const duration = Temporal.Duration.from({ years: 0, months: 0, days: 3, hours: 4, minutes: 5, seconds: 6 })
    expect(formatDurationManage(duration)).toBe('3D:4H:5MIN:6SEG')
  })

  it('omits days and hours when zero', () => {
    const duration = Temporal.Duration.from({ years: 1, months: 2, days: 0, hours: 0, minutes: 5, seconds: 6 })
    expect(formatDurationManage(duration)).toBe('1A:2M:5MIN:6SEG')
  })

  it('always shows minutes and seconds even when zero', () => {
    const duration = Temporal.Duration.from({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
    expect(formatDurationManage(duration)).toBe('0MIN:0SEG')
  })

  it('handles single unit values', () => {
    const duration = Temporal.Duration.from({ years: 1, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
    expect(formatDurationManage(duration)).toBe('1A:0MIN:0SEG')
  })
})

describe('formatDurationManageParts', () => {
  it('returns all units with correct visibility when all have values', () => {
    const duration = Temporal.Duration.from({ years: 1, months: 2, days: 3, hours: 4, minutes: 5, seconds: 6 })
    const result = formatDurationManageParts(duration)

    expect(result).toHaveLength(6)
    expect(result[0]).toEqual({ value: 1, label: 'A', visible: true })
    expect(result[1]).toEqual({ value: 2, label: 'M', visible: true })
    expect(result[2]).toEqual({ value: 3, label: 'D', visible: true })
    expect(result[3]).toEqual({ value: 4, label: 'H', visible: true })
    expect(result[4]).toEqual({ value: 5, label: 'MIN', visible: true })
    expect(result[5]).toEqual({ value: 6, label: 'SEG', visible: true })
  })

  it('hides years, months, days, hours when zero', () => {
    const duration = Temporal.Duration.from({ years: 0, months: 0, days: 0, hours: 0, minutes: 5, seconds: 6 })
    const result = formatDurationManageParts(duration)

    expect(result[0].visible).toBe(false)
    expect(result[1].visible).toBe(false)
    expect(result[2].visible).toBe(false)
    expect(result[3].visible).toBe(false)
    expect(result[4].visible).toBe(true)
    expect(result[5].visible).toBe(true)
  })

  it('always shows minutes and seconds as visible', () => {
    const duration = Temporal.Duration.from({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
    const result = formatDurationManageParts(duration)

    expect(result[4].visible).toBe(true)
    expect(result[5].visible).toBe(true)
    expect(result[4].value).toBe(0)
    expect(result[5].value).toBe(0)
  })

  it('shows partial units correctly', () => {
    const duration = Temporal.Duration.from({ years: 1, months: 0, days: 3, hours: 0, minutes: 5, seconds: 0 })
    const result = formatDurationManageParts(duration)

    expect(result[0]).toEqual({ value: 1, label: 'A', visible: true })
    expect(result[1]).toEqual({ value: 0, label: 'M', visible: false })
    expect(result[2]).toEqual({ value: 3, label: 'D', visible: true })
    expect(result[3]).toEqual({ value: 0, label: 'H', visible: false })
    expect(result[4]).toEqual({ value: 5, label: 'MIN', visible: true })
    expect(result[5]).toEqual({ value: 0, label: 'SEG', visible: true })
  })
})

describe('formatDurationPresent', () => {
  it('returns two blocks with correct units', () => {
    const duration = Temporal.Duration.from({ years: 1, months: 2, days: 3, hours: 4, minutes: 5, seconds: 6 })
    const result = formatDurationPresent(duration)

    expect(result.block1).toHaveLength(3)
    expect(result.block1[0]).toEqual({ label: 'AÑOS', value: 1, visible: true })
    expect(result.block1[1]).toEqual({ label: 'MESES', value: 2, visible: true })
    expect(result.block1[2]).toEqual({ label: 'DÍAS', value: 3, visible: true })

    expect(result.block2).toHaveLength(3)
    expect(result.block2[0]).toEqual({ label: 'HORAS', value: 4, visible: true })
    expect(result.block2[1]).toEqual({ label: 'MINUTOS', value: 5, visible: true })
    expect(result.block2[1]).toEqual({ label: 'MINUTOS', value: 5, visible: true })
    expect(result.block2[2]).toEqual({ label: 'SEGUNDOS', value: 6, visible: true })
  })

  it('hides block1 units when value is zero', () => {
    const duration = Temporal.Duration.from({ years: 0, months: 2, days: 0, hours: 4, minutes: 5, seconds: 6 })
    const result = formatDurationPresent(duration)

    expect(result.block1[0].visible).toBe(false)
    expect(result.block1[1].visible).toBe(true)
    expect(result.block1[2].visible).toBe(false)
  })

  it('always shows block2 units as visible', () => {
    const duration = Temporal.Duration.from({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
    const result = formatDurationPresent(duration)

    expect(result.block2[0].visible).toBe(true)
    expect(result.block2[1].visible).toBe(true)
    expect(result.block2[2].visible).toBe(true)
    expect(result.block2[0].value).toBe(0)
    expect(result.block2[1].value).toBe(0)
    expect(result.block2[2].value).toBe(0)
  })
})
