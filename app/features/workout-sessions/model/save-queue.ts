/** Failed mutations pause the queue until explicit recovery. */
export function createSaveQueue<T>(save: (value: T) => Promise<void>, onError: (cause: unknown) => void) {
  const items: T[] = []
  let running: Promise<void> | null = null
  let stopped = false
  async function drain() {
    while (items.length && !stopped) {
      try { await save(items.shift()!) }
      catch (cause) { stopped = true; items.length = 0; onError(cause) }
    }
  }
  return {
    enqueue(value: T) {
      if (stopped) return
      items.push(value)
      running ??= drain().finally(() => { running = null })
    },
    async idle() { while (running) await running },
    resume() { stopped = false },
  }
}
