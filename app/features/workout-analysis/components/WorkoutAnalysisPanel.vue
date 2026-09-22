<script setup lang="ts">
import { useWorkoutAnalysis } from '../composables/useWorkoutAnalysis'
import WorkoutAnalysisContent from './WorkoutAnalysisContent.vue'
import RecommendationList from './RecommendationList.vue'
const props = defineProps<{ sessionId: number, recommendationsOnly?: boolean, disabled?: boolean }>()
const analysis = useWorkoutAnalysis(() => props.sessionId)
const entry = analysis.current
</script>

<template>
  <div class="space-y-5">
    <div class="flex justify-end">
      <UButton label="Обновить" icon="i-lucide-refresh-cw" variant="soft" color="neutral" class="min-h-11" :loading="entry?.loading" :disabled="analysis.busy.value || disabled" @click="analysis.refresh" />
    </div>
    <p v-if="entry?.unavailable" role="status" class="text-toned">Анализ этой тренировки недоступен.</p>
    <UAlert v-else-if="entry?.error" color="warning" :title="entry.error" />
    <USkeleton v-else-if="!entry?.data" class="h-32 rounded-[18px] motion-reduce:animate-none" />
    <template v-if="entry?.data">
      <WorkoutAnalysisContent v-if="!recommendationsOnly" :analysis="entry.data" />
      <UAlert v-if="entry.notice" :color="entry.noticeIsError ? 'warning' : 'success'" :title="entry.notice" role="status" />
      <p v-if="entry.stale" class="text-toned">Данные изменились. Обновите анализ, чтобы проверить актуальность рекомендаций.</p>
      <RecommendationList :analysis="entry.data" :acting="analysis.acting.value" :disabled="!!disabled || analysis.busy.value || entry.stale || entry.uncertain || !!entry.error || entry.loading" :proposed-only="recommendationsOnly" @action="(id, action) => analysis.act(sessionId, id, action)" />
    </template>
  </div>
</template>
