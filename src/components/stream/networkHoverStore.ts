import type { SetStateAction } from "react"
import type { HoverData } from "../realtime/types"

/** Hover chrome updates independently of the retained network scene. */
export function createNetworkHoverStore() {
  let hover: HoverData | null = null
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => hover,
    getServerSnapshot: () => null,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set(next: SetStateAction<HoverData | null>) {
      const value = typeof next === "function" ? next(hover) : next
      if (hover === value) return
      hover = value
      listeners.forEach((listener) => listener())
    }
  }
}

export type NetworkHoverStore = ReturnType<typeof createNetworkHoverStore>
