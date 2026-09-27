import { describe, expect, it } from "vitest"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "./ordinalTypes"
import type { Datum } from "../charts/shared/datumTypes"

const layout = { width: 400, height: 300 }

function build(data: Datum[], config: Partial<OrdinalPipelineConfig> = {}) {
  const store = new OrdinalPipelineStore({
    chartType: "bar",
    windowSize: 10,
    windowMode: "sliding",
    oAccessor: "category",
    rAccessor: "value",
    oSort: false,
    extentPadding: 0,
    projection: "vertical",
    ...config
  })
  store.ingest({ inserts: data, bounded: true })
  store.computeScene(layout)
  return store
}

function expectContained(store: OrdinalPipelineStore) {
  for (const node of store.scene) {
    if (node.type !== "rect") continue
    for (const n of [node.x, node.y, node.w, node.h])
      expect(Number.isFinite(n)).toBe(true)
    expect(node.x).toBeGreaterThanOrEqual(-1e-8)
    expect(node.y).toBeGreaterThanOrEqual(-1e-8)
    expect(node.w).toBeGreaterThanOrEqual(0)
    expect(node.h).toBeGreaterThanOrEqual(0)
    expect(node.x + node.w).toBeLessThanOrEqual(layout.width + 1e-8)
    expect(node.y + node.h).toBeLessThanOrEqual(layout.height + 1e-8)
  }
}

