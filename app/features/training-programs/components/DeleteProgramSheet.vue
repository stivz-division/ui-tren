<script setup lang="ts">
import { useTelegram } from '~/features/auth/composables/useTelegram'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ weekday: string, pending: boolean }>()
const emit = defineEmits<{ confirm: [] }>()
const { getWebApp } = useTelegram()
const confirmed = shallowRef(false)

function closeFromTelegramBack() {
  if (!props.pending) open.value = false
}

function removeTelegramBackHandler() {
  const backButton = getWebApp()?.BackButton
  backButton?.offClick(closeFromTelegramBack)
  backButton?.hide()
}

function confirmDelete() {
  if (props.pending || confirmed.value) return
  confirmed.value = true
  emit('confirm')
}

watch(open, (isOpen) => {
  const backButton = getWebApp()?.BackButton
  if (isOpen) {
    confirmed.value = false
    backButton?.onClick(closeFromTelegramBack)
    backButton?.show()
  }
  else {
    removeTelegramBackHandler()
  }
})

watch(() => props.pending, (pending, wasPending) => {
  if (wasPending && !pending && open.value) confirmed.value = false
})

onBeforeUnmount(removeTelegramBackHandler)
</script>

<template>
  <UDrawer v-model:open="open" title="Удалить тренировку?" :dismissible="!pending">
    <template #body>
      <div class="mx-auto w-full max-w-[480px] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <p class="mb-6 text-base text-toned">Программа на {{ weekday.toLocaleLowerCase('ru-RU') }} будет удалена. Это действие нельзя отменить.</p>
        <div class="grid grid-cols-2 gap-3">
          <UButton label="Нет" color="neutral" variant="outline" block size="xl" :disabled="pending" @click="open = false" />
          <UButton label="Да, удалить" color="error" block size="xl" :loading="pending" :disabled="pending || confirmed" @click="confirmDelete" />
        </div>
      </div>
    </template>
  </UDrawer>
</template>
