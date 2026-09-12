<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
const model = defineModel<number | null>({ required: true })
defineProps<{ exercises: Exercise[], excludedIds: number[] }>()
</script>

<template>
  <label class="block">
    <span class="mb-2 block text-base font-medium text-toned">Упражнение</span>
    <select v-model.number="model" class="min-h-12 w-full rounded-xl border border-default bg-default px-4 text-base text-default">
      <option :value="null" disabled>Выберите упражнение</option>
      <option v-for="exercise in exercises" :key="exercise.id" :value="exercise.id" :disabled="excludedIds.includes(exercise.id) && exercise.id !== model">{{ exercise.name }}</option>
    </select>
  </label>
</template>
