<script setup lang="ts">
import type { Exercise, TrainingProgram } from '#shared/types/api-tren'
import { getExerciseFallbackName, WEEKDAY_LABELS } from '../model/program'
import GroupedSetSummary from './GroupedSetSummary.vue'

const props = defineProps<{ program: TrainingProgram, catalog: Exercise[] }>()
const exerciseName = (id: number) => props.catalog.find(item => item.id === id)?.name ?? getExerciseFallbackName(id)
</script>

<template>
  <NuxtLink
    :to="`/programs/${program.id}`"
    class="block min-h-11 rounded-[18px] border border-default bg-elevated p-5 transition-colors hover:bg-muted"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <UBadge color="primary" variant="subtle" size="lg">{{ WEEKDAY_LABELS[program.weekday] }}</UBadge>
      <UIcon name="i-lucide-chevron-right" class="size-6 shrink-0 text-muted" aria-hidden="true" />
    </div>
    <h2 class="break-words text-2xl font-bold text-highlighted">{{ program.name }}</h2>
    <ul class="mt-3 space-y-2 text-base text-muted">
      <li v-for="exercise in program.exercises" :key="exercise.position" class="break-words">
        <span>{{ exerciseName(exercise.exercise_id) }}</span>
        <span aria-hidden="true"> · </span>
        <GroupedSetSummary :sets="exercise.sets" />
      </li>
    </ul>
  </NuxtLink>
</template>
