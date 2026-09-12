import { describe, expect, it } from 'vitest'
import {
  appendSet,
  createProgramDraft,
  moveExercise,
  removeSet,
  toCreateProgramInput,
  toUpdateProgramInput,
} from './form'

function populatedDraft() {
  return {
    weekday: 2 as const,
    name: 'Тренировка',
    exercises: [
      {
        key: 'exercise-10',
        exerciseId: 10,
        sets: [
          { key: 'set-1', repetitions: '6', workingWeightKg: '90,5' },
          { key: 'set-2', repetitions: '3', workingWeightKg: '120' },
        ],
      },
    ],
  }
}

describe('program draft', () => {
  it('creates an editable copy without mutating an API program', () => {
    const program = {
      id: 1,
      weekday: 1 as const,
      name: 'Грудь',
      exercises: [{
        exercise_id: 10,
        position: 1,
        sets: [{ position: 1, repetitions: 6, working_weight_kg: 100 }],
      }],
    }

    const draft = createProgramDraft(program)
    draft.name = 'Изменено'
    draft.exercises[0]!.sets[0]!.repetitions = '8'

    expect(program.name).toBe('Грудь')
    expect(program.exercises[0]!.sets[0]!.repetitions).toBe(6)
  })

  it('copies values from the previous set when adding a set', () => {
    const exercise = populatedDraft().exercises[0]!
    const next = appendSet(exercise, 'set-3')

    expect(next.sets.at(-1)).toEqual({
      key: 'set-3',
      repetitions: '3',
      workingWeightKg: '120',
    })
    expect(exercise.sets).toHaveLength(2)
  })

  it('keeps a copied set empty when the previous set is incomplete', () => {
    const exercise = {
      key: 'exercise-10',
      exerciseId: 10,
      sets: [{ key: 'set-1', repetitions: '', workingWeightKg: '20' }],
    }

    expect(appendSet(exercise, 'set-2').sets.at(-1)).toEqual({
      key: 'set-2',
      repetitions: '',
      workingWeightKg: '',
    })
  })

  it('refuses to delete the last set and enforces the 100 set cap', () => {
    const oneSet = {
      key: 'exercise-10',
      exerciseId: 10,
      sets: [{ key: 'set-1', repetitions: '6', workingWeightKg: '100' }],
    }
    expect(removeSet(oneSet, 'set-1')).toBe(oneSet)

    const full = {
      ...oneSet,
      sets: Array.from({ length: 100 }, (_, index) => ({
        key: `set-${index}`,
        repetitions: '6',
        workingWeightKg: '100',
      })),
    }
    expect(appendSet(full, 'set-101')).toBe(full)
  })

  it('moves exercises immutably in user order', () => {
    const exercises = [
      { key: 'a', exerciseId: 10, sets: [] },
      { key: 'b', exerciseId: 20, sets: [] },
      { key: 'c', exerciseId: 30, sets: [] },
    ]

    expect(moveExercise(exercises, 2, 0).map(item => item.key)).toEqual(['c', 'a', 'b'])
    expect(exercises.map(item => item.key)).toEqual(['a', 'b', 'c'])
  })

  it('builds an ordered create payload without positions', () => {
    expect(toCreateProgramInput(populatedDraft())).toEqual({
      ok: true,
      value: {
        weekday: 2,
        name: 'Тренировка',
        exercises: [{
          exercise_id: 10,
          sets: [
            { repetitions: 6, working_weight_kg: 90.5 },
            { repetitions: 3, working_weight_kg: 120 },
          ],
        }],
      },
    })
  })

  it('builds a replacing edit payload without weekday', () => {
    expect(toUpdateProgramInput(populatedDraft())).toEqual({
      ok: true,
      value: {
        name: 'Тренировка',
        exercises: [{
          exercise_id: 10,
          sets: [
            { repetitions: 6, working_weight_kg: 90.5 },
            { repetitions: 3, working_weight_kg: 120 },
          ],
        }],
      },
    })
  })

  it('returns field errors for duplicate exercises and invalid set values', () => {
    const draft = populatedDraft()
    draft.exercises.push({
      key: 'duplicate',
      exerciseId: 10,
      sets: [{ key: 'bad', repetitions: '0', workingWeightKg: '1.234' }],
    })

    expect(toCreateProgramInput(draft)).toEqual({
      ok: false,
      errors: {
        'exercises.1.exercise_id': 'Это упражнение уже добавлено',
        'exercises.1.sets.0.repetitions': 'Укажите целое число от 1',
        'exercises.1.sets.0.working_weight_kg': 'Укажите вес от 0, максимум с двумя знаками после запятой',
      },
    })
  })
})
