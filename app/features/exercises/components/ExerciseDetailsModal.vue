<script setup lang="ts">
import { useExerciseDetails } from '../composables/useExerciseDetails'
import ExerciseVideo from './ExerciseVideo.vue'

const props = defineProps<{ exerciseId: number, name: string }>()
const open = defineModel<boolean>('open', { required: true })
const { exercise, loading, error, load } = useExerciseDetails(() => props.exerciseId, () => open.value)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="exercise?.name ?? name"
    description="Техника выполнения упражнения"
    :ui="{
      content: 'max-w-lg',
      wrapper: 'min-w-0 flex-1',
      title: 'break-words',
      close: 'static size-11 shrink-0 items-center justify-center p-0',
    }"
  >
    <slot />
    <template #body>
      <div v-if="open" class="space-y-5">
        <div v-if="loading" role="status" aria-label="Загрузка упражнения" class="space-y-4">
          <USkeleton class="h-52 rounded-xl" />
          <USkeleton class="h-20 rounded-xl" />
        </div>
        <UAlert v-else-if="error" color="warning" :title="error.status === 404 ? 'Упражнение больше недоступно' : 'Не удалось загрузить упражнение'" :description="error.message">
          <template #actions><UButton label="Повторить" @click="load" /></template>
        </UAlert>
        <template v-else-if="exercise">
          <ExerciseVideo :url="exercise.video_url" :name="exercise.name" />
          <div>
            <h3 class="mb-2 font-semibold text-highlighted">Описание</h3>
            <p class="whitespace-pre-wrap break-words leading-relaxed text-default">{{ exercise.description?.trim() || 'Описание пока не добавлено' }}</p>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
