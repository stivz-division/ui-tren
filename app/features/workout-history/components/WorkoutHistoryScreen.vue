<script setup lang="ts">
import { useWorkoutHistory } from '../composables/useWorkoutHistory'
import WorkoutHistoryCard from './WorkoutHistoryCard.vue'
const { sessions, nextCursor, loading, loaded, error, load } = useWorkoutHistory()
</script>

<template>
  <div>
    <ScreenHeader title="История тренировок" subtitle="Ваши тренировки и результаты" />
    <div v-if="!loaded && loading" aria-label="Загрузка истории" class="space-y-4"><USkeleton class="h-48 rounded-2xl" /><USkeleton class="h-48 rounded-2xl" /></div>
    <UAlert v-else-if="loaded && !sessions.length && !error" title="Тренировок пока нет" description="Здесь появятся завершённые и отменённые тренировки." icon="i-lucide-history" color="neutral"><template #actions><UButton to="/" label="На главную" /></template></UAlert>
    <div v-else class="space-y-4"><WorkoutHistoryCard v-for="session in sessions" :key="session.id" :session="session" /></div>
    <UAlert v-if="error" class="mt-5" color="error" title="Не удалось загрузить историю" :description="error.message"><template #actions><UButton label="Повторить" :loading="loading" @click="load(loaded)" /></template></UAlert>
    <UButton v-else-if="nextCursor" label="Показать ещё" color="neutral" variant="outline" block size="xl" class="mt-6" :loading="loading" :disabled="loading" @click="load(true)" />
  </div>
</template>
