<script setup lang="ts">
import type { WorkoutAnalysis } from '#shared/types/workout-analysis'
import type { RecommendationAction } from '../api/analysis'
import { stageMessage } from '../model/stages'
import { useExerciseCatalog } from '~/features/training-programs'
import RecommendationCard from './RecommendationCard.vue'
const props = defineProps<{ analysis: WorkoutAnalysis, acting: number | null, disabled: boolean, proposedOnly?: boolean }>()
defineEmits<{ action: [id: number, action: RecommendationAction] }>()
const catalog = useExerciseCatalog()
const generation = computed(() => props.analysis.recommendation_generation)
const items = computed(() => (generation.value?.items ?? []).filter(item => !props.proposedOnly || item.status === 'proposed'))
const names = computed(() => new Map(props.analysis.result?.exercises.map(exercise => [exercise.exercise_id, exercise.name])))
watch(() => items.value.some(item => item.change_type === 'replacement'), (needed) => { if (needed) void catalog.load() }, { immediate: true })
</script>

<template>
  <section class="space-y-4" aria-label="Рекомендации">
    <h2 v-if="!proposedOnly" class="text-xl font-bold text-highlighted">Рекомендации</h2>
    <p class="text-sm leading-relaxed text-muted">Изменения применяются к программе для будущих тренировок. История и план уже начатой тренировки сохраняются.</p>
    <UAlert v-if="generation?.status === 'failed'" color="warning" title="Не удалось подготовить рекомендации" />
    <template v-else-if="generation?.status === 'completed' && generation.items !== null">
      <p v-if="!generation.items.length" class="whitespace-pre-wrap break-words text-default">{{ generation.no_change_reason || 'Изменений программы не предложено.' }}</p>
      <p v-else-if="!items.length" class="text-toned">Нет неприменённых предложений.</p>
      <UAlert v-if="catalog.error.value && items.some(item => item.change_type === 'replacement')" color="warning" title="Не удалось загрузить название замены">
        <template #actions><UButton label="Загрузить названия" class="min-h-11" @click="catalog.load(true)" /></template>
      </UAlert>
      <RecommendationCard v-for="item in items" :key="item.id" :item="item" :exercise-name="names.get(item.exercise_id) ?? 'Название упражнения недоступно'" :replacement-name="catalog.exercises.value.find(exercise => exercise.id === item.replacement_exercise_id)?.name" :pending="acting === item.id" :disabled="disabled" @action="(id, action) => $emit('action', id, action)" />
    </template>
    <p v-else role="status" class="text-toned">{{ stageMessage(generation?.status, analysis.status === 'failed' || analysis.ai_analysis?.status === 'failed') }}</p>
  </section>
</template>
