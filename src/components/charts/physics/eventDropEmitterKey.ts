import type { EventDropChartProps } from "./EventDropChart"

const callbackIds = new WeakMap<object, number>()
let nextCallbackId = 0

/** Schedule values and callback identities define a run; live controls do not. */
export function eventDropEmitterKey(emitters: EventDropChartProps["emitters"]) {
  if (!emitters) return undefined
  return JSON.stringify(
    {
      sources: emitters.sources,
      seed: emitters.seed,
      durationMs: emitters.durationMs,
      maxEvents: emitters.maxEvents
    },
    (_key, value) => {
      if (typeof value !== "function") return value
      let id = callbackIds.get(value)
      if (id === undefined) {
        id = nextCallbackId++
        callbackIds.set(value, id)
      }
      return { callbackId: id }
    }
  )
}
