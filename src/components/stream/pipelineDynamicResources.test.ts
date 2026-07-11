import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "./ordinalTypes"

type TimestampStore = {
  timestampBuffer: {
    capacity: number
    size: number
  } | null
  buffer: {
    capacity: number
  }
}

function getTimestampBuffer(store: unknown) {
  return (store as TimestampStore).timestampBuffer
}

function makeXYConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "scatter",
    windowSize: 1,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0,
    xAccessor: "x",
    yAccessor: "y",
    ...overrides
  }
}

function makeOrdinalConfig(
  overrides: Partial<OrdinalPipelineConfig> = {}
): OrdinalPipelineConfig {
  return {
    chartType: "point",
    windowSize: 1,
    windowMode: "sliding",
    extentPadding: 0,
    projection: "vertical",
    oAccessor: "category",
    rAccessor: "value",
    ...overrides
  }
}

function expectAlignedTimestampBuffer(
  store: { size: number },
  timestampBuffer: { capacity: number; size: number } | null
) {
  expect(timestampBuffer).not.toBeNull()
  expect(timestampBuffer!.size).toBe(store.size)
  expect(timestampBuffer!.capacity).toBe((store as unknown as TimestampStore).buffer.capacity)
}

describe("pipeline dynamic resources", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates, destroys, and reseeds XY pulse timestamps after mount", () => {
    const store = new PipelineStore(makeXYConfig())
    store.ingest({
      inserts: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
      bounded: true,
      totalSize: 3
    })
    expect(store.getBuffer().capacity).toBe(3)
    expect(getTimestampBuffer(store)).toBeNull()

    store.updateConfig({ pulse: { duration: 10_000, color: "red" } })
    const firstTimestamps = getTimestampBuffer(store)
    expectAlignedTimestampBuffer(store, firstTimestamps)
    store.computeScene({ width: 100, height: 100 })
    expect(store.scene.some(node =>
      "_pulseIntensity" in node && typeof node._pulseIntensity === "number" && node._pulseIntensity > 0
    )).toBe(true)

    // A pulse-style update uses the existing arrival history instead of
    // re-triggering every retained datum.
    store.updateConfig({ pulse: { duration: 10_000, color: "blue" } })
    expect(getTimestampBuffer(store)).toBe(firstTimestamps)

    store.updateConfig({ pulse: undefined })
    expect(getTimestampBuffer(store)).toBeNull()
    expect(store.hasActivePulses).toBe(false)

    store.updateConfig({ pulse: { duration: 10_000 } })
    const reseeded = getTimestampBuffer(store)
    expect(reseeded).not.toBe(firstTimestamps)
    expectAlignedTimestampBuffer(store, reseeded)
  })

  it("creates, destroys, and reseeds ordinal pulse timestamps after mount", () => {
    const store = new OrdinalPipelineStore(makeOrdinalConfig())
    store.ingest({
      inserts: [
        { category: "A", value: 1 },
        { category: "B", value: 2 },
        { category: "C", value: 3 }
      ],
      bounded: true,
      totalSize: 3
    })
    expect(getTimestampBuffer(store)).toBeNull()

    store.updateConfig({ pulse: { duration: 10_000, color: "red" } })
    const firstTimestamps = getTimestampBuffer(store)
    expectAlignedTimestampBuffer(store, firstTimestamps)
    store.computeScene({ width: 100, height: 100 })
    expect(store.scene.some(node =>
      "_pulseIntensity" in node && typeof node._pulseIntensity === "number" && node._pulseIntensity > 0
    )).toBe(true)

    store.updateConfig({ pulse: { duration: 10_000, color: "blue" } })
    expect(getTimestampBuffer(store)).toBe(firstTimestamps)

    store.updateConfig({ pulse: undefined })
    expect(getTimestampBuffer(store)).toBeNull()
    expect(store.hasActivePulses).toBe(false)

    store.updateConfig({ pulse: { duration: 10_000 } })
    const reseeded = getTimestampBuffer(store)
    expect(reseeded).not.toBe(firstTimestamps)
    expectAlignedTimestampBuffer(store, reseeded)
  })

  it("warns once that ordinal windowSize remains mount-only", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const store = new OrdinalPipelineStore(makeOrdinalConfig({ windowSize: 2 }))

    store.updateConfig({ windowSize: 3 })
    store.updateConfig({ windowSize: 4 })
    store.updateConfig({ windowSize: 4 })

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain("windowSize")
    expect(String(warn.mock.calls[0][0])).toContain("mount-only")
  })
})
