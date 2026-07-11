import { afterEach, describe, expect, it, vi } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "scatter",
    windowSize: 10,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    ...overrides
  }
}

describe("PipelineStore — Pulse", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates timestamp buffer when pulse config is provided", () => {
    const store = new PipelineStore(makeConfig({
      pulse: { duration: 500 }
    }))
    // Verify the store was created without errors
    expect(store.size).toBe(0)
  })

  it("timestamp buffer stays in sync with data buffer", () => {
    const store = new PipelineStore(makeConfig({
      pulse: { duration: 500 },
      xAccessor: "x",
      yAccessor: "y"
    }))

    store.ingest({
      inserts: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      bounded: false
    })
    expect(store.size).toBe(2)
  })

  it("hasActivePulses returns true immediately after ingest", () => {
    const store = new PipelineStore(makeConfig({
      pulse: { duration: 1000 },
      xAccessor: "x",
      yAccessor: "y"
    }))

    store.ingest({
      inserts: [{ x: 1, y: 2 }],
      bounded: false
    })
    expect(store.hasActivePulses).toBe(true)
  })

  it("hasActivePulses returns false when no data", () => {
    const store = new PipelineStore(makeConfig({
      pulse: { duration: 500 }
    }))
    expect(store.hasActivePulses).toBe(false)
  })

  it("hasActivePulses returns false without pulse config", () => {
    const store = new PipelineStore(makeConfig())
    store.ingest({
      inserts: [{ x: 1, y: 2 }],
      bounded: false
    })
    expect(store.hasActivePulses).toBe(false)
  })

  it("pulse intensity is set on scene nodes for recent data", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      pulse: { duration: 10000, color: "red" },
      xAccessor: "x",
      yAccessor: "y"
    }))

    store.ingest({
      inserts: [{ x: 1, y: 2 }],
      bounded: false
    })
    store.computeScene({ width: 100, height: 100 })

    const points = store.scene.filter(n => n.type === "point")
    expect(points.length).toBe(1)
    expect(points[0]._pulseIntensity).toBeGreaterThan(0)
    expect(points[0]._pulseColor).toBe("red")
  })

  it("refreshes an existing pulse through decay and clears it at expiry without a rebuild", () => {
    vi.spyOn(performance, "now").mockReturnValue(1000)
    const store = new PipelineStore(makeConfig({
      pulse: { duration: 100, color: "red", glowRadius: 6 },
      xAccessor: "x",
      yAccessor: "y"
    }))
    store.ingest({ inserts: [{ x: 1, y: 2 }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    const point = store.scene.find(n => n.type === "point")
    expect(point?._pulseIntensity).toBe(1)

    const computeScene = vi.spyOn(store, "computeScene")
    expect(store.refreshPulse(1050)).toBe(true)
    expect(point?._pulseIntensity).toBe(0.5)
    expect(point?._pulseColor).toBe("red")
    expect(point?._pulseGlowRadius).toBe(6)
    expect(computeScene).not.toHaveBeenCalled()

    expect(store.refreshPulse(1100)).toBe(true)
    expect(point?._pulseIntensity).toBe(0)
    expect(point?._pulseColor).toBeUndefined()
    expect(point?._pulseGlowRadius).toBeUndefined()
    expect(store.refreshPulse(1100)).toBe(false)
  })

  it("does not mutate a preserved last-known-good custom scene on an idle pulse frame", () => {
    vi.spyOn(performance, "now").mockReturnValue(1000)
    const store = new PipelineStore(makeConfig({
      pulse: { duration: 100, color: "red" },
      xAccessor: "x",
      yAccessor: "y"
    }))
    store.ingest({ inserts: [{ x: 1, y: 2 }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    const point = store.scene.find(n => n.type === "point")
    expect(point?._pulseIntensity).toBe(1)
    store.lastCustomLayoutFailure = { preservedLastGoodScene: true } as never

    expect(store.refreshPulse(1050)).toBe(false)
    expect(point?._pulseIntensity).toBe(1)
  })

  it("clears timestamp buffer on clear()", () => {
    const store = new PipelineStore(makeConfig({
      pulse: { duration: 500 },
      xAccessor: "x",
      yAccessor: "y"
    }))

    store.ingest({
      inserts: [{ x: 1, y: 2 }],
      bounded: false
    })
    expect(store.hasActivePulses).toBe(true)

    store.clear()
    expect(store.hasActivePulses).toBe(false)
    expect(store.size).toBe(0)
  })
})
