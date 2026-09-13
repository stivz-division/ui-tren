<script setup lang="ts">
import type { Exercise, TrainingProgram } from '#shared/types/api-tren'
import { formatExerciseCount, getExerciseFallbackName, WEEKDAY_LABELS } from '../model/program'
import GroupedSetSummary from './GroupedSetSummary.vue'

const props = withDefaults(defineProps<{
  program: TrainingProgram
  catalog: Exercise[]
  scheduleLabel?: string
  actionLabel?: string
  headingTag?: 'h2' | 'h3'
}>(), { headingTag: 'h2', scheduleLabel: undefined, actionLabel: undefined })
const exerciseName = (id: number) => props.catalog.find(item => item.id === id)?.name ?? getExerciseFallbackName(id)
</script>

<template>
  <NuxtLink
    :to="`/programs/${program.id}`"
    class="group block min-h-11 overflow-hidden rounded-[18px] border border-accented bg-default shadow-sm transition-colors duration-200 hover:border-primary/50 active:bg-elevated"
  >
    <div class="border-b border-default bg-primary/5 px-4 py-3">
      <div class="mb-1 flex items-center justify-between gap-3">
        <span class="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--ui-color-primary-800)] dark:text-[var(--ui-color-primary-200)]">
          <UIcon name="i-lucide-calendar-days" class="size-4 shrink-0" aria-hidden="true" />
          <span>{{ scheduleLabel ?? WEEKDAY_LABELS[program.weekday] }}</span>
        </span>
        <UIcon v-if="!actionLabel" name="i-lucide-chevron-right" class="size-5 shrink-0 text-toned" aria-hidden="true" />
      </div>
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <component :is="headingTag" class="min-w-0 break-words text-xl font-bold leading-6 text-highlighted">{{ program.name }}</component>
        <span class="text-xs font-medium text-toned">{{ formatExerciseCount(program.exercises.length) }}</span>
      </div>
    </div>
    <div class="px-4">
      <p class="pt-2 text-xs font-medium text-toned">Подходы × повторы · вес</p>
      <ul class="divide-y divide-default">
        <li v-for="exercise in program.exercises" :key="exercise.position" class="py-2">
          <p class="mb-0.5 break-words text-base font-medium leading-5 text-highlighted">{{ exerciseName(exercise.exercise_id) }}</p>
          <GroupedSetSummary :sets="exercise.sets" prominent />
        </li>
      </ul>
    </div>
    <div v-if="actionLabel" class="flex min-h-11 items-center justify-between gap-3 border-t border-default bg-primary/5 px-4 py-2 text-sm font-semibold text-[var(--ui-color-primary-800)] transition-colors duration-200 group-hover:bg-primary/10 dark:text-[var(--ui-color-primary-200)]">
      <span>{{ actionLabel }}</span>
      <UIcon name="i-lucide-arrow-right" class="size-5 shrink-0" aria-hidden="true" />
    </div>
  </NuxtLink>
</template>
