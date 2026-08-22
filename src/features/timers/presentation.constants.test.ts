import { describe, expect, it } from 'vitest'

import { FADE_DURATION_MS, SLIDE_DURATION_MS } from './presentation.constants'

describe('presentation constants', () => {
  it('defines FADE_DURATION_MS as 280 ms', () => {
    expect(FADE_DURATION_MS).toBe(280)
  })

  it('defines SLIDE_DURATION_MS as 5000 ms', () => {
    expect(SLIDE_DURATION_MS).toBe(5000)
  })
})