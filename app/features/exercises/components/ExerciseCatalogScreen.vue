<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
import { useExerciseCatalog } from '../composables/useExerciseCatalog'
import ExerciseCatalogList from './ExerciseCatalogList.vue'
import ExerciseDetailsModal from './ExerciseDetailsModal.vue'

const { exercises, status, error, load } = useExerciseCatalog()
const query = ref('')
const selected = shallowRef<Exercise | null>(null)
const open = shallowRef(false)
const normalize = (value: string) => value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е')
const filtered = computed(() => exercises.value.filter(exercise => normalize(exercise.name).includes(normalize(query.value))))
function select(exercise: Exercise) {
  selected.value = exercise
  open.value = true
}
onMounted(() => { void load() })
</script>

<template>
  <div>
    <ScreenHeader title="Упражнения" subtitle="Справочник и техника выполнения" />
    <UInput v-model="query" type="search" aria-label="Поиск упражнения" placeholder="Поиск упражнения…" icon="i-lucide-search" size="xl" class="mb-5 w-full" />
    <div v-if="status === 'idle' || status === 'pending'" aria-label="Загрузка упражнений" class="space-y-3"><USkeleton v-for="i in 4" :key="i" class="h-20 rounded-2xl" /></div>
    <UAlert v-else-if="error" title="Не удалось загрузить упражнения" :description="error.message" color="warning"><template #actions><UButton label="Повторить" @click="load(true)" /></template></UAlert>
    <template v-else>
      <p class="mb-3 text-sm text-muted" role="status">Найдено: {{ filtered.length }}</p>
      <ExerciseCatalogList v-if="filtered.length" :exercises="filtered" @select="select" />
      <UAlert v-else :title="exercises.length ? 'Ничего не найдено' : 'Упражнений пока нет'" :description="exercises.length ? 'Попробуйте изменить поисковый запрос.' : 'Упражнения появятся здесь после добавления в каталог.'" color="neutral" />
    </template>
    <ExerciseDetailsModal v-if="selected" v-model:open="open" :exercise-id="selected.id" :name="selected.name" />
  </div>
</template>
