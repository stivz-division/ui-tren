import type { Weekday } from '#shared/types/api-tren'

const WEEKDAY_BY_SHORT_NAME: Record<string, Weekday> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

export function getWeekday(date: Date, timeZone: string): Weekday {
  const shortName = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date)

  return WEEKDAY_BY_SHORT_NAME[shortName] ?? 1
}

export function formatDate(date: Date, timeZone: string): string {
  const value = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)

  return value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1)
}

export function getGreeting(date: Date, timeZone: string): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(date))

  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 18) return 'Добрый день'
  if (hour >= 18 && hour < 23) return 'Добрый вечер'
  return 'Доброй ночи'
}

export function formatRelativeDay(daysUntil: number): string {
  if (daysUntil === 1) return 'Завтра'
  if (daysUntil === 2) return 'Послезавтра'
  return `Через ${daysUntil} дн.`
}
