<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
import { appendSet, removeSet, type ExerciseDraft } from '../model/form'
import ExercisePicker from './ExercisePicker.vue'
import PlannedSetRow from './PlannedSetRow.vue'

const model = defineModel<ExerciseDraft>({ required: true })
defineProps<{ index: number, catalog: Exercise[], excludedIds: number[], errors: Record<string, string>, canMoveUp: boolean, canMoveDown: boolean }>()
defineEmits<{
  remove: []
  moveUp: []
  moveDown: []
  dragStart: [event: DragEvent]
  dragEnd: []
  drop: [event: DragEvent]
}>()
</script>

<template>
  <section
    class="rounded-[18px] border border-default bg-elevated p-4"
    :data-exercise-index="index"
    @dragover.prevent
    @drop.prevent="$emit('drop', $event)"
  >
    <div class="mb-4 flex items-start gap-2">
      <button
        type="button"
        draggable="true"
        class="mt-1 flex min-h-11 min-w-11 cursor-grab items-center justify-center rounded-lg text-muted active:cursor-grabbing"
        :aria-label="`Перетащить упражнение ${index + 1}`"
        @dragstart="$emit('dragStart', $event)"
        @dragend="$emit('dragEnd')"
      >
        <UIcon name="i-lucide-grip-vertical" class="size-6" aria-hidden="true" />
      </button>
      <div class="min-w-0 flex-1"><ExercisePicker v-model="model.exerciseId" :exercises="catalog" :excluded-ids="excludedIds" :error="errors[`exercises.${index}.exercise_id`]" :error-id="`exercise-${index}-error`" /></div>
      <UButton :aria-label="`Удалить упражнение ${index + 1}`" icon="i-lucide-trash-2" color="error" variant="ghost" size="xl" @click="$emit('remove')" />
    </div>
    <div class="mb-4 flex gap-2">
      <UButton label="Выше" icon="i-lucide-arrow-up" color="neutral" variant="soft" size="lg" class="min-h-11" :disabled="!canMoveUp" @click="$emit('moveUp')" />
      <UButton label="Ниже" icon="i-lucide-arrow-down" color="neutral" variant="soft" size="lg" class="min-h-11" :disabled="!canMoveDown" @click="$emit('moveDown')" />
    </div>
    <div class="space-y-4">
      <PlannedSetRow v-for="(set, setIndex) in model.sets" :key="set.key" v-model="model.sets[setIndex]!" :index="setIndex" :can-delete="model.sets.length > 1" :errors="errors" :path="`exercises.${index}.sets.${setIndex}`" @remove="model = removeSet(model, set.key)" />
    </div>
    <UButton label="Добавить подход" icon="i-lucide-plus" color="neutral" variant="outline" block size="lg" class="mt-4 min-h-11" :disabled="model.sets.length >= 100" @click="model = appendSet(model)" />
  </section>
</template>
