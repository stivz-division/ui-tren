<script setup lang="ts">
import ProgramDetail from '~/features/training-programs/components/ProgramDetail.vue'
import { useExerciseCatalog } from '~/features/training-programs/composables/useExerciseCatalog'
import { useTrainingPrograms } from '~/features/training-programs/composables/useTrainingPrograms'
import { useActiveWorkoutSession } from '~/features/workout-sessions/composables/useActiveWorkoutSession'

const route = useRoute(); const id = Number(route.params.id); const toast = useToast()
const programs = useTrainingPrograms(); const catalog = useExerciseCatalog(); const active = useActiveWorkoutSession()
await programs.load(); const program = computed(() => programs.findById(id)); onMounted(() => void catalog.load())
async function start() { try { await active.start(id); await navigateTo('/workout-session') } catch (cause) { toast.add({ title: (cause as { message: string }).message, color: 'error' }) } }
async function remove() { try { await programs.remove(id); toast.add({ title: 'Тренировка удалена', color: 'success' }); await navigateTo('/programs', { replace: true }) } catch (cause) { toast.add({ title: (cause as { message: string }).message, color: 'error' }) } }
</script>

<template><UAlert v-if="!program" title="Программа не найдена" description="Возможно, она была удалена." color="warning"><template #actions><UButton to="/programs" label="К списку программ" /></template></UAlert><ProgramDetail v-else :program="program" :catalog="catalog.exercises.value" :start-pending="active.pending.value" :delete-pending="programs.mutationPending.value" @start="start" @delete="remove" /></template>
