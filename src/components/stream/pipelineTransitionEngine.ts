import type { xyTransitionEngine } from "./pipelineTransitions"

export type XYTransitionEngine = typeof xyTransitionEngine

let engine: XYTransitionEngine | null = null
let loading: Promise<XYTransitionEngine> | null = null

/**
 * The XY transition engine (snapshot → start → advance interpolation) is only
 * needed when a chart sets `animate` or `transition`, so it lives in a split
 * chunk. `StreamXYFrame` loads it and holds the first paint of an animated
 * intro until it arrives (the intro starts from a blank frame, so the wait is
 * invisible). Synchronous renderers that animate, such as the server GIF
 * renderer, provide it up front.
 */
export function provideXYTransitionEngine(value: XYTransitionEngine): void {
  engine = value
}

export function getXYTransitionEngine(): XYTransitionEngine | null {
  return engine
}

export function loadXYTransitionEngine(): Promise<XYTransitionEngine> {
  if (engine) return Promise.resolve(engine)
  loading ??= import("./pipelineTransitions")
    .then((mod) => {
      engine = mod.xyTransitionEngine
      return engine
    })
    .catch((error) => {
      loading = null
      throw error
    })
  return loading
}
