<script setup lang="ts">
import type { WorkoutAnalysis } from '#shared/types/workout-analysis'
import { stageMessage } from '../model/stages'
import AnalysisMetricList from './AnalysisMetricList.vue'
import SetComparisonList from './SetComparisonList.vue'
const props = defineProps<{ analysis: WorkoutAnalysis }>()
const exercises = computed(() => [...(props.analysis.result?.exercises ?? [])].sort((a, b) => a.position - b.position))
const conclusions = { current_workout: 'Вывод по тренировке', history: 'В контексте истории' }
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-[18px] border border-default bg-elevated p-4" aria-label="План и факт">
      <h2 class="text-xl font-bold text-highlighted">План и факт</h2>
      <template v-if="analysis.status === 'completed' && analysis.result">
        <AnalysisMetricList :metrics="analysis.result" />
        <p class="mt-3 text-sm text-toned">Завершено упражнений: {{ analysis.result.completed_exercises }} · Пропущено: {{ analysis.result.skipped_exercises }}</p>
        <p class="mt-2 text-sm text-muted">Объём — сумма веса × повторения, а не вес снаряда.</p>
        <details v-for="exercise in exercises" :key="exercise.exercise_id" class="mt-4 border-t border-default pt-2">
          <summary class="min-h-11 cursor-pointer py-3 font-semibold text-highlighted">{{ exercise.name }}</summary>
          <p class="text-sm text-toned">{{ exercise.status === 'skipped' ? 'Пропущено' : 'Завершено' }} · {{ exercise.plan_fulfilled ? 'План выполнен' : 'План не выполнен' }}</p>
          <AnalysisMetricList :metrics="exercise" />
          <SetComparisonList :rows="exercise.set_comparisons" />
        </details>
      </template>
      <p v-else class="mt-3 text-toned" role="status">{{ analysis.status === 'failed' ? 'Не удалось сравнить план и факт' : stageMessage(analysis.status) }}</p>
    </section>
    <section v-for="(title, key) in conclusions" :key="key" class="rounded-[18px] border border-default bg-elevated p-4" :aria-label="title">
      <h2 class="text-xl font-bold text-highlighted">{{ title }}</h2>
      <p v-if="analysis.ai_analysis?.status === 'completed' && analysis.ai_analysis.result" class="mt-3 whitespace-pre-wrap break-words leading-relaxed text-default">{{ analysis.ai_analysis.result[key] }}</p>
      <p v-else class="mt-3 text-toned" role="status">{{ analysis.ai_analysis?.status === 'failed' ? 'Не удалось подготовить заключение' : stageMessage(analysis.ai_analysis?.status, analysis.status === 'failed') }}</p>
    </section>
  </div>
</template>
