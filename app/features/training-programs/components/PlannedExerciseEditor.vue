<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
import { appendSet, removeSet, type ExerciseDraft } from '../model/form'
import ExercisePicker from './ExercisePicker.vue'
import PlannedSetRow from './PlannedSetRow.vue'

const model = defineModel<ExerciseDraft>({ required: true })
defineProps<{ index: number, catalog: Exercise[], excludedIds: number[], errors: Record<string, string>, canMoveUp: boolean, canMoveDown: boolean }>()
defineEmits<{ remove: [], moveUp: [], moveDown: [] }>()
</script>

<template>
  <section class="rounded-[18px] border border-default bg-elevated p-4">
    <div class="mb-4 flex items-start gap-2">
      <UIcon name="i-lucide-grip-vertical" class="mt-3 size-6 text-muted" aria-hidden="true" />
      <div class="min-w-0 flex-1"><ExercisePicker v-model="model.exerciseId" :exercises="catalog" :excluded-ids="excludedIds" /></div>
      <UButton :aria-label="`Удалить упражнение ${index + 1}`" icon="i-lucide-trash-2" color="error" variant="ghost" size="xl" @click="$emit('remove')" />
    </div>
    <div class="mb-4 flex gap-2">
      <UButton label="Выше" icon="i-lucide-arrow-up" color="neutral" variant="soft" :disabled="!canMoveUp" @click="$emit('moveUp')" />
      <UButton label="Ниже" icon="i-lucide-arrow-down" color="neutral" variant="soft" :disabled="!canMoveDown" @click="$emit('moveDown')" />
    </div>
    <div class="space-y-4">
      <PlannedSetRow v-for="(set, setIndex) in model.sets" :key="set.key" v-model="model.sets[setIndex]!" :index="setIndex" :can-delete="model.sets.length > 1" :errors="errors" :path="`exercises.${index}.sets.${setIndex}`" @remove="model = removeSet(model, set.key)" />
    </div>
    <UButton label="Добавить подход" icon="i-lucide-plus" color="neutral" variant="outline" block size="lg" class="mt-4" :disabled="model.sets.length >= 100" @click="model = appendSet(model)" />
  </section>
</template>
