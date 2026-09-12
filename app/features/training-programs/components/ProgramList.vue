<script setup lang="ts">
import { useExerciseCatalog } from '../composables/useExerciseCatalog'
import { useTrainingPrograms } from '../composables/useTrainingPrograms'
import ProgramCard from './ProgramCard.vue'

const { programs, status, error, load } = useTrainingPrograms()
const catalog = useExerciseCatalog()
onMounted(() => void Promise.all([load(), catalog.load()]))
</script>

<template>
  <div>
    <ScreenHeader title="Программа" subtitle="Ваши тренировки по дням">
      <template #actions><UButton to="/programs/new" label="Создать" icon="i-lucide-plus" color="neutral" variant="ghost" size="lg" /></template>
    </ScreenHeader>
    <div v-if="status === 'pending' || status === 'idle'" class="space-y-4" aria-label="Загрузка программ">
      <USkeleton v-for="index in 3" :key="index" class="h-44 rounded-[18px]" />
    </div>
    <UAlert v-else-if="status === 'error'" color="error" icon="i-lucide-circle-alert" title="Не удалось загрузить программы" :description="error?.message">
      <template #actions><UButton label="Повторить" color="error" variant="soft" @click="load(true)" /></template>
    </UAlert>
    <div v-else-if="programs.length === 0" class="rounded-[18px] border border-default bg-elevated p-8 text-center">
      <UIcon name="i-lucide-clipboard-list" class="mx-auto mb-4 size-12 text-muted" aria-hidden="true" />
      <h2 class="text-2xl font-bold text-highlighted">Программ пока нет</h2>
      <p class="mt-2 text-base text-muted">Создайте первую тренировку в недельном расписании.</p>
      <UButton to="/programs/new" label="Создать тренировку" icon="i-lucide-plus" size="xl" class="mt-6" />
    </div>
    <div v-else class="space-y-4">
      <ProgramCard v-for="program in programs" :key="program.id" :program="program" :catalog="catalog.exercises.value" />
    </div>
  </div>
</template>
