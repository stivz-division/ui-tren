<script setup lang="ts">
import type { Exercise, Weekday } from '#shared/types/api-tren'
import { createEmptyExerciseDraft, moveExercise, type DraftErrors, type ProgramDraft } from '../model/form'
import PlannedExerciseEditor from './PlannedExerciseEditor.vue'
import WeekdaySelector from './WeekdaySelector.vue'

const model = defineModel<ProgramDraft>({ required: true })
const props = defineProps<{ mode: 'create' | 'edit', occupiedWeekdays: Weekday[], catalog: Exercise[], catalogUnavailable: boolean, catalogError?: string, errors: DraftErrors, pending: boolean }>()
defineEmits<{ submit: [], retryCatalog: [] }>()
const formElement = useTemplateRef<HTMLFormElement>('formElement')
const reorderAnnouncement = shallowRef('')

function removeExercise(index: number) { model.value = { ...model.value, exercises: model.value.exercises.filter((_, itemIndex) => itemIndex !== index) } }
function move(index: number, target: number) {
  if (index === target) return
  const exercise = model.value.exercises[index]
  if (!exercise) return
  model.value = { ...model.value, exercises: moveExercise(model.value.exercises, index, target) }
  const name = props.catalog.find(item => item.id === exercise.exerciseId)?.name
    ?? (exercise.exerciseId ? `Упражнение №${exercise.exerciseId}` : 'Упражнение')
  reorderAnnouncement.value = `Упражнение «${name}» перемещено на позицию ${target + 1}`
}
function addExercise() { model.value = { ...model.value, exercises: [...model.value.exercises, createEmptyExerciseDraft()] } }
const draggedExerciseIndex = shallowRef<number | null>(null)

function startDrag(index: number, event: DragEvent) {
  draggedExerciseIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function finishDrag() {
  draggedExerciseIndex.value = null
}

function dropExercise(targetIndex: number, event: DragEvent) {
  const transferredIndex = Number(event.dataTransfer?.getData('text/plain'))
  const sourceIndex = draggedExerciseIndex.value ?? (Number.isInteger(transferredIndex) ? transferredIndex : null)
  if (sourceIndex !== null) move(sourceIndex, targetIndex)
  finishDrag()
}

watch(() => props.errors, async (errors) => {
  if (Object.keys(errors).length === 0) return
  await nextTick()
  formElement.value
    ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error-focus]')
    ?.focus()
}, { flush: 'post' })
</script>

<template>
  <form ref="formElement" class="space-y-7" novalidate @submit.prevent="$emit('submit')">
    <WeekdaySelector v-model="model.weekday" :occupied="occupiedWeekdays" :readonly="mode === 'edit'" :invalid="Boolean(errors.weekday)" />
    <p v-if="errors.weekday" class="text-sm text-error" role="alert">{{ errors.weekday }}</p>
    <label class="block"><span class="mb-2 block text-base font-medium text-toned">Название</span><input v-model="model.name" class="min-h-14 w-full rounded-xl border border-default bg-default px-4 text-lg" :aria-invalid="Boolean(errors.name)" ><span v-if="errors.name" class="mt-1 block text-sm text-error" role="alert">{{ errors.name }}</span></label>
    <section aria-labelledby="exercises-title">
      <h2 id="exercises-title" class="mb-4 text-2xl font-bold text-highlighted">Упражнения</h2>
      <UAlert v-if="catalogUnavailable" color="warning" variant="subtle" icon="i-lucide-unplug" title="Каталог упражнений пока недоступен" description="Для добавления упражнений нужен endpoint GET /api/exercises." class="mb-4">
        <template #actions><UButton label="Повторить" color="warning" variant="soft" size="lg" @click="$emit('retryCatalog')" /></template>
      </UAlert>
      <UAlert v-else-if="catalogError" color="error" variant="subtle" icon="i-lucide-circle-alert" title="Не удалось загрузить каталог" :description="catalogError" class="mb-4">
        <template #actions><UButton label="Повторить" color="error" variant="soft" size="lg" @click="$emit('retryCatalog')" /></template>
      </UAlert>
      <p v-if="errors.exercises" class="mb-3 text-sm text-error" role="alert" tabindex="-1" data-error-focus>{{ errors.exercises }}</p>
      <p class="sr-only" aria-live="polite">{{ reorderAnnouncement }}</p>
      <div class="space-y-4">
        <PlannedExerciseEditor v-for="(exercise, index) in model.exercises" :key="exercise.key" v-model="model.exercises[index]!" :index="index" :catalog="catalog" :excluded-ids="model.exercises.map(item => item.exerciseId).filter((id): id is number => id !== null)" :errors="errors" :can-move-up="index > 0" :can-move-down="index < model.exercises.length - 1" @remove="removeExercise(index)" @move-up="move(index, index - 1)" @move-down="move(index, index + 1)" @drag-start="startDrag(index, $event)" @drag-end="finishDrag" @drop="dropExercise(index, $event)" />
      </div>
      <UButton label="Добавить упражнение" icon="i-lucide-plus" color="neutral" variant="outline" block size="xl" class="mt-4" :disabled="catalogUnavailable || catalog.length === 0" @click="addExercise" />
    </section>
    <UButton type="submit" :label="mode === 'create' ? 'Создать тренировку' : 'Сохранить изменения'" block size="xl" :loading="pending" :disabled="pending" />
  </form>
</template>
