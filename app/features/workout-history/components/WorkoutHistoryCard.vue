<script setup lang="ts">
import type { WorkoutSession } from '#shared/types/api-tren'
import GroupedSetSummary from '~/components/ui/GroupedSetSummary.vue'

const props = defineProps<{ session: WorkoutSession }>()
const labels = { pending: 'Не завершено', completed: 'Завершено', skipped: 'Пропущено' }
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const hourFormatter = new Intl.NumberFormat('ru-RU', { style: 'unit', unit: 'hour', unitDisplay: 'long' })
const startedDate = computed(() => formatSessionDate(props.session.started_at))
const endedAt = computed(() => props.session.completed_at ?? props.session.cancelled_at)
const endedDate = computed(() => formatSessionDate(endedAt.value))
const endLabel = computed(() => props.session.completed_at ? 'Завершение' : 'Отмена')
const duration = computed(() => {
  if (!endedAt.value) return null

  const elapsed = Date.parse(endedAt.value) - Date.parse(props.session.started_at)
  if (!Number.isFinite(elapsed) || elapsed < 0) return null
  if (elapsed < 60_000) return 'меньше минуты'

  const totalMinutes = Math.floor(elapsed / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return [hours ? hourFormatter.format(hours) : '', minutes ? `${minutes} мин` : ''].filter(Boolean).join(' ')
})
const completed = computed(() => props.session.exercises.filter(exercise => exercise.status === 'completed').length)

function formatSessionDate(value: string | null | undefined): string | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? dateFormatter.format(timestamp) : null
}
</script>

<template>
  <article class="rounded-[18px] border border-default bg-elevated p-4">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <UBadge :color="session.status === 'completed' ? 'success' : 'warning'" variant="subtle">{{ session.status === 'completed' ? 'Завершена' : 'Отменена' }}</UBadge>
    </div>
    <h2 class="break-words text-xl font-bold text-highlighted">{{ session.program_name }}</h2>
    <dl class="mt-2 space-y-1 text-sm text-muted">
      <div v-if="startedDate" class="flex flex-wrap gap-x-1">
        <dt>Начало:</dt>
        <dd><time :datetime="session.started_at">{{ startedDate }}</time></dd>
      </div>
      <div v-if="endedAt && endedDate" class="flex flex-wrap gap-x-1">
        <dt>{{ endLabel }}:</dt>
        <dd><time :datetime="endedAt">{{ endedDate }}</time></dd>
      </div>
      <div v-if="duration" class="flex flex-wrap gap-x-1">
        <dt>Длительность:</dt>
        <dd>{{ duration }}</dd>
      </div>
    </dl>
    <p class="mt-2 text-sm text-muted">Завершено упражнений: {{ completed }} из {{ session.exercises.length }}</p>
    <UButton v-if="session.status === 'completed'" :to="`/workout-analysis/${session.id}`" label="Анализ тренировки" icon="i-lucide-chart-no-axes-combined" variant="soft" class="mt-4 min-h-11" />
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
