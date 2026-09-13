import type {
  CreateTrainingProgramInput,
  PlannedExerciseInput,
  TrainingProgram,
  UpdateTrainingProgramInput,
  Weekday,
} from '#shared/types/api-tren'

export interface SetDraft {
  key: string
  repetitions: string
  workingWeightKg: string
}

export interface ExerciseDraft {
  key: string
  exerciseId: number | null
  sets: SetDraft[]
}

export interface ProgramDraft {
  weekday: Weekday | null
  name: string
  exercises: ExerciseDraft[]
}

export type DraftErrors = Record<string, string>

export type MappingResult<T> =
  | { ok: true, value: T }
  | { ok: false, errors: DraftErrors }

function createDraftKey(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`
}

export function createEmptySetDraft(key = createDraftKey('set')): SetDraft {
  return { key, repetitions: '', workingWeightKg: '' }
}

export function createEmptyExerciseDraft(key = createDraftKey('exercise')): ExerciseDraft {
  return { key, exerciseId: null, sets: [createEmptySetDraft()] }
}

export function createProgramDraft(program?: TrainingProgram): ProgramDraft {
  if (!program) {
    return {
      weekday: null,
      name: 'Тренировка',
      exercises: [],
    }
  }

  return {
    weekday: program.weekday,
    name: program.name,
    exercises: program.exercises.map((exercise, exerciseIndex) => ({
      key: `exercise-${exercise.exercise_id}-${exerciseIndex}`,
      exerciseId: exercise.exercise_id,
      sets: exercise.sets.map((set, setIndex) => ({
        key: `set-${exercise.exercise_id}-${setIndex}`,
        repetitions: String(set.repetitions),
        workingWeightKg: String(set.working_weight_kg),
      })),
    })),
  }
}

export function appendSet(exercise: ExerciseDraft, key = createDraftKey('set')): ExerciseDraft {
  if (exercise.sets.length >= 100) return exercise

  const previous = exercise.sets.at(-1)
  const nextSet: SetDraft = {
    key,
    repetitions: previous?.repetitions ?? '',
    workingWeightKg: previous?.workingWeightKg ?? '',
  }

  return { ...exercise, sets: [...exercise.sets, nextSet] }
}

export function removeSet(exercise: ExerciseDraft, setKey: string): ExerciseDraft {
  if (exercise.sets.length <= 1) return exercise
  return { ...exercise, sets: exercise.sets.filter(set => set.key !== setKey) }
}

export function moveExercise(
  exercises: readonly ExerciseDraft[],
  fromIndex: number,
  toIndex: number,
): ExerciseDraft[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return [...exercises]
  if (fromIndex >= exercises.length || toIndex >= exercises.length) return [...exercises]

  const next = [...exercises]
  const [moved] = next.splice(fromIndex, 1)
  if (moved) next.splice(toIndex, 0, moved)
  return next
}

function parseRepetitions(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null
}

function parseWeight(value: string): number | null {
  if (value.trim() === '') return 0
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000_000 ? parsed : null
}

function mapExercises(draft: ProgramDraft, errors: DraftErrors): PlannedExerciseInput[] {
  const seenExerciseIds = new Set<number>()

  return draft.exercises.map((exercise, exerciseIndex) => {
    const exercisePath = `exercises.${exerciseIndex}`
    const exerciseId = exercise.exerciseId

    if (exerciseId === null) {
      errors[`${exercisePath}.exercise_id`] = 'Выберите упражнение'
    }
    else if (seenExerciseIds.has(exerciseId)) {
      errors[`${exercisePath}.exercise_id`] = 'Это упражнение уже добавлено'
    }
    else {
      seenExerciseIds.add(exerciseId)
    }

    const sets = exercise.sets.map((set, setIndex) => {
      const setPath = `${exercisePath}.sets.${setIndex}`
      const repetitions = parseRepetitions(set.repetitions)
      const workingWeightKg = parseWeight(set.workingWeightKg)

      if (repetitions === null) {
        errors[`${setPath}.repetitions`] = 'Укажите целое число от 1'
      }
      if (workingWeightKg === null) {
        errors[`${setPath}.working_weight_kg`] = 'Укажите вес от 0, максимум с двумя знаками после запятой'
      }

      return {
        repetitions: repetitions ?? 1,
        working_weight_kg: workingWeightKg ?? 0,
      }
    })

    return {
      exercise_id: exerciseId ?? 0,
      sets,
    }
  })
}

function validateDraft(draft: ProgramDraft, includeWeekday: boolean): MappingResult<PlannedExerciseInput[]> {
  const errors: DraftErrors = {}

  if (includeWeekday && draft.weekday === null) errors.weekday = 'Выберите день недели'
  if (!draft.name.trim()) errors.name = 'Введите название тренировки'
  if (draft.exercises.length === 0) errors.exercises = 'Добавьте хотя бы одно упражнение'

  const exercises = mapExercises(draft, errors)
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: exercises }
}

export function toCreateProgramInput(draft: ProgramDraft): MappingResult<CreateTrainingProgramInput> {
  const exercises = validateDraft(draft, true)
  if (!exercises.ok) return exercises

  return {
    ok: true,
    value: {
      weekday: draft.weekday!,
      name: draft.name.trim(),
      exercises: exercises.value,
    },
  }
}

export function toUpdateProgramInput(draft: ProgramDraft): MappingResult<UpdateTrainingProgramInput> {
  const exercises = validateDraft(draft, false)
  if (!exercises.ok) return exercises

  return {
    ok: true,
    value: {
      name: draft.name.trim(),
      exercises: exercises.value,
    },
  }
}
