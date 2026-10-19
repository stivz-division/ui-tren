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

it('preserves same-day siblings when creating, updating, moving and deleting', () => {
  const evening = { ...monday, id: 2, name: 'Вечер' }
  const created = upsertCachedProgram([monday, friday], evening)
  expect(created).toEqual([monday, evening, friday])
  expect(upsertCachedProgram(created, { ...monday, name: 'Утро' })).toEqual([
    { ...monday, name: 'Утро' }, evening, friday,
  ])
  expect(upsertCachedProgram(created, { ...friday, weekday: 1 })).toEqual([
    monday, evening, { ...friday, weekday: 1 },
  ])
  expect(removeCachedProgram(created, monday.id)).toEqual([evening, friday])
})
