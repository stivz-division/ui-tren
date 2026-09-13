<script setup lang="ts">
import type { Exercise, TrainingProgram } from '#shared/types/api-tren'
import { getExerciseFallbackName, WEEKDAY_LABELS } from '../model/program'
import DeleteProgramSheet from './DeleteProgramSheet.vue'
import GroupedSetSummary from '~/components/ui/GroupedSetSummary.vue'

const props = defineProps<{ program: TrainingProgram, catalog: Exercise[], startPending: boolean, deletePending: boolean }>()
defineEmits<{ start: [], delete: [] }>()
const deleteOpen = shallowRef(false)
const exerciseName = (id: number) => props.catalog.find(item => item.id === id)?.name ?? getExerciseFallbackName(id)
</script>

<template>
  <div>
    <ScreenHeader :title="program.name" back>
      <template #actions><UButton :to="`/programs/${program.id}/edit`" label="Редактировать" icon="i-lucide-pencil" variant="ghost" size="lg" class="min-h-11" /></template>
    </ScreenHeader>
    <div class="mb-8 inline-flex min-h-12 items-center gap-3 rounded-xl border border-default bg-muted px-4 text-lg text-muted"><UIcon name="i-lucide-calendar-days" class="size-5" aria-hidden="true" />{{ WEEKDAY_LABELS[program.weekday] }}</div>
    <section aria-labelledby="detail-exercises">
      <h2 id="detail-exercises" class="mb-3 text-xl font-bold text-highlighted">Упражнения</h2>
      <div class="rounded-[18px] border border-accented bg-default px-4 shadow-sm">
        <p class="pt-2 text-xs font-medium text-toned">Подходы × повторы · вес</p>
        <ul class="divide-y divide-default">
          <li v-for="exercise in program.exercises" :key="exercise.position" class="py-2">
            <h3 class="mb-0.5 break-words text-base font-medium leading-5 text-highlighted">{{ exerciseName(exercise.exercise_id) }}</h3>
            <GroupedSetSummary :sets="exercise.sets" prominent />
          </li>
        </ul>
      </div>
    </section>
    <UButton label="Начать тренировку" block size="xl" class="mt-10" :loading="startPending" :disabled="startPending || deletePending" @click="$emit('start')" />
    <div class="mt-8 border-t border-muted pt-6"><UButton label="Удалить тренировку" icon="i-lucide-trash-2" color="error" variant="outline" block size="xl" @click="deleteOpen = true" /></div>
    <DeleteProgramSheet v-model:open="deleteOpen" :weekday="WEEKDAY_LABELS[program.weekday]" :pending="deletePending" @confirm="$emit('delete')" />
  </div>
</template>
