<script setup lang="ts">
import type { DraftErrors } from '~/features/training-programs/model/form'
import ProgramForm from '~/features/training-programs/components/ProgramForm.vue'
import { useExerciseCatalog } from '~/features/training-programs/composables/useExerciseCatalog'
import { useProgramDraft } from '~/features/training-programs/composables/useProgramDraft'
import { useTrainingPrograms } from '~/features/training-programs/composables/useTrainingPrograms'
import { toCreateProgramInput } from '~/features/training-programs/model/form'

const programsState = useTrainingPrograms()
const catalog = useExerciseCatalog()
const { draft, isDirty, markSaved } = useProgramDraft('create')
const errors = shallowRef<DraftErrors>({})
const toast = useToast()

onMounted(() => void Promise.all([programsState.load(), catalog.load()]))
onBeforeRouteLeave(() => !isDirty.value || window.confirm('Отменить изменения? Несохранённые данные будут потеряны.'))

async function submit() {
  const result = toCreateProgramInput(draft.value)
  if (!result.ok) { errors.value = result.errors; return }
  try {
    const program = await programsState.create(result.value)
    markSaved(); toast.add({ title: 'Тренировка создана', color: 'success' })
    await navigateTo(`/programs/${program.id}`)
  }
  catch (cause) { const error = cause as { fieldErrors?: DraftErrors, message: string }; errors.value = error.fieldErrors ?? {}; toast.add({ title: error.message, color: 'error' }) }
}
</script>

<template>
  <div><ScreenHeader title="Новая тренировка" back /><ProgramForm v-model="draft" mode="create" :occupied-weekdays="programsState.programs.value.map(item => item.weekday)" :catalog="catalog.exercises.value" :catalog-unavailable="catalog.status.value === 'unavailable'" :errors="errors" :pending="programsState.mutationPending.value" @submit="submit" /></div>
</template>
