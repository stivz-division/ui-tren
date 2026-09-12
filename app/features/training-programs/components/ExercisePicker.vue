<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
import { ensureCurrentExerciseOption } from '../model/program'
const model = defineModel<number | null>({ required: true })
const props = defineProps<{ exercises: Exercise[], excludedIds: number[], error?: string, errorId?: string }>()
const options = computed(() => ensureCurrentExerciseOption(props.exercises, model.value))
</script>

<template>
  <label class="block">
    <span class="mb-2 block text-base font-medium text-toned">Упражнение</span>
    <select v-model.number="model" class="min-h-12 w-full rounded-xl border border-default bg-default px-4 text-base text-default" :aria-invalid="Boolean(error)" :aria-describedby="error ? errorId : undefined">
      <option :value="null" disabled>Выберите упражнение</option>
      <option v-for="exercise in options" :key="exercise.id" :value="exercise.id" :disabled="excludedIds.includes(exercise.id) && exercise.id !== model">{{ exercise.name }}</option>
    </select>
    <span v-if="error" :id="errorId" class="mt-1 block text-sm text-error" role="alert">{{ error }}</span>
  </label>
</template>
