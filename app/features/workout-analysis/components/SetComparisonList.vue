<script setup lang="ts">
import type { SetComparison } from '#shared/types/workout-analysis'
import { formatAnalysisNumber } from '../model/stages'
withDefaults(defineProps<{ rows: SetComparison[], beforeLabel?: string, afterLabel?: string }>(), {
  beforeLabel: 'План', afterLabel: 'Факт',
})
</script>

<template>
  <ol class="divide-y divide-default">
    <li v-for="row in rows" :key="row.position" class="py-3">
      <p class="mb-2 text-sm font-semibold text-highlighted">Подход {{ row.position }}</p>
      <dl class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3 text-sm tabular-nums">
        <div v-for="side in (['planned', 'actual'] as const)" :key="side" class="min-w-0">
          <dt class="break-words text-muted">{{ side === 'planned' ? beforeLabel : afterLabel }}</dt>
          <dd v-if="row[side]" class="mt-1 break-words text-default">{{ formatAnalysisNumber(row[side].repetitions) }} повт. · {{ formatAnalysisNumber(row[side].working_weight_kg) }} кг</dd>
          <dd v-else class="mt-1 text-muted">Нет подхода</dd>
        </div>
      </dl>
    </li>
  </ol>
</template>
