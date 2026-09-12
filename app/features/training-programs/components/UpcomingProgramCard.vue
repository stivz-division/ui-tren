<script setup lang="ts">
import type { Exercise, TrainingProgram } from '#shared/types/api-tren'
import { formatRelativeDay } from '~/utils/date'
import { WEEKDAY_LABELS } from '../model/program'
import ProgramCard from './ProgramCard.vue'

defineProps<{ program: TrainingProgram, daysUntil: number, catalog: Exercise[], detailed?: boolean }>()
</script>

<template>
  <section aria-labelledby="next-workout-title">
    <h2 id="next-workout-title" class="mb-4 text-2xl font-bold text-highlighted">Следующая тренировка</h2>
    <div v-if="detailed" class="rounded-[18px] border border-default bg-elevated p-5">
      <UBadge color="primary" variant="subtle" size="lg" class="mb-3">
        {{ formatRelativeDay(daysUntil) }} · {{ WEEKDAY_LABELS[program.weekday] }}
      </UBadge>
      <ProgramCard :program="program" :catalog="catalog" class="border-0 bg-transparent p-0" />
      <UButton :to="`/programs/${program.id}`" label="Посмотреть программу" color="neutral" variant="outline" block size="xl" class="mt-4" trailing-icon="i-lucide-chevron-right" />
    </div>
    <NuxtLink v-else :to="`/programs/${program.id}`" class="flex min-h-24 items-center gap-4 rounded-[18px] border border-default bg-elevated p-5">
      <UIcon name="i-lucide-calendar-days" class="size-8 shrink-0 text-muted" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p class="text-base text-muted">{{ WEEKDAY_LABELS[program.weekday] }}</p>
        <p class="break-words text-xl font-bold text-highlighted">{{ program.name }}</p>
      </div>
      <UIcon name="i-lucide-chevron-right" class="size-6 shrink-0 text-muted" aria-hidden="true" />
    </NuxtLink>
  </section>
</template>
