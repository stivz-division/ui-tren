<script setup lang="ts">
useSeoMeta({
  title: 'UI Tren',
  description: 'Telegram Mini App для планирования и прохождения тренировок',
})
</script>

<template>
  <main class="flex min-h-svh items-center bg-default py-8">
    <UContainer class="w-full max-w-lg">
      <UCard>
        <div class="space-y-4">
          <UBadge
            color="success"
            variant="subtle"
          >
            Nuxt установлен
          </UBadge>

          <div class="space-y-2">
            <h1 class="text-2xl font-semibold text-highlighted">
              UI Tren
            </h1>

            <p class="text-muted">
              Базовое приложение на Nuxt 4 и Nuxt UI готово к разработке.
            </p>
          </div>
        </div>
      </UCard>
    </UContainer>
  </main>
</template>
