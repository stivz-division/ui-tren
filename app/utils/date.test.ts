import { describe, expect, it } from 'vitest'
import { formatMoscowDate, getMoscowWeekday } from './date'

describe('Moscow schedule date', () => {
  it('uses Europe/Moscow when UTC is still the previous day', () => {
    const instant = new Date('2026-09-13T21:30:00.000Z')

    expect(getMoscowWeekday(instant)).toBe(1)
    expect(formatMoscowDate(instant)).toBe('Понедельник, 14 сентября')
  })
})
