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
      today: programs[0],
      next: { daysUntil: 4, program: programs[1] },
    })
  })

  it('returns rest day and rolls the next workout over the week end', () => {
    expect(buildHomeState(7, programs)).toEqual({
      kind: 'rest',
      next: { daysUntil: 1, program: programs[0] },
    })
  })
})
