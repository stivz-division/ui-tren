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
const cardElement = useTemplateRef<HTMLElement>('cardElement')

async function addSet() {
  const updatedExercise = appendSet(model.value)
  if (updatedExercise === model.value) return
  const set = updatedExercise.sets.at(-1)!
  model.value = updatedExercise
  await nextTick()
  const row = cardElement.value?.querySelector<HTMLElement>(`[data-set-key="${set.key}"]`)
  row?.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.focus({ preventScroll: true })
  row?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'center',
  })
}
</script>

<template>
  <section
    ref="cardElement"
    class="scroll-mt-4 rounded-[18px] border border-default bg-elevated p-4"
    tabindex="-1"
    :aria-label="`Упражнение ${index + 1}`"
    :data-exercise-index="index"
    :data-exercise-key="model.key"
    @dragover.prevent
    @drop.prevent="$emit('drop', $event)"
  >
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        draggable="true"
        class="flex min-h-11 min-w-11 cursor-grab items-center justify-center gap-1 rounded-lg px-2 text-muted hover:bg-accented active:cursor-grabbing active:bg-accented"
        :aria-label="`Перетащить упражнение ${index + 1}`"
        @dragstart="$emit('dragStart', $event)"
        @dragend="$emit('dragEnd')"
      >
        <UIcon name="i-lucide-grip-vertical" class="size-6" aria-hidden="true" />
        <span class="text-sm font-semibold tabular-nums" aria-hidden="true">{{ index + 1 }}</span>
      </button>
      <div class="ms-auto flex items-center gap-2" role="group" :aria-label="`Порядок упражнения ${index + 1}`">
        <UButton :aria-label="`Переместить упражнение ${index + 1} выше`" title="Выше" icon="i-lucide-arrow-up" color="neutral" variant="soft" size="xl" class="min-h-11 min-w-11 justify-center rounded-xl" :disabled="!canMoveUp" @click="$emit('moveUp')" />
        <UButton :aria-label="`Переместить упражнение ${index + 1} ниже`" title="Ниже" icon="i-lucide-arrow-down" color="neutral" variant="soft" size="xl" class="min-h-11 min-w-11 justify-center rounded-xl" :disabled="!canMoveDown" @click="$emit('moveDown')" />
      </div>
      <UButton :aria-label="`Удалить упражнение ${index + 1}`" icon="i-lucide-trash-2" color="error" variant="ghost" size="xl" @click="$emit('remove')" />
    </div>
    <ExercisePicker v-model="model.exerciseId" class="mb-4" :exercises="catalog" :excluded-ids="excludedIds" :error="errors[`exercises.${index}.exercise_id`]" :error-id="`exercise-${index}-error`" />
    <div class="space-y-4">
      <PlannedSetRow v-for="(set, setIndex) in model.sets" :key="set.key" v-model="model.sets[setIndex]!" :data-set-key="set.key" :index="setIndex" :can-delete="model.sets.length > 1" :errors="errors" :path="`exercises.${index}.sets.${setIndex}`" @remove="model = removeSet(model, set.key)" />
    </div>
    <UButton label="Добавить подход" icon="i-lucide-plus" color="neutral" variant="outline" block size="lg" class="mt-4 min-h-11" :disabled="model.sets.length >= 100" @click="addSet" />
  </section>
</template>
