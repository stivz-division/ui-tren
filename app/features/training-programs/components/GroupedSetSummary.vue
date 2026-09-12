<script setup lang="ts">
import type { PlannedSet } from '#shared/types/api-tren'
import { formatSetSummary } from '../model/program'

const props = defineProps<{ sets: PlannedSet[] }>()
const summary = computed(() => formatSetSummary(props.sets))
</script>

<template>
  <span class="tabular-nums">{{ summary }}</span>
</template>
