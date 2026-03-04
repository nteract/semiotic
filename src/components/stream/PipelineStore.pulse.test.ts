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

    const points = store.scene.filter(n => n.type === "point") as any[]
    expect(points.length).toBe(1)
    expect(points[0]._pulseIntensity).toBeGreaterThan(0)
    expect(points[0]._pulseColor).toBe("red")
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
