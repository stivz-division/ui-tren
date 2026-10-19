<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
import { findExerciseMatches, type ExerciseImportRow } from '../model/text-import'
import ExercisePicker from './ExercisePicker.vue'

const selectedId = defineModel<number | null>({ required: true })
const props = defineProps<{ row: ExerciseImportRow, catalog: Exercise[], excludedIds: number[], error?: string }>()
const errorId = useId()
const suggestions = computed(() => findExerciseMatches(props.row.name, props.catalog).suggestions
  .filter(exercise => !props.excludedIds.includes(exercise.id)))
</script>

<template>
  <li class="min-w-0 space-y-3 rounded-xl border border-default p-3">
    <div>
      <p class="text-xs font-medium text-muted">Строка {{ row.line }}</p>
      <p class="mt-1 break-words font-medium text-highlighted">{{ row.error ? row.source : row.name }}</p>
      <p v-if="!row.error" class="mt-1 text-sm text-toned">{{ row.setCount }} × {{ row.repetitions }} · {{ row.workingWeightKg }} кг</p>
    </div>
    <p v-if="row.error" class="text-sm text-error" role="alert">{{ row.error }}</p>
    <template v-else>
      <div v-if="selectedId === null && suggestions.length" class="space-y-2">
        <p class="text-sm text-toned">Похожие упражнения — выберите подходящее:</p>
        <UButton
          v-for="exercise in suggestions"
          :key="exercise.id"
          type="button"
          :label="exercise.name"
          :aria-label="`Выбрать: ${exercise.name}`"
          color="neutral"
          variant="soft"
          size="lg"
          block
          class="min-h-11 justify-start text-left"
          :ui="{ label: 'whitespace-normal break-words' }"
          @click="selectedId = exercise.id"
        />
      </div>
      <p v-else-if="selectedId === null" class="text-sm text-toned">Совпадение не найдено. Найдите упражнение в каталоге.</p>
      <ExercisePicker v-model="selectedId" :exercises="catalog" :excluded-ids="excludedIds" :error="error" :error-id="errorId" />
    </template>
  </li>
</template>
