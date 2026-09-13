import { describe, expect, it } from 'vitest'
import { formatDate, getGreeting, getWeekday } from './date'

describe('schedule date in the user timezone', () => {
  it('uses the device timezone for the greeting at 20:00 in Thailand', () => {
    const instant = new Date('2026-09-13T13:00:00Z')

    expect(getGreeting(instant, 'Asia/Bangkok')).toBe('Добрый вечер')
    expect(getGreeting(instant, 'Europe/Moscow')).toBe('Добрый день')
  })

  it('uses Monday in Thailand while Moscow is still on Sunday', () => {
    const instant = new Date('2026-09-13T17:30:00Z')

    expect(getWeekday(instant, 'Asia/Bangkok')).toBe(1)
    expect(formatDate(instant, 'Asia/Bangkok')).toBe('Понедельник, 14 сентября')
    expect(getWeekday(instant, 'Europe/Moscow')).toBe(7)
  })

  it('uses Europe/Moscow when UTC is still the previous day', () => {
    const instant = new Date('2026-09-13T21:30:00.000Z')

    expect(getWeekday(instant, 'Europe/Moscow')).toBe(1)
    expect(formatDate(instant, 'Europe/Moscow')).toBe('Понедельник, 14 сентября')
  })

  it('chooses the greeting by the hour in Moscow', () => {
    expect(getGreeting(new Date('2026-09-13T03:00:00Z'), 'Europe/Moscow')).toBe('Доброе утро')
    expect(getGreeting(new Date('2026-09-13T10:00:00Z'), 'Europe/Moscow')).toBe('Добрый день')
    expect(getGreeting(new Date('2026-09-13T18:00:00Z'), 'Europe/Moscow')).toBe('Добрый вечер')
    expect(getGreeting(new Date('2026-09-13T23:00:00Z'), 'Europe/Moscow')).toBe('Доброй ночи')
  })
})
