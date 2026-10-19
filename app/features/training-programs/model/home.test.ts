import { describe, expect, it } from 'vitest'
import { buildHomeState } from './home'

const programs = [
  { id: 1, weekday: 1 as const, name: 'Грудь', exercises: [] },
  { id: 5, weekday: 5 as const, name: 'Ноги', exercises: [] },
]

describe('home state', () => {
  it('returns today workout and the nearest later program', () => {
    expect(buildHomeState(1, programs)).toEqual({
      kind: 'workout',
      today: [programs[0]],
      next: { daysUntil: 4, programs: [programs[1]] },
    })
  })

  it('returns rest day and rolls the next workout over the week end', () => {
    expect(buildHomeState(7, programs)).toEqual({
      kind: 'rest',
      next: { daysUntil: 1, programs: [programs[0]] },
    })
  })
})

it('keeps every program for today and the nearest future day', () => {
  const secondToday = { ...programs[0]!, id: 2, name: 'Вечер' }
  const secondFriday = { ...programs[1]!, id: 6, name: 'Растяжка' }
  expect(buildHomeState(1, [...programs, secondToday, secondFriday])).toEqual({
    kind: 'workout',
    today: [programs[0], secondToday],
    next: { daysUntil: 4, programs: [programs[1], secondFriday] },
  })
})

it('returns all nearest programs on a rest day and handles an empty schedule', () => {
  const secondMonday = { ...programs[0]!, id: 2, name: 'Вечер' }
  expect(buildHomeState(7, [...programs, secondMonday])).toEqual({
    kind: 'rest', next: { daysUntil: 1, programs: [programs[0], secondMonday] },
  })
  expect(buildHomeState(7, [])).toEqual({ kind: 'rest', next: null })
})
