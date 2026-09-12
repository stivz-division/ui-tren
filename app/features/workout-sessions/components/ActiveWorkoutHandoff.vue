<script setup lang="ts">
import { useActiveWorkoutSession } from '../composables/useActiveWorkoutSession'
const { session } = useActiveWorkoutSession()
</script>

<template>
  <div><ScreenHeader title="Активная тренировка" back fallback="/" /><UAlert v-if="!session" title="Активная тренировка не найдена" description="Вернитесь к программе и запустите тренировку снова." color="warning"><template #actions><UButton to="/" label="На главную" /></template></UAlert><section v-else class="rounded-[18px] border border-default bg-elevated p-5"><UBadge color="success" variant="subtle">Тренировка начата</UBadge><h2 class="mt-4 text-2xl font-bold text-highlighted">{{ session.program_name }}</h2><p class="mt-2 text-base text-muted">{{ session.exercises.length }} упражнений. Экран выполнения будет реализован отдельной задачей.</p></section></div>
</template>
