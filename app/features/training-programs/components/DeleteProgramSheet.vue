<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
defineProps<{ weekday: string, pending: boolean }>()
defineEmits<{ confirm: [] }>()
</script>

<template>
  <UDrawer v-model:open="open" title="Удалить тренировку?" :dismissible="!pending">
    <template #body>
      <div class="mx-auto w-full max-w-[480px] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <p class="mb-6 text-base text-toned">Программа на {{ weekday.toLocaleLowerCase('ru-RU') }} будет удалена. Это действие нельзя отменить.</p>
        <div class="grid grid-cols-2 gap-3">
          <UButton label="Нет" color="neutral" variant="outline" block size="xl" :disabled="pending" @click="open = false" />
          <UButton label="Да, удалить" color="error" block size="xl" :loading="pending" :disabled="pending" @click="$emit('confirm')" />
        </div>
      </div>
    </template>
  </UDrawer>
</template>
