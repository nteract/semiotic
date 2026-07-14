import { describe, expect, it } from "vitest"
import { FrameRuntime } from "./FrameRuntime"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function config(clock: () => number): PipelineConfig {
  return {
    chartType: "scatter",
    windowSize: 20,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0,
    xAccessor: "x",
    yAccessor: "y",
    transition: { duration: 100, easing: "linear" },
    clock,
  }
}

describe("PipelineStore FrameRuntime clock seam", () => {
  it("keeps an XY transition at its paused progress instead of fast-forwarding after resume", () => {
    let wallTime = 0
    const runtime = new FrameRuntime({ clock: () => wallTime })
    const store = new PipelineStore(config(runtime.now))

    store.ingest({ bounded: true, inserts: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 200 },
    ] })
    store.computeScene({ width: 200, height: 100 })

    wallTime = 10
    store.ingest({ bounded: true, inserts: [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ] })
    store.computeScene({ width: 200, height: 100 })
    expect(store.activeTransition?.startTime).toBe(10)

    runtime.setPaused(true)
    wallTime = 10_000
    expect(store.advanceTransition(runtime.now())).toBe(true)
    expect(store.activeTransition?.startTime).toBe(10)

    runtime.setPaused(false)
    expect(store.advanceTransition(runtime.now())).toBe(true)
    wallTime = 20_000
    expect(store.advanceTransition(runtime.now())).toBe(false)
  })
})
