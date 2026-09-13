import { describe, expect, it } from 'vitest'
import { createSetRows, parseSetRows } from './set-draft'

describe('workout set drafts', () => {
  it('maps decimal commas and strips UI keys before sending', () => {
    expect(parseSetRows([{ key: 'a', repetitions: '12', weight: '42,5' }])).toEqual({ sets: [{ repetitions: 12, working_weight_kg: 42.5 }], errors: {} })
  })
  it('preserves an intentionally empty actual set list while requiring planned sets', () => {
    expect(parseSetRows([]).errors).toEqual({})
    expect(parseSetRows([], 1).errors).toHaveProperty('sets')
  })
  it.each(['', '0', '-1', '2.5', '1e2'])('rejects invalid repetition input %s', (repetitions) => {
    expect(parseSetRows([{ key: 'a', repetitions, weight: '0' }]).errors).toHaveProperty('sets.0.repetitions')
  })
  it.each(['', '-1', '42,', '1.234', '1000000001', 'Infinity'])('retains an invalid weight %s as an editable draft', (weight) => {
    const rows = [{ key: 'a', repetitions: '10', weight }]
    expect(parseSetRows(rows).errors).toHaveProperty('sets.0.working_weight_kg')
    expect(rows[0]?.weight).toBe(weight)
  })
  it('does not mutate the authoritative sets and accepts zero working weight', () => {
    const sets = [{ position: 1, repetitions: 10, working_weight_kg: 0 }]
    const rows = createSetRows(sets)
    rows[0]!.repetitions = '20'
    expect(sets[0]?.repetitions).toBe(10)
    expect(parseSetRows(rows).errors).toEqual({})
  })
})
