import "../../test-utils/registerBuiltInXYPlugins"
import "../../test-utils/provideXYTransitionEngine"
import { describe, expect, it } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import { generateXYTicks } from "./xyAxisTicks"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { ordinalAxisTicks } from "./ordinalAxisTicks"
import type { OrdinalPipelineConfig } from "./ordinalTypes"

const layout = { width: 400, height: 130 }
function histogram(values: number[], overrides: Partial<PipelineConfig> = {}) {
  const store = new PipelineStore({
    chartType: "bar",
    runtimeMode: "streaming",
    windowSize: 100,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    binSize: 10,
    axisExtent: "rounded",
    ...overrides
  })
  store.ingest({
    inserts: values.map((value, i) => ({ time: i * 10, value })),
    bounded: true
  })
  store.computeScene(layout)
  return store
}

describe("rounded value domains", () => {
  it.each([
    [
      [600, 1340, 900],
      [0, 1500]
    ],
    [
      [600, 1000, 900],
      [0, 1200]
    ],
    [
      [600, -300, 1300],
      [-500, 1500]
    ],
    [
      [-600, -1340, -900],
      [-1500, 0]
    ]
  ])("rounds padded histogram %j out to %j", (values, expected) => {
    const store = histogram(values)
    const scale = store.scales!.y
    expect(scale.domain()).toEqual(expected)
    const ticks = generateXYTicks({
      scale,
      size: layout.height,
      axisExtent: "rounded"
    })
    expect([ticks[0].value, ticks[ticks.length - 1].value]).toEqual(expected)
    for (const node of store.scene) {
      if (node.type !== "rect") continue
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y + node.h).toBeLessThanOrEqual(layout.height)
    }
  })

  it("uses each sign's layer sum rather than the bin's net total", () => {
    const store = histogram([], { categoryAccessor: "series" })
    store.ingest({
      inserts: [
        { time: 0, value: 700, series: "A" },
        { time: 0, value: -200, series: "B" },
        { time: 10, value: 300, series: "A" },
        { time: 10, value: 100, series: "B" }
      ],
      bounded: true
    })
    store.computeScene(layout)
    expect(store.scales!.y.domain()).toEqual([-400, 800])
  })

  it("preserves partial, fully pinned, and inverted bounds", () => {
    expect(histogram([1340], { yExtent: [125] }).scales!.y.domain()).toEqual([
      125, 1500
    ])
    expect(
      histogram([-1340], { yExtent: [undefined, -125] }).scales!.y.domain()
    ).toEqual([-1500, -125])
    expect(
      histogram([1340], { yExtent: [125, 5000] }).scales!.y.domain()
    ).toEqual([125, 5000])
    expect(
      histogram([1340], { yExtent: [125], invertY: true }).scales!.y.domain()
    ).toEqual([1500, 125])
  })

  it("honors tick settings and recomputes after streaming and layout updates", () => {
    const store = histogram([2100], { yAxisTicks: 3 })
    expect(store.scales!.y.domain()).toEqual([0, 3000])
    store.computeScene({ ...layout, height: 72 })
    expect(store.scales!.y.domain()).toEqual([0, 4000])
    store.updateConfig({ yAxisTicks: 5, yAxisTickValues: [0, 1000, 2000] })
    store.computeScene(layout)
    expect(store.scales!.y.domain()).toEqual([0, 2310])
    store.updateConfig({ yAxisTickValues: undefined })
    store.ingest({ inserts: [{ time: 30, value: 4100 }], bounded: false })
    store.computeScene(layout)
    expect(store.scales!.y.domain()).toEqual([0, 5000])
  })

  it("uses plot size before scalePadding, and leaves nice/exact unchanged", () => {
    expect(histogram([1340], { scalePadding: 20 }).scales!.y.domain()).toEqual([
      0, 1500
    ])
    expect(
      histogram([1340], { axisExtent: "nice" }).scales!.y.domain()
    ).toEqual([0, 1474])
    expect(
      histogram([1340], { axisExtent: "exact" }).scales!.y.domain()
    ).toEqual([0, 1340])
    expect(
      histogram([1340], { yAxisExtent: "nice" }).scales!.y.domain()
    ).toEqual([0, 1474])
    expect(histogram([1340], { yAxisTicks: 0 }).scales!.y.domain()).toEqual([
      0, 1474
    ])
  })

  it("clamps all-negative padding at zero in both histogram and stacked area", () => {
    expect(
      histogram([-1340], { axisExtent: "nice" }).scales!.y.domain()
    ).toEqual([-1474, 0])
    for (const baseline of ["zero", "diverging"] as const) {
      expect(
        histogram([-1340], {
          chartType: "stackedarea",
          baseline
        }).scales!.y.domain()
      ).toEqual([-1500, 0])
    }
  })

  it("covers line bands without introducing a negative step for positive data", () => {
    const store = histogram([1, 1265], {
      chartType: "line",
      band: { y0Accessor: "lo", y1Accessor: "hi" }
    })
    expect(store.scales!.y.domain()).toEqual([0, 1500])
    store.ingest({
      inserts: [{ time: 0, value: 100, lo: -300, hi: 2100 }],
      bounded: true
    })
    store.computeScene(layout)
    expect(store.scales!.y.domain()).toEqual([-1000, 3000])
  })

  it("transitions between mark positions from rounded domains", () => {
    const store = histogram([1340], {
      chartType: "scatter",
      pointIdAccessor: "id",
      yExtent: [0],
      transition: { duration: 100, easing: "linear" }
    })
    store.ingest({
      inserts: [{ time: 0, value: 1340, id: "point" }],
      bounded: true
    })
    store.computeScene(layout)
    if (store.activeTransition)
      store.advanceTransition(store.activeTransition.startTime + 100)
    const previous = store.scales!.y(1340)
    store.ingest({
      inserts: [{ time: 0, value: 2100, id: "point" }],
      bounded: true
    })
    store.computeScene(layout)
    const target = store.scales!.y(2100)
    expect(store.scales!.y.domain()).toEqual([0, 2500])
    expect(store.activeTransition).not.toBeNull()
    const start = store.activeTransition!.startTime
    store.advanceTransition(start + 50)
    expect(store.scene[0].type).toBe("point")
    expect((store.scene[0] as { y: number }).y).toBeCloseTo(
      (previous + target) / 2
    )
    store.advanceTransition(start + 100)
    expect((store.scene[0] as { y: number }).y).toBeCloseTo(target)
  })

  it("uses the scale's log nice algorithm and preserves a pinned log minimum", () => {
    const store = histogram([3, 1340], {
      chartType: "line",
      yScaleType: "log",
      yExtent: [3]
    })
    expect(store.scales!.y.domain()).toEqual([3, 10000])
  })
})

