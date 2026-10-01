/** Load an optional frame module with one retry and an actionable diagnostic. */
export function loadFrameModule(
  load: () => Promise<unknown>,
  onReady: () => void,
  description: string,
  onError?: () => void
): () => void {
  let cancelled = false
  let retry: ReturnType<typeof setTimeout> | undefined
  const attempt = async (canRetry: boolean) => {
    try {
      await load()
    } catch (error) {
      if (cancelled) return
      if (canRetry) {
        retry = setTimeout(() => { void attempt(false) }, 250)
      } else {
        console.error(
          `[semiotic] Cannot load ${description}; remount the chart to retry.`,
          error
        )
        onError?.()
      }
      return
    }
    if (!cancelled) onReady()
  }
  void attempt(true)
  return () => {
    cancelled = true
    clearTimeout(retry)
  }
}
