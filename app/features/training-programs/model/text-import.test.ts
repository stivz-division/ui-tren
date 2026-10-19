import { describe, expect, it } from 'vitest'
import type { Exercise } from '#shared/types/api-tren'
import { buildImportedExercises, findExerciseMatches, parseExerciseText } from './text-import'

const names = [
  'Жим в Хаммере на низ груди',
  'Тяга Т-грифа',
  'Разгибание ног',
  'Протяжка с нижнего блока',
  'Разгибания с верхнего кроссовера на трицепс с прямой рукояткой',
  'Подъём гантелей на бицепс сидя',
]
const catalog: Exercise[] = names.map((name, index) => ({ id: index + 1, name, code: `exercise_${index}`, description: null, video_url: null }))
const example = names.map((name, index) => `${index + 1}. ${name} — ${index < 4 ? 3 : 2} × ${index === 2 || index === 3 ? 10 : 8} — 10 кг`).join('\n')

describe('exercise text import', () => {
  it('turns the six-line example into ordered exercises with sixteen independent sets', () => {
    const parsed = parseExerciseText(example, catalog)
    expect(parsed.error).toBeUndefined()
    expect(parsed.rows).toHaveLength(6)
    const result = buildImportedExercises(parsed.rows, catalog, [])
    expect(result.errors).toEqual({})
    expect(result.exercises.map(item => item.exerciseId)).toEqual([1, 2, 3, 4, 5, 6])
    expect(result.exercises.map(item => item.sets.length)).toEqual([3, 3, 3, 3, 2, 2])
    const sets = result.exercises.flatMap(item => item.sets)
    expect(sets).toHaveLength(16)
    expect(new Set(sets.map(set => set.key)).size).toBe(16)
    expect(result.exercises[0]?.sets.map(({ repetitions, workingWeightKg }) => ({ repetitions, workingWeightKg }))).toEqual(Array.from({ length: 3 }, () => ({ repetitions: '8', workingWeightKg: '10' })))
    expect(result.exercises[2]?.sets[0]?.repetitions).toBe('10')
    sets[0]!.repetitions = '12'
    expect(sets[1]?.repetitions).toBe('8')
  })

  it.each(['×', 'x', 'х', 'X', 'Х'])('accepts multiplication %s, decimal commas and optional numbering', (symbol) => {
    const result = parseExerciseText(`\n  2)   ПОДЪЕМ   гантелей на бицепс сидя – 2 ${symbol} 8 - 10,25 кг\r\n\n`, catalog)
    expect(result.rows).toMatchObject([{ line: 2, exerciseId: 6, setCount: 2, repetitions: '8', workingWeightKg: '10.25' }])
    expect(buildImportedExercises(result.rows, catalog, []).errors).toEqual({})
  })

  it('keeps unknown and malformed lines visible, including original line numbers', () => {
    const result = parseExerciseText('Неизвестное — 3 × 8 — 0 кг\n\nТяга Т-грифа — 3 × 8\nТяга Т-грифа — 2 × 8 — 5 кг', catalog)
    expect(result.rows).toHaveLength(3)
    expect(result.rows[0]?.exerciseId).toBeNull()
    expect(result.rows[1]).toMatchObject({ line: 3, error: expect.any(String) })
    expect(result.rows[2]?.exerciseId).toBe(2)
    const built = buildImportedExercises(result.rows, catalog, [])
    expect(Object.keys(built.errors)).toEqual(['1', '3'])
    expect(built.exercises).toEqual([])
  })

  it.each(['0 × 8 — 10', '101 × 8 — 10', '3 × 0 — 10', '3 × 8 — -10', '3 × 8 — 10.123', '3 × 8 — 1000000001', '3 × 9007199254740992 — 10', '3 × 8–12 — 10'])('rejects invalid prescription %s without allocating sets', (prescription) => {
    const parsed = parseExerciseText(`Тяга Т-грифа — ${prescription} кг`, catalog)
    expect(parsed.rows[0]?.error).toBeTruthy()
    expect(buildImportedExercises(parsed.rows, catalog, []).exercises).toEqual([])
  })

  it('requires manual choice for similar or ambiguous names and ranks useful suggestions first', () => {
    const matches = findExerciseMatches('Тяга Т грифа', catalog)
    expect(matches.exactId).toBeNull()
    expect(matches.suggestions[0]?.id).toBe(2)
    const ambiguous = findExerciseMatches('Разгибание ног', [...catalog, { ...catalog[2]!, id: 30 }])
    expect(ambiguous.exactId).toBeNull()
    expect(ambiguous.suggestions.map(item => item.id)).toEqual(expect.arrayContaining([3, 30]))
  })

  it('accepts a manual catalog choice and detects duplicates inside the import and existing draft', () => {
    const { rows } = parseExerciseText('Тяга — 1 × 8 — 0 кг\nТяга Т-грифа — 2 × 10 — 12.5 кг', catalog)
    rows[0]!.exerciseId = 2
    expect(buildImportedExercises(rows, catalog, []).errors['2']).toContain('повторяется')
    rows[0]!.exerciseId = 1
    expect(buildImportedExercises(rows, catalog, [1]).errors['1']).toContain('уже добавлено')
    expect(buildImportedExercises(rows, catalog, []).exercises.map(item => item.exerciseId)).toEqual([1, 2])
    expect(buildImportedExercises(rows, catalog.filter(item => item.id !== 1), []).errors['1']).toBeTruthy()
  })

  it('rejects empty and excessive input instead of silently truncating it', () => {
    for (const input of [' \n ', 'a'.repeat(20_001), Array.from({ length: 101 }, () => 'Тяга — 1 × 8 — 0 кг').join('\n')]) {
      const parsed = parseExerciseText(input, catalog)
      expect(parsed.error).toBeTruthy()
      expect(parsed.rows).toEqual([])
    }
    expect(buildImportedExercises([], catalog, []).exercises).toEqual([])
  })
})
