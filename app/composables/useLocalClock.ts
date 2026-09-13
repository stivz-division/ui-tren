import { onMounted, onUnmounted, shallowRef } from 'vue'

export function useLocalClock() {
  // Both SSR and the first client render wait for the device's timezone.
  const clock = shallowRef<{ now: Date, timeZone: string } | null>(null)
  let interval: ReturnType<typeof setInterval> | undefined

  function refresh() {
    clock.value = {
      now: new Date(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') refresh()
  }

  onMounted(() => {
    refresh()
    interval = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
  })

  onUnmounted(() => {
    if (interval !== undefined) clearInterval(interval)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('focus', refresh)
    window.removeEventListener('pageshow', refresh)
  })

  return clock
}
