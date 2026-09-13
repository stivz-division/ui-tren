import type { PlannedSet } from '#shared/types/api-tren'

interface SetGroup {
  count: number
  repetitions: number
  weight: number
}

const WEIGHT_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

export function formatWeight(weight: number): string {
  return WEIGHT_FORMATTER.format(weight)
}

export function groupAdjacentSets(sets: readonly PlannedSet[]): SetGroup[] {
  return sets.reduce<SetGroup[]>((groups, set) => {
    const previous = groups.at(-1)

    if (previous?.repetitions === set.repetitions && previous.weight === set.working_weight_kg) {
      previous.count += 1
      return groups
    }

    groups.push({
      count: 1,
      repetitions: set.repetitions,
      weight: set.working_weight_kg,
    })
    return groups
  }, [])
}

export function formatSetSummary(sets: readonly PlannedSet[]): string {
  return groupAdjacentSets(sets)
    .map((group) => {
      const repetitions = `${group.count}×${group.repetitions}`
      return group.weight === 0 ? repetitions : `${repetitions} ${formatWeight(group.weight)} кг`
    })
    .join(', ')
}
