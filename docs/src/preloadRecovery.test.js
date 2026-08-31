import { describe, expect, it, vi } from "vitest"
import {
  PRELOAD_RECOVERY_KEY,
  PRELOAD_RECOVERY_WINDOW_MS,
  installVitePreloadRecovery,
} from "./preloadRecovery"

function createTarget() {
  const listeners = new Map()
  const values = new Map()
  return {
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    dispatch: (type, event) => listeners.get(type)?.(event),
    storedValue: (key) => values.get(key),
  }
}

describe("installVitePreloadRecovery", () => {
  it("prevents the failed import and reloads once", () => {
    const target = createTarget()
    const reload = vi.fn()
    const preventDefault = vi.fn()

    installVitePreloadRecovery(target, { now: () => 50_000, reload })
    target.dispatch("vite:preloadError", { preventDefault })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
    expect(target.storedValue(PRELOAD_RECOVERY_KEY)).toBe("50000")
  })

  it("lets a repeated failure reach the route error boundary instead of reloading forever", () => {
    const target = createTarget()
    const reload = vi.fn()
    const firstEvent = { preventDefault: vi.fn() }
    const repeatedEvent = { preventDefault: vi.fn() }
    let currentTime = 50_000

    installVitePreloadRecovery(target, { now: () => currentTime, reload })
    target.dispatch("vite:preloadError", firstEvent)
    currentTime += PRELOAD_RECOVERY_WINDOW_MS - 1
    target.dispatch("vite:preloadError", repeatedEvent)

    expect(reload).toHaveBeenCalledOnce()
    expect(repeatedEvent.preventDefault).not.toHaveBeenCalled()
  })

  it("does not reload when Safari denies session storage", () => {
    const target = createTarget()
    const reload = vi.fn()
    const preventDefault = vi.fn()
    target.sessionStorage.setItem = () => {
      throw new DOMException("Access denied", "SecurityError")
    }

    installVitePreloadRecovery(target, { now: () => 50_000, reload })
    target.dispatch("vite:preloadError", { preventDefault })

    expect(preventDefault).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })
})
