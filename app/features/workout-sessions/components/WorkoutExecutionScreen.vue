<script setup lang="ts">
import { useWorkoutExecution } from '../composables/useWorkoutExecution'
import { EXERCISE_STATUS } from '../model/status'
import type { ExerciseAction } from '../api/sessions'
import WorkoutExerciseCard from './WorkoutExerciseCard.vue'

const workout = useWorkoutExecution()
const { session, loading, loaded, error: loadError } = workout.active
const { drafts, error, busy, acting, dirty, queued, canFinish, result } = workout
const selected = shallowRef(0)
const cancelOpen = shallowRef(false)
const carousel = useTemplateRef('carousel')
const exercises = computed(() => session.value?.exercises ?? [])
const processed = computed(() => exercises.value.filter(exercise => exercise.status !== 'pending').length)
const initialIndex = shallowRef(0)
watch(() => session.value?.id, () => {
  initialIndex.value = Math.max(0, exercises.value.findIndex(exercise => exercise.status === 'pending'))
  selected.value = initialIndex.value
}, { immediate: true })

function select(index: number) {
  carousel.value?.emblaApi?.scrollTo(index)
}
async function action(exerciseId: number, value: ExerciseAction) {
  if (await workout.exerciseAction(exerciseId, value) && value !== 'reopen') {
    const next = exercises.value.findIndex((exercise, index) => index > selected.value && exercise.status === 'pending')
    const first = exercises.value.findIndex(exercise => exercise.status === 'pending')
    if (next >= 0 || first >= 0) select(next >= 0 ? next : first)
  }
}
async function cancel() { if (await workout.finish('cancel')) cancelOpen.value = false }
</script>

