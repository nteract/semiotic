import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_GROWING_MAX_CAPACITY,
  GROWING_CAPACITY_WARN_THRESHOLD,
  PipelineStore,
  type PipelineConfig
} from "./PipelineStore"

function makeGrowingConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "line",
    runtimeMode: "streaming",
    windowSize: 4,
    windowMode: "growing",
    arrowOfTime: "right",
    extentPadding: 0.1,
    ...overrides
  }
}

describe("PipelineStore growing-window capacity", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("defaults maxCapacity to DEFAULT_GROWING_MAX_CAPACITY", () => {
    expect(DEFAULT_GROWING_MAX_CAPACITY).toBe(100_000)
    expect(GROWING_CAPACITY_WARN_THRESHOLD).toBe(50_000)
  })

  it("warns once (dev) that windowSize is mount-only when changed after mount", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const store = new PipelineStore(makeGrowingConfig({ windowSize: 10 }))

    store.updateConfig({ windowSize: 50 })
    store.updateConfig({ windowSize: 99 }) // second change — must not warn again
    // A no-op re-pass of the same windowSize must not warn.
    store.updateConfig({ windowSize: 99 })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain("windowSize")
    expect(String(warn.mock.calls[0][0])).toContain("mount-only")
  })

  it("grows the buffer until maxCapacity then slides", () => {
    const store = new PipelineStore(
      makeGrowingConfig({ windowSize: 2, maxCapacity: 4 })
    )
    for (let i = 0; i < 6; i++) {
      store.ingest({
        inserts: [{ time: i, value: i }],
        bounded: false
      })
    }
    const data = store.getData()
    // Cap 4: last four points remain once the buffer is full at max
    expect(data.length).toBe(4)
    expect(data.map((d) => d.time)).toEqual([2, 3, 4, 5])
  })

  it("respects an explicit maxCapacity below the default", () => {
    const store = new PipelineStore(
      makeGrowingConfig({ windowSize: 1, maxCapacity: 3 })
    )
    for (let i = 0; i < 5; i++) {
      store.ingest({ inserts: [{ time: i, value: i }], bounded: false })
    }
    expect(store.getData().length).toBe(3)
  })

  it("warns once when capacity crosses the dev threshold", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    // Start just under the warn threshold so one growth step crosses it
    // without needing 50k+ pushes in the test.
    const startSize = GROWING_CAPACITY_WARN_THRESHOLD - 10
    const store = new PipelineStore(
      makeGrowingConfig({
        windowSize: startSize,
        maxCapacity: GROWING_CAPACITY_WARN_THRESHOLD * 2
      })
    )
    // Fill to capacity
    store.ingest({
      inserts: Array.from({ length: startSize }, (_, i) => ({
        time: i,
        value: i
      })),
      bounded: false
    })
    // One more push doubles capacity past the warn threshold
    store.ingest({
      inserts: [{ time: startSize, value: startSize }],
      bounded: false
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/Growing window buffer/)

    // Further growth does not re-warn
    store.ingest({
      inserts: Array.from({ length: 100 }, (_, i) => ({
        time: startSize + 1 + i,
        value: i
      })),
      bounded: false
    })
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
