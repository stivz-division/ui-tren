import { describe, expect, it } from 'vitest'
import { formatMoscowDate, getMoscowGreeting, getMoscowWeekday } from './date'

describe('Moscow schedule date', () => {
  it('uses Europe/Moscow when UTC is still the previous day', () => {
    const instant = new Date('2026-09-13T21:30:00.000Z')

    expect(getMoscowWeekday(instant)).toBe(1)
    expect(formatMoscowDate(instant)).toBe('Понедельник, 14 сентября')
  })

  it('chooses the greeting by the hour in Moscow', () => {
    expect(getMoscowGreeting(new Date('2026-09-13T03:00:00Z'))).toBe('Доброе утро')
    expect(getMoscowGreeting(new Date('2026-09-13T10:00:00Z'))).toBe('Добрый день')
    expect(getMoscowGreeting(new Date('2026-09-13T18:00:00Z'))).toBe('Добрый вечер')
    expect(getMoscowGreeting(new Date('2026-09-13T23:00:00Z'))).toBe('Доброй ночи')
  })
})