<template>
  <div>
    <div v-if="session && !result" class="mb-3 flex flex-wrap items-start justify-between gap-4">
      <BackButton class="-ml-3 shrink-0" />
      <div role="group" aria-label="Действия тренировки" class="ml-auto flex gap-5">
        <div class="grid justify-items-center gap-1.5">
          <UButton
            aria-label="Завершить тренировку"
            :aria-describedby="!canFinish ? 'workout-finish-hint' : undefined"
            icon="i-lucide-flag"
            size="xl"
            class="size-12 justify-center rounded-full"
            :disabled="!canFinish"
            :loading="acting"
            @click="workout.finish('complete')"
          />
          <span class="text-xs font-medium text-muted" aria-hidden="true">Завершить</span>
        </div>
        <div class="grid justify-items-center gap-1.5">
          <UButton
            aria-label="Отменить тренировку"
            icon="i-lucide-x"
            color="error"
            variant="soft"
            size="xl"
            class="size-12 justify-center rounded-full"
            :disabled="busy"
            @click="cancelOpen = true"
          />
          <span class="text-xs font-medium text-muted" aria-hidden="true">Отменить</span>
        </div>
      </div>
    </div>
    <ScreenHeader :title="result ? 'Итоги тренировки' : session?.program_name ?? 'Тренировка'" :back="!session || Boolean(result)" class="mb-4!" />
    <section v-if="result" class="rounded-[18px] border border-default p-5">
      <UIcon :name="result.status === 'completed' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" class="mb-4 size-12" :class="result.status === 'completed' ? 'text-success' : 'text-warning'" />
      <h2 class="text-2xl font-bold text-highlighted">{{ result.status === 'completed' ? 'Тренировка завершена' : 'Тренировка отменена' }}</h2>
      <p class="mt-3 text-muted">{{ result.program_name }} · Завершено упражнений: {{ result.exercises.filter(exercise => exercise.status === 'completed').length }} из {{ result.exercises.length }}</p>
      <UButton to="/workout-history" label="История тренировок" block size="xl" class="mt-6" />
      <UButton to="/" label="На главную" color="neutral" variant="outline" block size="xl" class="mt-3" />
    </section>
    <USkeleton v-else-if="!loaded && loading" class="h-96 rounded-2xl" aria-label="Загрузка тренировки" />
    <UAlert v-else-if="!session" :title="loadError ? 'Не удалось загрузить тренировку' : 'Активной тренировки нет'" :description="loadError?.message" :color="loadError ? 'error' : 'neutral'">
      <template #actions><UButton v-if="loadError" label="Повторить" @click="workout.active.load" /><UButton to="/" label="На главную" color="neutral" variant="outline" /></template>
    </UAlert>
    <template v-else>
      <nav aria-label="Упражнения тренировки" class="mb-2 flex flex-wrap gap-2">
        <UButton v-for="(exercise, index) in exercises" :key="exercise.exercise_id" :aria-label="`Упражнение ${index + 1}: ${exercise.name}, ${EXERCISE_STATUS[exercise.status].label}`" :aria-current="selected === index ? 'step' : undefined" :color="EXERCISE_STATUS[exercise.status].color" :variant="selected === index ? 'solid' : 'soft'" :icon="exercise.status === 'pending' ? undefined : EXERCISE_STATUS[exercise.status].icon" :label="String(index + 1)" class="min-h-11 min-w-11 justify-center" :class="selected === index ? 'ring-2 ring-primary ring-offset-2 ring-offset-default' : ''" @click="select(index)" />
      </nav>
      <p class="mb-4 text-xs text-muted">Нажмите на номер или листайте упражнения свайпом</p>
      <nav aria-label="Переключение упражнений" class="mb-5 flex items-center justify-between gap-3">
        <UButton aria-label="Предыдущее упражнение" icon="i-lucide-chevron-left" color="neutral" variant="outline" size="xl" class="size-12 shrink-0 justify-center rounded-full" :disabled="selected === 0" @click="select(selected - 1)" />
        <p class="min-w-0 flex-1 break-words text-center text-sm font-medium text-highlighted" role="status" aria-atomic="true">Упражнение <span class="tabular-nums">{{ selected + 1 }} из {{ exercises.length }}</span></p>
        <UButton aria-label="Следующее упражнение" icon="i-lucide-chevron-right" color="neutral" variant="outline" size="xl" class="size-12 shrink-0 justify-center rounded-full" :disabled="selected >= exercises.length - 1" @click="select(selected + 1)" />
      </nav>
      <UAlert v-if="error || loadError" class="mb-5" color="error" :title="error?.message ?? loadError?.message">
        <template #actions>
          <UButton v-if="error" label="Повторить сохранение" :disabled="busy" @click="workout.recover" />
          <UButton label="Загрузить сохранённое" color="neutral" variant="outline" :disabled="busy" @click="workout.reload" />
        </template>
      </UAlert>
      <UCarousel :key="session.id" ref="carousel" v-slot="{ item: exercise, index }" :items="exercises" :start-index="initialIndex" :watch-focus="false" :ui="{ item: 'basis-full', container: 'items-start' }" @select="selected = $event">
        <div :inert="selected !== index" :aria-hidden="selected !== index">
          <WorkoutExerciseCard v-if="drafts[exercise.exercise_id]" :exercise="exercise" :rows="drafts[exercise.exercise_id]!.rows" :errors="workout.errorsFor(exercise.exercise_id)" :locked="acting || loading" :saving="queued > 0 && drafts[exercise.exercise_id]!.dirty" :dirty="drafts[exercise.exercise_id]!.dirty" :blocked="Boolean(error)" @edit="workout.edit(exercise.exercise_id, $event)" @action="action(exercise.exercise_id, $event)" />
        </div>
      </UCarousel>
      <div class="mt-5 flex items-center justify-between gap-3 text-sm text-muted"><span>Выполнено или пропущено</span><span class="font-semibold text-highlighted">{{ processed }} / {{ exercises.length }}</span></div>
      <p v-if="!canFinish" id="workout-finish-hint" class="mt-5 text-sm text-muted">{{ dirty ? 'Дождитесь сохранения или исправьте введённые данные.' : 'Завершите или пропустите каждое упражнение, чтобы закончить тренировку.' }}</p>
      <UModal v-model:open="cancelOpen" title="Отменить тренировку?" description="Тренировка останется в истории как отменённая. Продолжить её будет нельзя." :dismissible="!acting" :close="!acting">
        <template #footer><div class="grid w-full grid-cols-2 gap-3"><UButton label="Продолжить" color="neutral" variant="outline" block size="xl" :disabled="acting" @click="cancelOpen = false" /><UButton label="Да, отменить" color="error" block size="xl" :loading="acting" :disabled="acting" @click="cancel" /></div></template>
      </UModal>
    </template>
  </div>
</template>
