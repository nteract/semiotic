import type { NetworkPerspective } from "./networkPerspective"

/** Stable identity key for a perspective prop, including callback identity. */
const FUNCTION_IDS = new WeakMap<object, number>()
let nextFunctionId = 1
export function networkPerspectiveKey(perspective: NetworkPerspective | null | undefined): string {
  if (!perspective) return ""
  if (typeof perspective === "string") return perspective
  try {
    return JSON.stringify(perspective, (_key, value) => {
      if (typeof value !== "function") return value
      let id = FUNCTION_IDS.get(value)
      if (!id) {
        id = nextFunctionId++
        FUNCTION_IDS.set(value, id)
      }
      return `ƒ${id}`
    })
  } catch {
    return String(nextFunctionId++)
  }
}
