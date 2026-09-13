<script setup lang="ts">
import type { PlannedSet } from '#shared/types/api-tren'
import { formatSetSummary, formatWeight, groupAdjacentSets } from '../model/program'

const props = defineProps<{ sets: PlannedSet[], prominent?: boolean }>()
const summary = computed(() => formatSetSummary(props.sets))
const groups = computed(() => groupAdjacentSets(props.sets))
</script>

<template>
  <span v-if="prominent" class="flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
    <span
      v-for="(group, index) in groups"
      :key="index"
      class="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 text-base leading-5"
    >
      <span class="font-bold text-highlighted">
        <span class="sr-only">Подходы × повторения: </span>{{ group.count }}<span class="font-normal text-toned">×</span>{{ group.repetitions }}
      </span>
      <span v-if="group.weight > 0" aria-hidden="true" class="text-toned">·</span>
      <span v-if="group.weight > 0" class="font-bold text-[var(--ui-color-primary-800)] dark:text-[var(--ui-color-primary-200)]">
        <span class="sr-only">Рабочий вес: </span>{{ formatWeight(group.weight) }} <span class="text-sm font-medium">кг</span>
      </span>
      <span v-else class="sr-only">Без веса</span>
    </span>
  </span>
  <span v-else class="tabular-nums">{{ summary }}</span>
</template>
