<script setup lang="ts">
import { WorkoutAnalysisPanel } from '~/features/workout-analysis'
const route = useRoute()
const sessionId = computed(() => Number(route.params.id))
const validId = computed(() => Number.isSafeInteger(sessionId.value) && sessionId.value > 0)
</script>

<template>
  <div>
    <ScreenHeader title="Анализ тренировки" back />
    <WorkoutAnalysisPanel v-if="validId" :key="sessionId" :session-id="sessionId" />
    <UAlert v-else title="Тренировка не найдена" color="warning" />
  </div>
</template>
