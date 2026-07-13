import type { FrameScheduler } from "../useFrame"

/**
 * Deterministic rAF scheduler for frame tests. It deliberately permits zero
 * as the first handle so tests cannot rely on truthiness for pending work.
 */
export function createFrameScheduler(firstHandle = 0) {
  const callbacks = new Map<number, FrameRequestCallback>()
  const requestedHandles: number[] = []
  const cancelledHandles: number[] = []
  let nextHandle = firstHandle

  const scheduler: FrameScheduler = {
    requestAnimationFrame: (callback) => {
      const handle = nextHandle++
      requestedHandles.push(handle)
      callbacks.set(handle, callback)
      return handle
    },
    cancelAnimationFrame: (handle) => {
      cancelledHandles.push(handle)
      callbacks.delete(handle)
    },
  }

  return {
    scheduler,
    requestedHandles,
    cancelledHandles,
    get pendingCount() {
      return callbacks.size
    },
    flush(timestamp = performance.now()) {
      const pending = [...callbacks.values()]
      callbacks.clear()
      for (const callback of pending) callback(timestamp)
    },
  }
}
