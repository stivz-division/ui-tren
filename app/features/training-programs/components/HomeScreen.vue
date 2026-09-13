<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import { useLocalClock } from '~/composables/useLocalClock'
import { formatDate, getGreeting, getWeekday } from '~/utils/date'
import { useExerciseCatalog } from '../composables/useExerciseCatalog'
import { useTrainingPrograms } from '../composables/useTrainingPrograms'
import { buildHomeState } from '../model/home'
import { ActiveWorkoutBanner, useActiveWorkoutSession } from '~/features/workout-sessions'
import RestDayCard from './RestDayCard.vue'
import TodayWorkoutCard from './TodayWorkoutCard.vue'
import UpcomingProgramCard from './UpcomingProgramCard.vue'

const { firstName, status: authStatus } = useAuth()
const { programs, status, error, load } = useTrainingPrograms()
const { session: activeSession } = useActiveWorkoutSession()
const catalog = useExerciseCatalog()
const clock = useLocalClock()
const home = computed(() => clock.value
  ? buildHomeState(getWeekday(clock.value.now, clock.value.timeZone), programs.value)
  : null)
const dateLabel = computed(() => clock.value
  ? formatDate(clock.value.now, clock.value.timeZone)
  : undefined)
const greeting = computed(() => {
  const value = clock.value ? getGreeting(clock.value.now, clock.value.timeZone) : 'Здравствуйте'
  return firstName.value ? `${value}, ${firstName.value}` : value
})

watch(authStatus, (value) => {
  if (value === 'authenticated') void Promise.all([load(), catalog.load()])
}, { immediate: true })

function startTodayWorkout(programId: number) {
  return navigateTo({ path: '/workout-session/prepare', query: { programId } })
}
</script>

<template>
  <div>
    <ScreenHeader :title="greeting" :subtitle="dateLabel">
      <template #actions><UButton to="/programs/new" label="Создать" icon="i-lucide-plus" color="neutral" variant="ghost" size="lg" class="min-h-11" /></template>
    </ScreenHeader>
    <ActiveWorkoutBanner />
    <div v-if="status === 'pending' || status === 'idle'" class="space-y-6" aria-label="Загрузка расписания">
      <USkeleton class="h-72 rounded-[18px]" /><USkeleton class="h-28 rounded-[18px]" />
    </div>
    <UAlert v-else-if="status === 'error'" color="error" icon="i-lucide-circle-alert" title="Не удалось загрузить расписание" :description="error?.message">
      <template #actions><UButton label="Повторить" color="error" variant="soft" size="lg" class="min-h-11" @click="load(true)" /></template>
    </UAlert>
    <div v-else-if="home" class="space-y-10">
      <TodayWorkoutCard v-if="home.kind === 'workout' && !activeSession" :program="home.today" :pending="false" @start="startTodayWorkout(home.today.id)" />
      <RestDayCard v-else-if="home.kind === 'rest'" />
      <UpcomingProgramCard v-if="home.next" :program="home.next.program" :days-until="home.next.daysUntil" :catalog="catalog.exercises.value" :detailed="home.kind === 'rest'" />
    </div>
  </div>
</template>
