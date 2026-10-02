<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
defineProps<{ exercises: Exercise[] }>()
defineEmits<{ select: [exercise: Exercise] }>()
</script>

<template>
  <ul class="space-y-3">
    <li v-for="exercise in exercises" :key="exercise.id">
      <button type="button" :aria-label="exercise.name" class="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-default bg-elevated p-4 text-left transition-colors hover:bg-accented focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" @click="$emit('select', exercise)">
        <UIcon name="i-lucide-dumbbell" class="size-6 shrink-0 text-primary" aria-hidden="true" />
        <span class="min-w-0 flex-1 break-words font-semibold text-highlighted">{{ exercise.name }}</span>
        <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-muted" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>
