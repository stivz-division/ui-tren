<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import { useActiveWorkoutSession } from '../composables/useActiveWorkoutSession'
const active = useActiveWorkoutSession()
function resume() { if (document.visibilityState === 'visible') void active.load() }
const { status: authStatus } = useAuth()
watch(authStatus, (status) => { if (status === 'authenticated') void active.load() }, { immediate: true })
onMounted(() => {
  document.addEventListener('visibilitychange', resume)
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', resume))
</script>

<template>
  <UAlert v-if="active.session.value" class="mb-6" color="primary" variant="subtle" icon="i-lucide-activity" title="У вас есть активная тренировка" :description="active.session.value.program_name">
    <template #actions><UButton to="/workout-session" label="Продолжить тренировку" size="lg" class="min-h-11" /></template>
  </UAlert>
  <UAlert v-else-if="active.error.value" class="mb-6" color="warning" title="Не удалось проверить активную тренировку" :description="active.error.value.message">
    <template #actions><UButton label="Проверить снова" color="neutral" variant="outline" :loading="active.loading.value" @click="active.load" /></template>
  </UAlert>
</template>
