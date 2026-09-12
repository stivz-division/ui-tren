<script setup lang="ts">
import type { DraftErrors } from '~/features/training-programs/model/form'
import ProgramForm from '~/features/training-programs/components/ProgramForm.vue'
import { useExerciseCatalog } from '~/features/training-programs/composables/useExerciseCatalog'
import { useProgramDraft } from '~/features/training-programs/composables/useProgramDraft'
import { useTrainingPrograms } from '~/features/training-programs/composables/useTrainingPrograms'
import { toUpdateProgramInput } from '~/features/training-programs/model/form'

const route = useRoute(); const programId = Number(route.params.id)
const programsState = useTrainingPrograms(); const catalog = useExerciseCatalog()
await programsState.load(); const program = computed(() => programsState.findById(programId))
const draftState = useProgramDraft(`edit:${programId}`, program.value ?? undefined)
const errors = shallowRef<DraftErrors>({}); const toast = useToast()
onMounted(() => void catalog.load())
onBeforeRouteLeave(() => !draftState.isDirty.value || window.confirm('Отменить изменения? Несохранённые данные будут потеряны.'))
async function submit() {
  const result = toUpdateProgramInput(draftState.draft.value); if (!result.ok) { errors.value = result.errors; return }
  try { const saved = await programsState.update(programId, result.value); draftState.reset(saved); toast.add({ title: 'Изменения сохранены', color: 'success' }); await navigateTo(`/programs/${programId}`) }
  catch (cause) { const error = cause as { fieldErrors?: DraftErrors, message: string }; errors.value = error.fieldErrors ?? {}; toast.add({ title: error.message, color: 'error' }) }
}
</script>

<template>
  <div><ScreenHeader title="Редактирование" back /><UAlert v-if="!program" title="Программа не найдена" color="warning"><template #actions><UButton to="/programs" label="К списку программ" /></template></UAlert><ProgramForm v-else v-model="draftState.draft.value" mode="edit" :occupied-weekdays="[]" :catalog="catalog.exercises.value" :catalog-unavailable="catalog.status.value === 'unavailable'" :errors="errors" :pending="programsState.mutationPending.value" @submit="submit" /></div>
</template>
