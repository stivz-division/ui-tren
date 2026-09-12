<script setup lang="ts">
import { ru } from '@nuxt/ui/locale'
</script>

<template>
  <UApp :locale="ru">
    <AuthGate>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </AuthGate>
  </UApp>
</template>
