<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import { formatMoscowDate, getMoscowWeekday } from '~/utils/date'
import { useExerciseCatalog } from '../composables/useExerciseCatalog'
import { useTrainingPrograms } from '../composables/useTrainingPrograms'
import { buildHomeState } from '../model/home'
import RestDayCard from './RestDayCard.vue'
import TodayWorkoutCard from './TodayWorkoutCard.vue'
import UpcomingProgramCard from './UpcomingProgramCard.vue'

const { firstName } = useAuth()
const { programs, status, error, load } = useTrainingPrograms()
const catalog = useExerciseCatalog()
const now = new Date()
const home = computed(() => buildHomeState(getMoscowWeekday(now), programs.value))
const greeting = computed(() => firstName.value ? `Доброе утро, ${firstName.value}` : 'Доброе утро')

onMounted(() => {
  void Promise.all([load(), catalog.load()])
})
</script>

<template>
  <div>
    <ScreenHeader :title="greeting" :subtitle="formatMoscowDate(now)">
      <template #actions><UButton to="/programs/new" label="Создать" icon="i-lucide-plus" color="neutral" variant="ghost" size="lg" /></template>
    </ScreenHeader>
    <div v-if="status === 'pending' || status === 'idle'" class="space-y-6" aria-label="Загрузка расписания">
      <USkeleton class="h-72 rounded-[18px]" /><USkeleton class="h-28 rounded-[18px]" />
    </div>
    <UAlert v-else-if="status === 'error'" color="error" icon="i-lucide-circle-alert" title="Не удалось загрузить расписание" :description="error?.message">
      <template #actions><UButton label="Повторить" color="error" variant="soft" @click="load(true)" /></template>
    </UAlert>
    <div v-else class="space-y-10">
      <TodayWorkoutCard v-if="home.kind === 'workout'" :program="home.today" @start="navigateTo(`/programs/${home.today.id}`)" />
      <RestDayCard v-else />
      <UpcomingProgramCard v-if="home.next" :program="home.next.program" :days-until="home.next.daysUntil" :catalog="catalog.exercises.value" :detailed="home.kind === 'rest'" />
    </div>
  </div>
</template>
