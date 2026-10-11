<script setup lang="ts">
import type { WorkoutExercise } from '#shared/types/api-tren'
import type { SetRow } from '~/utils/set-draft'
import type { ExerciseAction } from '../api/sessions'
import { EXERCISE_STATUS } from '../model/status'
import { ExerciseInfoButton } from '~/features/exercises'

const props = defineProps<{ exercise: WorkoutExercise, rows: SetRow[], errors: Record<string, string>, locked: boolean, saving: boolean, dirty: boolean, blocked: boolean }>()
defineEmits<{ edit: [rows: SetRow[]], action: [action: ExerciseAction], replace: [event: MouseEvent] }>()
const current = computed(() => props.exercise.effective_exercise ?? props.exercise)
</script>

<template>
  <section :aria-label="current.name" class="min-w-0 rounded-[18px] border border-default bg-elevated p-4">
    <UBadge :color="EXERCISE_STATUS[exercise.status].color" variant="subtle" :icon="EXERCISE_STATUS[exercise.status].icon">{{ EXERCISE_STATUS[exercise.status].label }}</UBadge>
    <div class="mt-4 mb-2 flex items-start gap-3">
      <h2 class="min-w-0 flex-1 break-words text-2xl font-bold text-highlighted">{{ current.name }}</h2>
      <ExerciseInfoButton :exercise-id="current.exercise_id" :name="current.name" />
    </div>
    <p class="mb-6 text-sm text-muted">Подходов по плану: {{ current.planned_sets.length }}</p>
    <p v-if="exercise.replacement" class="mb-4 text-sm text-muted">{{ exercise.replacement.replace_in_plan ? 'Замена сохранена в программе.' : 'Замена только на эту тренировку. Не учитывается в анализе.' }}</p>
    <SetEditor :model-value="rows" :disabled="locked || exercise.status !== 'pending'" :errors="errors" @update:model-value="$emit('edit', $event)" />
    <p class="mt-3 min-h-5 text-sm" :class="dirty && !saving ? 'text-warning' : 'text-muted'" role="status">{{ saving ? 'Сохраняем…' : dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены' }}</p>
    <div v-if="exercise.status === 'pending'" class="mt-6 space-y-3">
      <UButton label="Завершить упражнение" icon="i-lucide-check" block size="xl" :disabled="locked || blocked || !rows.length || Object.keys(errors).length > 0" @click="$emit('action', 'complete')" />
      <UButton label="Заменить упражнение" icon="i-lucide-repeat-2" color="neutral" variant="outline" block size="xl" :disabled="locked || blocked || saving || dirty" @click="$emit('replace', $event)" />
      <UButton label="Пропустить упражнение" color="neutral" variant="outline" block size="xl" :disabled="locked || blocked" @click="$emit('action', 'skip')" />
    </div>
    <UButton v-else label="Продолжить упражнение" icon="i-lucide-rotate-ccw" block size="xl" class="mt-6" variant="outline" :disabled="locked || blocked" @click="$emit('action', 'reopen')" />
  </section>
</template>
