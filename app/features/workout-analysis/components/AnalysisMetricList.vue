<script setup lang="ts">
import type { AnalysisMetrics } from '#shared/types/workout-analysis'
import { formatAnalysisNumber } from '../model/stages'
defineProps<{ metrics: AnalysisMetrics }>()
const labels = { sets: 'Подходы', repetitions: 'Повторения', volume_kg: 'Объём, кг × повт.' }
</script>

<template>
  <div class="divide-y divide-default">
    <div v-for="(label, key) in labels" :key="key" class="py-3">
      <p class="mb-2 font-medium text-highlighted">{{ label }}</p>
      <dl class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-x-4 gap-y-2 break-words text-sm tabular-nums">
        <div><dt class="text-muted">План</dt><dd class="mt-1">{{ formatAnalysisNumber(metrics[key].planned) }}</dd></div>
        <div><dt class="text-muted">Факт</dt><dd class="mt-1 font-semibold">{{ formatAnalysisNumber(metrics[key].actual) }}</dd></div>
        <div><dt class="text-muted">Разница</dt><dd class="mt-1">{{ metrics[key].difference > 0 ? '+' : '' }}{{ formatAnalysisNumber(metrics[key].difference) }}</dd></div>
        <div><dt class="text-muted">Разница, %</dt><dd class="mt-1">{{ formatAnalysisNumber(metrics[key].percentage) }}{{ metrics[key].percentage === null ? '' : '%' }}</dd></div>
      </dl>
    </div>
  </div>
</template>
