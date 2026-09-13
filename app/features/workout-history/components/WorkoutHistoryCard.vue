<script setup lang="ts">
import type { WorkoutSession } from '#shared/types/api-tren'
const props = defineProps<{ session: WorkoutSession }>()
const labels = { pending: 'Не завершено', completed: 'Завершено', skipped: 'Пропущено' }
const date = computed(() => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(props.session.started_at)))
const completed = computed(() => props.session.exercises.filter(exercise => exercise.status === 'completed').length)
</script>

<template>
  <article class="rounded-[18px] border border-default bg-elevated p-4">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <UBadge :color="session.status === 'completed' ? 'success' : 'warning'" variant="subtle">{{ session.status === 'completed' ? 'Завершена' : 'Отменена' }}</UBadge>
      <time :datetime="session.started_at" class="text-sm text-muted">{{ date }}</time>
    </div>
    <h2 class="break-words text-xl font-bold text-highlighted">{{ session.program_name }}</h2>
    <p class="mt-2 text-sm text-muted">Завершено упражнений: {{ completed }} из {{ session.exercises.length }}</p>
    <details class="mt-4 border-t border-default pt-3">
      <summary class="min-h-11 cursor-pointer py-3 font-medium text-primary">Результаты упражнений</summary>
      <ul class="space-y-5 pt-2">
        <li v-for="exercise in session.exercises" :key="exercise.exercise_id">
          <h3 class="break-words font-semibold text-highlighted">{{ exercise.name }}</h3>
          <p class="mt-1 text-sm text-muted">{{ labels[exercise.status] }}</p>
          <ol v-if="exercise.sets.length" class="mt-2 space-y-1 text-sm text-toned">
            <li v-for="set in exercise.sets" :key="set.position">{{ set.position }}. {{ set.repetitions }} повт. × {{ set.working_weight_kg }} кг</li>
          </ol>
        </li>
      </ul>
    </details>
  </article>
</template>
