<script setup lang="ts">
import ExerciseDetailsModal from './ExerciseDetailsModal.vue'
defineProps<{ exerciseId: number, name: string, label?: string }>()
const open = shallowRef(false)
</script>

<template>
  <ExerciseDetailsModal v-model:open="open" :exercise-id="exerciseId" :name="name">
    <UButton :label="label" :aria-label="label ? undefined : `Об упражнении: ${name}`" icon="i-lucide-info" color="neutral" variant="soft" class="min-h-11 min-w-11 shrink-0 justify-center" :ui="{ label: 'whitespace-normal text-left' }" />
  </ExerciseDetailsModal>
</template>