describe("rounded ordinal value axes", () => {
  function bars(config: Partial<OrdinalPipelineConfig> = {}) {
    const store = new OrdinalPipelineStore({
      chartType: "bar",
      windowSize: 100,
      windowMode: "sliding",
      projection: "vertical",
      oAccessor: "category",
      rAccessor: "value",
      extentPadding: 0.1,
      axisExtent: "rounded",
      ...config
    })
    store.ingest({
      inserts: [
        { category: "A", value: 1340 },
        { category: "B", value: 600 }
      ],
      bounded: true
    })
    store.computeScene(layout)
    return store
  }
  it.each(["vertical", "horizontal"] as const)(
    "uses the %s value-axis pixel budget for marks and ticks",
    (projection) => {
      const store = bars({ projection })
      const size =
        projection === "vertical" ? layout : { width: 130, height: 400 }
      store.computeScene(size)
      const expected = projection === "vertical" ? [0, 1500] : [0, 2000]
      expect(store.scales!.r.domain()).toEqual(expected)
      const ticks = ordinalAxisTicks(store.scales!, size, "rounded")
      expect([ticks[0], ticks[ticks.length - 1]]).toEqual(expected)
    }
  )
  it("preserves pinned ends and bypasses rounding for explicit tick values", () => {
    expect(bars({ rExtent: [0, 5000] }).scales!.r.domain()).toEqual([0, 5000])
    expect(bars({ rExtent: [125] }).scales!.r.domain()).toEqual([125, 1500])
    expect(bars({ rTickValues: [0, 1000] }).scales!.r.domain()).toEqual([
      0, 1474
    ])
  })
})
