export const PRELOAD_RECOVERY_KEY = "semiotic:preload-recovery-at"
export const PRELOAD_RECOVERY_WINDOW_MS = 30_000

export function installVitePreloadRecovery(
  target = window,
  {
    now = Date.now,
    reload = () => target.location.reload(),
    recoveryWindowMs = PRELOAD_RECOVERY_WINDOW_MS,
  } = {},
) {
  const handlePreloadError = (event) => {
    let lastRecoveryAt = 0

    try {
      lastRecoveryAt = Number(target.sessionStorage.getItem(PRELOAD_RECOVERY_KEY) || 0)
    } catch {
      // Without persistent state, reloading could loop forever.
      return
    }

    const recoveryAt = now()
    if (recoveryAt - lastRecoveryAt < recoveryWindowMs) return

    try {
      target.sessionStorage.setItem(PRELOAD_RECOVERY_KEY, String(recoveryAt))
    } catch {
      // Leave the rejection unhandled so the route or entry fallback renders.
      return
    }
    event.preventDefault()
    reload()
  }

  target.addEventListener("vite:preloadError", handlePreloadError)
  return () => target.removeEventListener("vite:preloadError", handlePreloadError)
}
