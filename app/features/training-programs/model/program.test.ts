import { describe, expect, it } from 'vitest'
import { findNextProgram, formatSetSummary, sortProgramsByWeekday } from './program'

describe('training program presentation', () => {
  it('groups only adjacent equal sets', () => {
    expect(formatSetSummary([
      { position: 1, repetitions: 6, working_weight_kg: 100 },
      { position: 2, repetitions: 6, working_weight_kg: 100 },
      { position: 3, repetitions: 3, working_weight_kg: 140 },
    ])).toBe('2×6 100 кг, 1×3 140 кг')

    expect(formatSetSummary([
      { position: 1, repetitions: 6, working_weight_kg: 100 },
      { position: 2, repetitions: 3, working_weight_kg: 140 },
      { position: 3, repetitions: 6, working_weight_kg: 100 },
    ])).toBe('1×6 100 кг, 1×3 140 кг, 1×6 100 кг')
  })

  it('formats decimal weights with no more than two fraction digits', () => {
    expect(formatSetSummary([
      { position: 1, repetitions: 10, working_weight_kg: 12.5 },
      { position: 2, repetitions: 8, working_weight_kg: 1.25 },
    ])).toBe('1×10 12,5 кг, 1×8 1,25 кг')
  })

  it('finds the next program across the end of the week', () => {
    const next = findNextProgram(7, [
      { id: 1, weekday: 1, name: 'Понедельник', exercises: [] },
      { id: 2, weekday: 5, name: 'Пятница', exercises: [] },
    ])

    expect(next).toEqual({
      daysUntil: 1,
      program: { id: 1, weekday: 1, name: 'Понедельник', exercises: [] },
    })
  })

  it('does not return the current day as a future program', () => {
    expect(findNextProgram(1, [
      { id: 1, weekday: 1, name: 'Сегодня', exercises: [] },
    ])).toBeNull()
  })

  it('sorts a copied list without mutating the API response', () => {
    const programs = [
      { id: 2, weekday: 5 as const, name: 'Пятница', exercises: [] },
      { id: 1, weekday: 1 as const, name: 'Понедельник', exercises: [] },
    ]

    expect(sortProgramsByWeekday(programs).map(program => program.id)).toEqual([1, 2])
    expect(programs.map(program => program.id)).toEqual([2, 1])
  })
})
