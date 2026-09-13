<script setup lang="ts">
import { useAuth } from '~/features/auth/composables/useAuth'
import ProgramDetail from '~/features/training-programs/components/ProgramDetail.vue'
import { useExerciseCatalog } from '~/features/training-programs/composables/useExerciseCatalog'
import { useTrainingPrograms } from '~/features/training-programs/composables/useTrainingPrograms'

const route = useRoute(); const id = Number(route.params.id); const toast = useToast()
const programs = useTrainingPrograms(); const catalog = useExerciseCatalog()
const program = computed(() => programs.findById(id))
const { status: authStatus } = useAuth()
watch(authStatus, (value) => {
  if (value === 'authenticated') void Promise.all([programs.load(), catalog.load()])
}, { immediate: true })
function start() {
  return navigateTo({ path: '/workout-session/prepare', query: { programId: id } })
}
async function remove() { try { await programs.remove(id); toast.add({ title: 'Тренировка удалена', color: 'success' }); await navigateTo('/programs', { replace: true }) } catch (cause) { toast.add({ title: (cause as { message: string }).message, color: 'error' }) } }
</script>

<template>
  <div v-if="programs.status.value === 'idle' || programs.status.value === 'pending'" class="space-y-5" aria-label="Загрузка программы">
    <USkeleton class="h-16 rounded-2xl" />
    <USkeleton class="h-72 rounded-[18px]" />
  </div>
  <UAlert
    v-else-if="programs.status.value === 'error'"
    title="Не удалось загрузить программу"
    :description="programs.error.value?.message"
    color="error"
    icon="i-lucide-circle-alert"
  >
    <template #actions>
      <UButton label="Повторить" color="error" variant="soft" size="lg" @click="programs.load(true)" />
      <UButton to="/programs" label="К списку программ" color="neutral" variant="ghost" size="lg" />
    </template>
  </UAlert>
  <UAlert v-else-if="!program" title="Программа не найдена" description="Возможно, она была удалена." color="warning">
    <template #actions><UButton to="/programs" label="К списку программ" /></template>
  </UAlert>
  <ProgramDetail
    v-else
    :program="program"
    :catalog="catalog.exercises.value"
    :start-pending="false"
    :delete-pending="programs.mutationPending.value"
    @start="start"
    @delete="remove"
  />
</template>
