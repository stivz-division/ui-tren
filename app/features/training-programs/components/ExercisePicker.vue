<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
import { ensureCurrentExerciseOption } from '../model/program'
const model = defineModel<number | null>({ required: true })
const props = defineProps<{ exercises: Exercise[], excludedIds: number[], error?: string, errorId?: string }>()
const fieldId = useId()
const selectedId = computed({
  get: () => model.value ?? undefined,
  set: (value: number | undefined) => { model.value = value ?? null },
})
const options = computed(() => ensureCurrentExerciseOption(props.exercises, model.value)
  .filter(exercise => exercise.id === model.value || !props.excludedIds.includes(exercise.id)))
</script>

<template>
  <div class="min-w-0">
    <label :id="`${fieldId}-label`" :for="fieldId" class="mb-2 block text-base font-medium text-toned">Упражнение</label>
    <USelectMenu
      :id="fieldId"
      v-model="selectedId"
      data-exercise-picker
      :aria-labelledby="`${fieldId}-label`"
      :items="options"
      value-key="id"
      label-key="name"
      placeholder="Выберите упражнение"
      :search-input="{ placeholder: 'Поиск упражнения…', icon: 'i-lucide-search', size: 'xl', ui: { base: 'min-h-12 text-base' } }"
      :color="error ? 'error' : 'neutral'"
      size="xl"
      class="min-h-12 w-full rounded-xl text-base"
      :ui="{ value: 'whitespace-normal text-left break-words', content: 'rounded-xl', item: 'min-h-12 text-base', itemLabel: 'whitespace-normal break-words' }"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? errorId : undefined"
    >
      <template #empty>Упражнения не найдены</template>
    </USelectMenu>
    <span v-if="error" :id="errorId" class="mt-1 block text-sm text-error" role="alert">{{ error }}</span>
  </div>
</template>
