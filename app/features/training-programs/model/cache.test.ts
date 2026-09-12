import { describe, expect, it } from 'vitest'
import { removeCachedProgram, upsertCachedProgram } from './cache'

const monday = { id: 1, weekday: 1 as const, name: 'Пн', exercises: [] }
const friday = { id: 5, weekday: 5 as const, name: 'Пт', exercises: [] }

describe('program cache updates', () => {
  it('inserts and replaces authoritative programs in weekday order', () => {
    expect(upsertCachedProgram([friday], monday).map(item => item.id)).toEqual([1, 5])
    expect(upsertCachedProgram([monday, friday], { ...monday, name: 'Новая' })).toEqual([
      { ...monday, name: 'Новая' },
      friday,
    ])
  })

  it('removes only the confirmed deleted program', () => {
    expect(removeCachedProgram([monday, friday], 1)).toEqual([friday])
  })
})
