<script setup lang="ts">
import WorkoutPreparationScreen from '~/features/training-programs/components/WorkoutPreparationScreen.vue'
const route = useRoute()
const programId = computed(() => Number(route.query.programId))
</script>

<template>
  <WorkoutPreparationScreen :key="programId" :program-id="programId" />
</template>
