<script setup lang="ts">
import type { WorkoutRecommendation } from '#shared/types/workout-analysis'
import { compareSets } from '../model/stages'
import type { RecommendationAction } from '../api/analysis'
import SetComparisonList from './SetComparisonList.vue'
const props = defineProps<{ item: WorkoutRecommendation, exerciseName: string, replacementName?: string, pending: boolean, disabled: boolean }>()
defineEmits<{ action: [id: number, action: RecommendationAction] }>()
const rows = computed(() => compareSets(props.item.original_sets, props.item.proposed_sets))
const types = { progression: 'Прогрессия нагрузки', adjustment: 'Корректировка нагрузки', replacement: 'Замена упражнения' }
const statuses = { proposed: 'Предложено', applied: 'Применено к программе', rejected: 'Отклонено', expired: 'Больше не актуально' }
</script>

<template>
  <article class="rounded-[18px] border border-default bg-elevated p-4" :aria-label="`Рекомендация: ${exerciseName}`">
    <p class="mb-2 text-sm font-medium text-toned">{{ types[item.change_type] }}</p>
    <h3 class="break-words text-lg font-semibold text-highlighted">{{ exerciseName }}</h3>
    <p v-if="item.change_type === 'replacement'" class="mt-2 break-words text-default">Заменить на: {{ replacementName ?? 'Название упражнения недоступно' }}</p>
    <p class="mt-2 text-sm font-medium text-toned">{{ statuses[item.status] }}</p>
    <SetComparisonList class="mt-3" :rows="rows" before-label="Было" after-label="Предложено" />
    <p class="mt-3 whitespace-pre-wrap break-words leading-relaxed text-default">{{ item.rationale }}</p>
    <div v-if="item.status === 'proposed'" class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3">
      <UButton label="Применить" class="min-h-11 justify-center" :ui="{ label: 'whitespace-normal' }" :loading="pending" :disabled="disabled || pending" @click="$emit('action', item.id, 'apply')" />
      <UButton label="Отклонить" variant="soft" color="neutral" class="min-h-11 justify-center" :ui="{ label: 'whitespace-normal' }" :disabled="disabled || pending" @click="$emit('action', item.id, 'reject')" />
    </div>
  </article>
</template>
