import type { Exercise } from '#shared/types/api-tren'
import { createEmptyExerciseDraft, createEmptySetDraft, type ExerciseDraft } from './form'

export const MAX_IMPORT_TEXT_LENGTH = 20_000
const MAX_IMPORT_ROWS = 100

export interface ExerciseImportRow {
  line: number
  source: string
  name: string
  exerciseId: number | null
  setCount: number
  repetitions: string
  workingWeightKg: string
  error?: string
}

function normalizeName(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/ё/g, 'е').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
}

function bigrams(value: string): Set<string> {
  const compact = value.replace(/[^\p{L}\p{N}]/gu, '')
  return new Set(Array.from({ length: Math.max(0, compact.length - 1) }, (_, index) => compact.slice(index, index + 2)))
}

export function findExerciseMatches(name: string, catalog: readonly Exercise[]) {
  const normalized = normalizeName(name)
  const exact = catalog.filter(exercise => normalizeName(exercise.name) === normalized)
  const queryGrams = bigrams(normalized)
  const suggestions = catalog.map((exercise) => {
    const candidate = normalizeName(exercise.name)
    const candidateGrams = bigrams(candidate)
    const overlap = [...queryGrams].filter(gram => candidateGrams.has(gram)).length
    const score = candidate === normalized ? 1 : (2 * overlap) / (queryGrams.size + candidateGrams.size || 1)
    return { exercise, score }
  })
    .filter(item => item.score >= 0.25)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'ru') || a.exercise.id - b.exercise.id)
    .slice(0, 3)
    .map(item => item.exercise)

  // Similarity only suggests options; only a unique exact name may be selected automatically.
  return { exactId: exact.length === 1 ? exact[0]!.id : null, suggestions }
}

function parseLine(source: string, line: number, catalog: readonly Exercise[]): ExerciseImportRow {
  const text = source.trim().replace(/^(?:\d+[.)]\s*|[-*•]\s+)/u, '')
  const row: ExerciseImportRow = { line, source, name: text, exerciseId: null, setCount: 0, repetitions: '', workingWeightKg: '' }
  // Match the prescription at the end, keeping hyphens within exercise names intact.
  const match = text.match(/^(.+?)\s+[—–-]\s+(\d+)\s*[×xх]\s*(\d+)\s+[—–-]\s+(\d+(?:[.,]\d{1,2})?)\s*(?:кг|kg)\s*$/iu)
  if (!match) return { ...row, error: 'Используйте формат: название — 3 × 8 — 10 кг' }

  const [, name, count, repetitions, weight] = match as [string, string, string, string, string]
  row.name = name.trim()
  row.setCount = Number(count)
  row.repetitions = String(Number(repetitions))
  row.workingWeightKg = String(Number(weight.replace(',', '.')))
  if (!Number.isSafeInteger(row.setCount) || row.setCount < 1 || row.setCount > 100) {
    return { ...row, error: 'Укажите от 1 до 100 подходов' }
  }
  if (!Number.isSafeInteger(Number(repetitions)) || Number(repetitions) < 1) {
    return { ...row, error: 'Укажите целое число повторений от 1' }
  }
  if (Number(row.workingWeightKg) > 1_000_000_000) {
    return { ...row, error: 'Вес должен быть от 0 до 1 000 000 000 кг' }
  }
  row.exerciseId = findExerciseMatches(row.name, catalog).exactId
  return row
}

export function parseExerciseText(text: string, catalog: readonly Exercise[]): { rows: ExerciseImportRow[], error?: string } {
  if (!text.trim()) return { rows: [], error: 'Введите хотя бы одно упражнение' }
  if (text.length > MAX_IMPORT_TEXT_LENGTH) return { rows: [], error: 'Текст слишком длинный. Максимум 20 000 символов.' }
  const lines = text.split(/\r\n?|\n/u).map((source, index) => ({ source, line: index + 1 })).filter(item => item.source.trim())
  if (lines.length > MAX_IMPORT_ROWS) return { rows: [], error: 'Добавляйте не больше 100 упражнений за один раз.' }
  return { rows: lines.map(({ source, line }) => parseLine(source, line, catalog)) }
}

export function validateImportedExercises(rows: readonly ExerciseImportRow[], catalog: readonly Exercise[], existingIds: readonly number[]): Record<number, string> {
  const errors: Record<number, string> = {}
  const existing = new Set(existingIds)
  const available = new Set(catalog.map(exercise => exercise.id))
  const seen = new Set<number>()
  for (const row of rows) {
    if (row.error) errors[row.line] = row.error
    else if (row.exerciseId === null || !available.has(row.exerciseId)) errors[row.line] = 'Выберите упражнение из каталога'
    else if (existing.has(row.exerciseId)) errors[row.line] = 'Это упражнение уже добавлено в программу'
    else if (seen.has(row.exerciseId)) errors[row.line] = 'Это упражнение повторяется в тексте'
    if (row.exerciseId !== null) seen.add(row.exerciseId)
  }
  return errors
}

export function buildImportedExercises(rows: readonly ExerciseImportRow[], catalog: readonly Exercise[], existingIds: readonly number[]): { exercises: ExerciseDraft[], errors: Record<number, string> } {
  const errors = validateImportedExercises(rows, catalog, existingIds)
  if (Object.keys(errors).length) return { exercises: [], errors }
  const exercises = rows.map(row => ({
    ...createEmptyExerciseDraft(),
    exerciseId: row.exerciseId,
    sets: Array.from({ length: row.setCount }, () => ({
      ...createEmptySetDraft(),
      repetitions: row.repetitions,
      workingWeightKg: row.workingWeightKg,
    })),
  }))
  return { exercises, errors }
}