describe("ordinal domains follow rendered aggregates (#1310)", () => {
  it("preserves zero width when every weight is zero and with empty input", () => {
    const store = build(
      [
        { category: "A", value: 1 },
        { category: "B", value: 2 }
      ],
      {
        dynamicColumnWidth: () => 0
      }
    )
    expect(Object.values(store.columns).map((c) => c.width)).toEqual([0, 0])
    expectContained(store)
    store.ingest({ inserts: [], bounded: true })
    store.computeScene(layout)
    expect(store.scene).toEqual([])
    expect(store.scales).toBeNull()
  })

  it("keeps finite width proportions when their total exceeds Number.MAX_VALUE", () => {
    const store = build(
      ["A", "B"].map((category) => ({ category, value: 1, weight: 1e308 })),
      {
        dynamicColumnWidth: "weight",
        barPadding: 0
      }
    )
    expect(Object.values(store.columns).map((c) => c.width)).toEqual([200, 200])
    expectContained(store)
  })

  it("uses the same finite observations for bar/funnel domains and marks", () => {
    for (const chartType of ["bar", "bar-funnel"] as const) {
      const store = build(
        [5, NaN, Infinity, -2].map((value) => ({ category: "A", value })),
        { chartType }
      )
      expect(store.scales!.r.domain()).toEqual([0, 3])
      expect(store.scene).toHaveLength(1)
      expectContained(store)
    }
  })

  it("keeps grouped bars as separate observations and excludes invalid measures", () => {
    const store = build(
      [
        { category: "A", series: "x", value: 10 },
        { category: "A", series: "x", value: 4 },
        { category: "A", series: "y", value: -2 },
        { category: "A", series: "y", value: Infinity },
        { category: "A", series: "y", value: NaN }
      ],
      { chartType: "clusterbar", groupBy: "series" }
    )
    expect(store.scales!.r.domain()).toEqual([-2, 10])
    expect(store.scene.map((n) => n.datum?.value)).toEqual([10, 4, -2])
    expectContained(store)
  })

  it("updates normalized domains after append, replacement, and explicit bounds", () => {
    const store = build([{ category: "A", value: 6, series: "p" }], {
      stackBy: (d) => d.series,
      normalize: true
    })
    store.ingest({
      inserts: [{ category: "A", value: -4, series: "n" }],
      bounded: false
    })
    store.computeScene(layout)
    expect(store.scales!.r.domain()).toEqual([-0.4, 0.6])
    expectContained(store)
    store.ingest({
      inserts: [{ category: "B", value: -2, series: "n" }],
      bounded: true
    })
    store.computeScene(layout)
    expect(store.scales!.r.domain()).toEqual([-1, 0])
    expectContained(store)
    store.updateConfig({ rExtent: [-2, 2] })
    store.computeScene(layout)
    expect(store.scales!.r.domain()).toEqual([-2, 2])
    expectContained(store)
  })

  it("keeps signed funnel rectangles finite and within the aggregate domain", () => {
    const store = build(
      [
        { category: "A", value: -10 },
        { category: "A", value: 4 },
        { category: "B", value: -8 }
      ],
      { chartType: "bar-funnel" }
    )
    expect(store.scales!.r.domain()).toEqual([-8, 0])
    expect(store.scene).toHaveLength(3)
    expectContained(store)
  })

  it("uses the same finite group totals in horizontal funnels", () => {
    const store = build(
      [
        { category: "A", value: 5 },
        { category: "A", value: NaN },
        { category: "A", value: -2 },
        { category: "B", value: 1 }
      ],
      { chartType: "funnel", projection: "horizontal" }
    )
    const bars = store.scene.filter((n) => n.type === "rect")
    expect(bars).toHaveLength(2)
    expect(bars.map((n) => n.datum?.__funnelValue)).toEqual([3, 1])
    expect(bars[0].w / bars[1].w).toBeCloseTo(3)
    expectContained(store)
  })

  it("rebuilds timeline extents from Date endpoints", () => {
    const store = build(
      [
        { id: "a", category: "A", value: [new Date(1000), new Date(3000)] },
        { id: "b", category: "B", value: [new Date(2000), new Date(4000)] }
      ],
      {
        chartType: "timeline",
        dataIdAccessor: "id"
      }
    )
    store.remove("a")
    store.computeScene(layout)
    expect(store.scales!.r.domain()).toEqual([2000, 4000])
    expectContained(store)
  })

  it.each([undefined, "series"])(
    "sizes funnels from per-step totals (stack=%s)",
    (stackBy) => {
      const store = build(
        [
          { category: "Visit", series: "A", value: 60 },
          { category: "Visit", series: "A", value: 60 },
          { category: "Visit", series: "B", value: 30 },
          { category: "Signup", series: "A", value: 20 },
          { category: "Signup", series: "B", value: 10 }
        ],
        { chartType: "bar-funnel", stackBy }
      )
      expect(store.scales!.r.domain()).toEqual([0, stackBy ? 120 : 150])
      expectContained(store)
    }
  )

  for (const projection of ["horizontal", "vertical"] as const) {
    it.each([false, true])(
      `uses net stack totals in ${projection}, normalize=%s`,
      (normalize) => {
        const store = build(
          [
            { category: "A", series: "positive", value: 10 },
            { category: "A", series: "positive", value: -4 },
            { category: "A", series: "negative", value: -4 }
          ],
          { stackBy: "series", normalize, projection }
        )
        expect(store.scales!.r.domain()).toEqual(
          normalize ? [-0.4, 0.6] : [-4, 6]
        )
        expect(store.scene.map((n) => n.datum?.__aggregateValue)).toEqual([
          6, -4
        ])
        expectContained(store)
      }
    )

    it.each([
      [6, 4],
      [-6, -4],
      [0, 0]
    ])(
      `contains one-sided/zero normalized ${projection} stacks %j`,
      (...values) => {
        const store = build(
          values.map((value, i) => ({
            category: "A",
            series: String(i),
            value
          })),
          {
            stackBy: "series",
            normalize: true,
            projection
          }
        )
        expectContained(store)
      }
    )

    it(`uses zero width for zero/negative/nonfinite weights in ${projection}`, () => {
      const store = build(
        [10, 0, -2, NaN, Infinity, 10].map((weight, i) => ({
          category: String(i),
          weight,
          value: 1
        })),
        {
          projection,
          dynamicColumnWidth: "weight",
          barPadding: 0
        }
      )
      const columns = Object.values(store.columns)
      const size = projection === "vertical" ? layout.width : layout.height
      expect(columns.map((c) => c.width)).toEqual([
        size / 2,
        0,
        0,
        0,
        0,
        size / 2
      ])
      expect(columns.at(-1)!.x + columns.at(-1)!.width).toBeCloseTo(size)
      expectContained(store)
    })

    it(`fits variable columns and their gaps in ${projection}`, () => {
      const store = build(
        [10, 0, 30].map((weight, i) => ({
          category: String(i),
          weight,
          value: 1
        })),
        {
          projection,
          dynamicColumnWidth: (rows) => rows[0]?.weight ?? 0,
          barPadding: 40
        }
      )
      const columns = Object.values(store.columns)
      expect(columns[1].width).toBe(0)
      expect(columns[2].width / columns[0].width).toBeCloseTo(3)
      expect(columns[2].x + columns[2].width).toBeCloseTo(
        projection === "vertical" ? layout.width : layout.height
      )
      expectContained(store)
    })

    it(`recalculates both timeline endpoints after eviction, update, removal in ${projection}`, () => {
      const store = build([], {
        chartType: "timeline",
        projection,
        windowSize: 2,
        dataIdAccessor: "id"
      })
      store.ingest({
        inserts: [
          { id: "a", category: "A", value: [0, 10] },
          { id: "b", category: "B", value: [20, 30] }
        ],
        bounded: false
      })
      store.computeScene(layout)
      store.ingest({
        inserts: [{ id: "c", category: "C", value: [50, 40] }],
        bounded: false
      })
      store.computeScene(layout)
      expect(store.scales!.r.domain()).toEqual([20, 50])
      expectContained(store)
      store.update("b", (d) => ({ ...d, value: [35, 45] }))
      store.computeScene(layout)
      expect(store.scales!.r.domain()).toEqual([35, 50])
      expectContained(store)
      store.remove("c")
      store.computeScene(layout)
      expect(store.scales!.r.domain()).toEqual([35, 45])
      expectContained(store)
    })
  }
})
