import type { PlannedSetInput } from '#shared/types/api-tren'

export interface SetRow {
  key: string
  repetitions: string
  weight: string
}

export function createSetRows(sets: readonly PlannedSetInput[]): SetRow[] {
  return sets.map(set => ({ key: globalThis.crypto.randomUUID(), repetitions: String(set.repetitions), weight: String(set.working_weight_kg) }))
}

export function parseSetRows(rows: readonly SetRow[], minimum = 0): { sets: PlannedSetInput[], errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  if (rows.length < minimum) errors.sets = 'Добавьте хотя бы один подход'
  if (rows.length > 100) errors.sets = 'Можно добавить не более 100 подходов'
  const sets = rows.map((row, index) => {
    const repetitions = Number(row.repetitions)
    const weight = Number(row.weight.replace(',', '.'))
    if (!/^\d+$/.test(row.repetitions) || !Number.isSafeInteger(repetitions) || repetitions < 1) {
      errors[`sets.${index}.repetitions`] = 'Целое число от 1'
    }
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(row.weight) || !Number.isFinite(weight) || weight > 1_000_000_000) {
      errors[`sets.${index}.working_weight_kg`] = 'Вес от 0, до двух знаков после запятой'
    }
    return { repetitions, working_weight_kg: weight }
  })
  return { sets, errors }
}
