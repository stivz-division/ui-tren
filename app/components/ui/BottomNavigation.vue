<script setup lang="ts">
const route = useRoute()
const items = [
  { label: 'Главная', icon: 'i-lucide-house', to: '/' },
  { label: 'Программа', icon: 'i-lucide-clipboard-list', to: '/programs' },
  { label: 'История', icon: 'i-lucide-history', to: '/workout-history' },
  { label: 'Упражнения', icon: 'i-lucide-book-open', to: '/exercises' },
]
</script>

<template>
  <nav
    aria-label="Основная навигация"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-muted bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
  >
    <div class="mx-auto grid h-20 max-w-[480px] grid-cols-4 px-2">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[0.6875rem] font-medium transition-colors min-[375px]:text-xs"
        :class="route.path === item.to ? 'text-primary' : 'text-muted hover:text-default'"
        :aria-current="route.path === item.to ? 'page' : undefined"
      >
        <UIcon
          :name="item.icon"
          class="size-6"
          aria-hidden="true"
        />
        <span class="max-w-full break-words text-center">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
