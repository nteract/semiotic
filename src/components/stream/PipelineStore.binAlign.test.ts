import "../../test-utils/registerBuiltInXYPlugins"
import { describe, expect, it } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import { findBarColumnAtX } from "./xyPlugins/barColumnLookup"

function makeStore(overrides: Partial<PipelineConfig> = {}) {
  const store = new PipelineStore({
    chartType: "bar",
    runtimeMode: "streaming",
    windowSize: 100,
    windowMode: "growing",
    arrowOfTime: "right",
    extentPadding: 0,
    binSize: 10,
    binAlign: "center",
    timeAccessor: "time",
    valueAccessor: "value",
    barStyle: { gap: 0 },
    ...overrides
  })
  store.ingest({
    inserts: [0, 10, 20].map((time) => ({ time, value: 2 })),
    bounded: false
  })
  store.computeScene({ width: 300, height: 100 })
  return store
}

describe("centered histogram layout", () => {
  it.each(["left", "right"] as const)(
    "covers full edge bins with time flowing %s",
    (arrowOfTime) => {
      const store = makeStore({ arrowOfTime })
      expect(store.scales?.x.domain().map(Number)).toEqual([-5, 25])
      const bars = store.scene.filter((node) => node.type === "rect")
      expect(bars).toHaveLength(3)
      for (let i = 0; i < bars.length; i++) {
        expect(bars[i].w).toBeCloseTo(100)
        expect(bars[i].x + bars[i].w / 2).toBeCloseTo(store.scales!.x(i * 10))
      }
      expect(store.getBinBoundaries()).toEqual([-5, 5, 15, 25])
      expect(findBarColumnAtX(store.scene, 5)?.datum.binStart).toBe(5)
      expect(findBarColumnAtX(store.scene, 4.99)?.datum.binStart).toBe(-5)
    }
  )

  it("honors explicit clipping and partial bounds", () => {
    const store = makeStore({ xExtent: [0, 20] })
    const bars = store.scene.filter((node) => node.type === "rect")
    expect(bars.map((bar) => bar.w)).toEqual([75, 150, 75])
    expect(store.scales?.x.domain().map(Number)).toEqual([0, 20])
    expect(
      makeStore({ xExtent: [0, undefined] })
        .scales?.x.domain()
        .map(Number)
    ).toEqual([0, 25])
  })

  it("recomputes bin membership, y totals, and snapping boundaries when alignment changes", () => {
    const store = makeStore()
    store.ingest({
      inserts: [
        { time: 4, value: 3 },
        { time: 6, value: 7 }
      ],
      bounded: false
    })
    store.computeScene({ width: 300, height: 100 })
    expect(store.scales?.y.domain()).toEqual([0, 9])
    store.updateConfig({ binAlign: "start" })
    store.computeScene({ width: 300, height: 100 })
    expect(store.scales?.y.domain()).toEqual([0, 12])
    expect(store.getBinBoundaries()).toEqual([0, 10, 20, 30])
    expect(findBarColumnAtX(store.scene, 6)?.datum.total).toBe(12)
    expect(findBarColumnAtX(store.scene, 10)?.datum.total).toBe(2)
  })
})
