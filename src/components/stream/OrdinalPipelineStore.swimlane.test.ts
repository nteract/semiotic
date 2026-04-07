import { OrdinalPipelineStore } from "./OrdinalPipelineStore"

describe("Swimlane extent padding", () => {
  const makeStore = (extentPadding?: number) => {
    const store = new OrdinalPipelineStore({
      chartType: "swimlane",
      windowSize: 100,
      windowMode: "sliding",
      extentPadding: extentPadding as any,
      projection: "horizontal",
      oAccessor: "lane",
      rAccessor: "value",
      stackBy: "task",
    })
    store.ingest({
      inserts: [
        { lane: "A", task: "t1", value: 30 },
        { lane: "A", task: "t2", value: 20 },
        { lane: "B", task: "t1", value: 40 },
        { lane: "B", task: "t3", value: 10 },
      ],
      bounded: true,
    })
    return store
  }

  it("swimlane with default padding fills to max lane sum (no trailing gap)", () => {
    const store = makeStore() // default extentPadding
    store.computeScene({ width: 400, height: 200 })

    // Max lane sum: lane A = 50, lane B = 50
    // rScale domain should be [0, 50] — no padding on max for swimlane
    const rScale = store.scales!.r
    // The max value should map to exactly layout.width (400)
    expect(rScale(50)).toBe(400)
  })

  it("extentPadding: 0 is respected (not treated as falsy)", () => {
    // Use a regular BAR chart to test extentPadding: 0 — swimlane already skips max pad
    const store = new OrdinalPipelineStore({
      chartType: "bar",
      windowSize: 100,
      windowMode: "sliding",
      extentPadding: 0,
      projection: "vertical",
      oAccessor: "category",
      rAccessor: "value",
    })
    store.ingest({
      inserts: [{ category: "A", value: 100 }],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })

    const rScale = store.scales!.r
    // With extentPadding: 0, domain max should be exactly 100 (no headroom)
    // rScale(100) should map to 0 (top of vertical chart)
    expect(rScale(100)).toBe(0)
    // rScale(0) should map to 200 (bottom)
    expect(rScale(0)).toBe(200)
  })

  it("extentPadding: 0.1 adds 10% headroom on non-swimlane bar charts", () => {
    // Use a regular bar chart to verify padding still works
    const store = new OrdinalPipelineStore({
      chartType: "bar",
      windowSize: 100,
      windowMode: "sliding",
      extentPadding: 0.1,
      projection: "vertical",
      oAccessor: "category",
      rAccessor: "value",
    })
    store.ingest({
      inserts: [
        { category: "A", value: 100 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })

    const rScale = store.scales!.r
    // Domain max should be 100 + 10% = 110 (baselinePadding=false skips min pad)
    // rScale(110) maps to 0 (top), rScale(0) maps to 200 (bottom, vertical)
    // rScale(100) should NOT map to 0 — there should be headroom
    expect(rScale(100)).toBeGreaterThan(0)
  })

  it("swimlane bars fill the full inner width", () => {
    const store = makeStore()
    store.computeScene({ width: 400, height: 200 })

    // Find the rightmost edge of all rect nodes
    let maxRight = 0
    for (const node of store.scene) {
      if (node.type === "rect") {
        const right = (node as any).x + (node as any).w
        if (right > maxRight) maxRight = right
      }
    }
    // The rightmost bar edge should be at layout.width (400)
    expect(maxRight).toBeCloseTo(400, 0)
  })
})
