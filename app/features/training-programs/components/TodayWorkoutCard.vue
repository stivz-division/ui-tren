<script setup lang="ts">
import type { TrainingProgram } from '#shared/types/api-tren'

defineProps<{ program: TrainingProgram, pending?: boolean }>()
defineEmits<{ start: [] }>()
</script>

<template>
  <section class="rounded-[18px] border border-primary/25 bg-elevated p-5" aria-labelledby="today-title">
    <div class="mb-5 flex items-center gap-3 text-primary">
      <span class="flex size-11 items-center justify-center rounded-full bg-primary text-inverted">
        <UIcon name="i-lucide-check" class="size-6" aria-hidden="true" />
      </span>
      <h2 id="today-title" class="text-xl font-bold">Сегодня тренировка</h2>
    </div>
    <div class="mb-5 flex items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="break-words text-3xl font-bold leading-tight text-highlighted">{{ program.name }}</p>
        <p class="mt-2 text-lg text-muted">{{ program.exercises.length }} {{ program.exercises.length === 1 ? 'упражнение' : 'упражнения' }}</p>
      </div>
      <UIcon name="i-lucide-dumbbell" class="size-10 shrink-0 text-muted" aria-hidden="true" />
    </div>
    <UButton label="Начать тренировку" block size="xl" :loading="pending" :disabled="pending" @click="$emit('start')" />
  </section>
</template>
