import type { Ref } from 'vue'
import { useTelegram } from '~/features/auth/composables/useTelegram'

const DISCARD_MESSAGE = 'Отменить изменения? Несохранённые данные будут потеряны.'

export function useUnsavedProgramChanges(isDirty: Ref<boolean>, discard: () => void) {
  const router = useRouter()
  const { getWebApp } = useTelegram()

  function confirmDiscard(): boolean {
    if (!isDirty.value) return true
    if (!window.confirm(DISCARD_MESSAGE)) return false
    discard()
    return true
  }

  function handleTelegramBack() {
    if (typeof window.history.state?.back === 'string') router.back()
    else void navigateTo('/programs')
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onBeforeRouteLeave(confirmDiscard)
  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    const backButton = getWebApp()?.BackButton
    backButton?.onClick(handleTelegramBack)
    backButton?.show()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    const backButton = getWebApp()?.BackButton
    backButton?.offClick(handleTelegramBack)
    backButton?.hide()
  })
}
