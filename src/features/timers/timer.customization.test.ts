import { describe, expect, it } from 'vitest'

import {
  DEFAULT_TIMER_ACCENT,
  DEFAULT_TIMER_ICON,
  getEffectiveTimerCustomization,
  isTimerAccent,
  isTimerIcon,
  isValidTimerCustomization,
  TIMER_ACCENTS,
  TIMER_ICONS,
} from './timer.customization'

describe('timer customization', () => {
  it('accepts only the closed accent and icon catalogs', () => {
    expect(TIMER_ACCENTS.every(isTimerAccent)).toBe(true)
    expect(TIMER_ICONS.every(isTimerIcon)).toBe(true)
    expect(isTimerAccent('teal')).toBe(false)
    expect(isTimerIcon('uploaded-image')).toBe(false)
  })

  it('uses independent defaults for absent or unknown values', () => {
    expect(getEffectiveTimerCustomization({})).toEqual({
      accent: DEFAULT_TIMER_ACCENT,
      icon: DEFAULT_TIMER_ICON,
    })
    expect(getEffectiveTimerCustomization({ accent: 'green' })).toEqual({
      accent: 'green',
      icon: DEFAULT_TIMER_ICON,
    })
    expect(getEffectiveTimerCustomization({ icon: 'leaf' })).toEqual({
      accent: DEFAULT_TIMER_ACCENT,
      icon: 'leaf',
    })
    expect(getEffectiveTimerCustomization({
      accent: 'unknown' as never,
      icon: 'unknown' as never,
    })).toEqual({
      accent: DEFAULT_TIMER_ACCENT,
      icon: DEFAULT_TIMER_ICON,
    })
  })

  it('rejects unknown values before persistence', () => {
    expect(isValidTimerCustomization({ accent: 'purple', icon: 'book' })).toBe(true)
    expect(isValidTimerCustomization({ accent: 'unknown' as never })).toBe(false)
    expect(isValidTimerCustomization({ icon: 'unknown' as never })).toBe(false)
  })
})
