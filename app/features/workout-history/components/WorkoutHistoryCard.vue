<script setup lang="ts">
import type { WorkoutSession } from '#shared/types/api-tren'
import GroupedSetSummary from '~/components/ui/GroupedSetSummary.vue'

const props = defineProps<{ session: WorkoutSession }>()
const labels = { pending: 'Не завершено', completed: 'Завершено', skipped: 'Пропущено' }
const date = computed(() => new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(props.session.started_at)))
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
      <p class="pt-2 text-xs font-medium text-toned">Подходы × повторы · вес</p>
      <ul class="divide-y divide-default">
        <li v-for="exercise in session.exercises" :key="exercise.exercise_id" class="py-2">
          <h3 class="mb-0.5 break-words text-base font-medium leading-5 text-highlighted">{{ exercise.name }}</h3>
          <p class="mt-1 text-sm text-muted">{{ labels[exercise.status] }}</p>
          <GroupedSetSummary v-if="exercise.sets.length" :sets="exercise.sets" prominent class="mt-1" />
        </li>
      </ul>
    </details>
  </article>
</template>
