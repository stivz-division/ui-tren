<script setup lang="ts">
import type { Exercise } from '#shared/types/api-tren'
import type { ExerciseDraft } from '../model/form'
import { buildImportedExercises, MAX_IMPORT_TEXT_LENGTH, parseExerciseText, validateImportedExercises, type ExerciseImportRow } from '../model/text-import'
import ExerciseImportRowView from './ExerciseImportRow.vue'
import { logger } from '~/utils/logger'

const props = defineProps<{ catalog: Exercise[], existingIds: number[], disabled: boolean }>()
const emit = defineEmits<{ import: [exercises: ExerciseDraft[]] }>()
const open = ref(false)
const text = ref('')
const rows = ref<ExerciseImportRow[]>([])
const parseError = ref<string>()
const preview = ref(false)
const fieldId = useId()
const textInput = useTemplateRef<HTMLTextAreaElement>('textInput')
const previewElement = useTemplateRef<HTMLElement>('previewElement')
const errors = computed(() => validateImportedExercises(rows.value, props.catalog, props.existingIds))
const totalSets = computed(() => rows.value.reduce((total, row) => total + (row.error ? 0 : row.setCount), 0))
const canImport = computed(() => preview.value && rows.value.length > 0 && !props.disabled && Object.keys(errors.value).length === 0)
const excludedIds = computed(() => [...props.existingIds, ...rows.value.flatMap(row => row.exerciseId === null ? [] : [row.exerciseId])])

watch(open, (value) => {
  if (!value) return
  text.value = ''
  rows.value = []
  parseError.value = undefined
  preview.value = false
})

async function parse() {
  if (props.disabled) return
  const result = parseExerciseText(text.value, props.catalog)
  rows.value = result.rows
  parseError.value = result.error
  preview.value = result.rows.length > 0
  logger.debug('program_text_import_parsed', { rows: result.rows.length, invalidRows: Object.keys(errors.value).length, rejected: Boolean(result.error) })
  await nextTick()
  if (preview.value) previewElement.value?.focus()
  else textInput.value?.focus()
}

async function editText() {
  preview.value = false
  rows.value = []
  await nextTick()
  textInput.value?.focus()
}

function apply() {
  if (!canImport.value) return
  const result = buildImportedExercises(rows.value, props.catalog, props.existingIds)
  if (Object.keys(result.errors).length || result.exercises.length === 0) return
  logger.debug('program_text_import_applied', { exercises: result.exercises.length, sets: totalSets.value })
  emit('import', result.exercises)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Добавить из текста"
    description="Упражнения добавятся в конец списка. Сохранить программу можно после проверки."
    :ui="{ content: 'max-w-lg', header: 'shrink-0', body: 'min-h-0', footer: 'shrink-0' }"
  >
    <UButton type="button" label="Добавить из текста" icon="i-lucide-text-cursor-input" color="neutral" variant="soft" block size="xl" class="mt-3" :disabled="disabled" />
    <template #body>
      <div v-if="!preview" class="space-y-3">
        <label :for="fieldId" class="block font-medium text-highlighted">Список упражнений</label>
        <p :id="`${fieldId}-hint`" class="text-sm text-toned">По одному упражнению на строку: название — подходы × повторения — вес в кг. Например:</p>
        <p class="rounded-lg bg-elevated p-3 text-sm text-toned">1. Тяга Т-грифа — 3 × 8 — 10 кг</p>
        <textarea
          :id="fieldId"
          ref="textInput"
          v-model="text"
          rows="8"
          class="w-full resize-y rounded-xl border border-default bg-default p-3 text-base focus-visible:outline-2 focus-visible:outline-primary"
          placeholder="Вставьте список упражнений…"
          :aria-invalid="Boolean(parseError)"
          :aria-describedby="`${fieldId}-hint${parseError ? ` ${fieldId}-error` : ''}`"
          @input="parseError = undefined"
        />
        <p class="text-xs text-muted">До 100 строк и {{ MAX_IMPORT_TEXT_LENGTH.toLocaleString('ru-RU') }} символов.</p>
        <p v-if="parseError" :id="`${fieldId}-error`" class="text-sm text-error" role="alert">{{ parseError }}</p>
      </div>
      <section v-else ref="previewElement" tabindex="-1" aria-label="Результат разбора" class="space-y-4 focus:outline-none">
        <p class="font-medium text-highlighted" aria-live="polite">Упражнений: {{ rows.length }} · Подходов: {{ totalSets }}</p>
        <p class="text-sm text-toned">Проверьте выбранные упражнения и нагрузку. Для исправления чисел вернитесь к тексту.</p>
        <p v-if="Object.keys(errors).length" class="text-sm text-error" role="status">Исправьте отмеченные строки или выберите упражнения из каталога.</p>
        <ol class="space-y-3">
          <ExerciseImportRowView v-for="row in rows" :key="row.line" v-model="row.exerciseId" :row="row" :catalog="catalog" :excluded-ids="excludedIds" :error="errors[row.line]" />
        </ol>
      </section>
      <p v-if="disabled" class="mt-3 text-sm text-error" role="alert">Импорт недоступен. Проверьте загрузку каталога и дождитесь завершения сохранения.</p>
    </template>
    <template #footer>
      <div class="w-full space-y-2">
        <UButton v-if="preview" type="button" label="Добавить упражнения" block size="xl" :disabled="!canImport" @click="apply" />
        <UButton v-else type="button" label="Разобрать" block size="xl" :disabled="disabled" @click="parse" />
        <div class="flex gap-2">
          <UButton v-if="preview" type="button" label="Изменить текст" color="neutral" variant="outline" block size="lg" class="min-h-11" :ui="{ label: 'whitespace-normal' }" @click="editText" />
          <UButton type="button" label="Отмена" color="neutral" variant="ghost" block size="lg" @click="open = false" />
        </div>
      </div>
    </template>
  </UModal>
</template>
