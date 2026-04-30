import { describe, it, expect } from "vitest"
import { scaleBand, scaleLinear } from "d3-scale"
import { marimekkoLayout } from "./marimekko"
import { bulletLayout } from "./bullet"
import { parallelCoordinatesLayout } from "./parallelCoordinates"
import type { OrdinalLayoutContext } from "../stream/ordinalCustomLayout"
import type { RectSceneNode } from "../stream/types"
import type { ConnectorSceneNode } from "../stream/ordinalTypes"

function makeCtx<C extends object>(
  config: C,
  data: Record<string, unknown>[],
  overrides?: Partial<OrdinalLayoutContext<C>>
): OrdinalLayoutContext<C> {
  const o = scaleBand<string>().domain([]).range([0, 600])
  const r = scaleLinear().domain([0, 100]).range([300, 0])
  return {
    data,
    scales: { o, r, projection: "vertical" },
    dimensions: {
      width: 600,
      height: 300,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      plot: { x: 0, y: 0, width: 600, height: 300 },
    },
    theme: {
      semantic: { primary: "#4e79a7", surface: "#eee", grid: "#ccc", border: "#aaa", text: "#222" },
      categorical: ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f"],
    },
    resolveColor: (key) => {
      const palette = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f"]
      let h = 0
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
      return palette[Math.abs(h) % palette.length]
    },
    config,
    ...overrides,
  }
}

describe("marimekkoLayout", () => {
  const data = [
    { region: "AMER", product: "Hardware", revenue: 50 },
    { region: "AMER", product: "Software", revenue: 30 },
    { region: "EMEA", product: "Hardware", revenue: 40 },
    { region: "EMEA", product: "Software", revenue: 20 },
    { region: "APAC", product: "Hardware", revenue: 30 },
    { region: "APAC", product: "Software", revenue: 10 },
  ]

  it("emits one rect per (category, stack) cell", () => {
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "region",
      stackBy: "product",
      valueAccessor: "revenue",
    }, data))
    expect(result.nodes).toHaveLength(6) // 3 regions × 2 products
  })

  it("category bar widths are proportional to category totals", () => {
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "region",
      stackBy: "product",
      valueAccessor: "revenue",
      gutter: 0,
    }, data))
    // Totals: AMER=80, EMEA=60, APAC=40 → grand=180
    // Plot width 600 → AMER=266.67, EMEA=200, APAC=133.33
    const rects = result.nodes! as RectSceneNode[]
    const amerW = rects.filter((r) => r.datum?._marimekkoCategory === "AMER")[0].w
    const emeaW = rects.filter((r) => r.datum?._marimekkoCategory === "EMEA")[0].w
    const apacW = rects.filter((r) => r.datum?._marimekkoCategory === "APAC")[0].w
    expect(amerW).toBeCloseTo(80 / 180 * 600, 1)
    expect(emeaW).toBeCloseTo(60 / 180 * 600, 1)
    expect(apacW).toBeCloseTo(40 / 180 * 600, 1)
  })

  it("inner segment heights sum to plot height per category", () => {
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "region",
      stackBy: "product",
      valueAccessor: "revenue",
    }, data))
    const rects = result.nodes! as RectSceneNode[]
    const sumByCat = new Map<string, number>()
    for (const rect of rects) {
      const cat = String(rect.datum?._marimekkoCategory ?? "")
      sumByCat.set(cat, (sumByCat.get(cat) ?? 0) + rect.h)
    }
    for (const h of sumByCat.values()) {
      expect(h).toBeCloseTo(300, 0)
    }
  })

  it("emits empty array when grand total is zero", () => {
    const zeroData = [{ region: "AMER", product: "X", revenue: 0 }]
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "region",
      stackBy: "product",
      valueAccessor: "revenue",
    }, zeroData))
    expect(result.nodes).toEqual([])
  })
})

describe("bulletLayout", () => {
  const data = [
    { metric: "Revenue", actual: 270, target: 250, ranges: [150, 225, 300] },
    { metric: "Profit", actual: 23, target: 27, ranges: [20, 25, 30] },
  ]

  it("emits 5 nodes per row (3 ranges + actual + target)", () => {
    const result = bulletLayout(makeCtx({
      categoryAccessor: "metric",
      valueAccessor: "actual",
      targetAccessor: "target",
      rangesAccessor: "ranges",
    }, data))
    expect(result.nodes).toHaveLength(10) // 2 rows × 5 nodes
  })

  it("actual bar width is proportional to actual / max(actual,target,ranges)", () => {
    const result = bulletLayout(makeCtx({
      categoryAccessor: "metric",
      valueAccessor: "actual",
      targetAccessor: "target",
      rangesAccessor: "ranges",
    }, data))
    const rects = result.nodes! as RectSceneNode[]
    // Revenue: actual=270, max=300 → width = 270/300 * 600 = 540
    const revenueActual = rects.find(
      (r) => r.datum?._bulletRow === "Revenue" && r.datum?._bulletKind === "actual"
    )!
    expect(revenueActual.w).toBeCloseTo(270 / 300 * 600, 1)
  })

  it("target tick is narrow and centered at target value", () => {
    const result = bulletLayout(makeCtx({
      categoryAccessor: "metric",
      valueAccessor: "actual",
      targetAccessor: "target",
      rangesAccessor: "ranges",
      rowHeight: 40,
    }, data))
    const rects = result.nodes! as RectSceneNode[]
    const target = rects.find(
      (r) => r.datum?._bulletRow === "Revenue" && r.datum?._bulletKind === "target"
    )!
    expect(target.w).toBeLessThanOrEqual(4) // narrow tick
    // Target=250, max=300 → x ≈ 250/300 * 600 = 500 (minus half tick width)
    expect(target.x).toBeCloseTo(500 - target.w / 2, 1)
  })

  it("clamps negative inputs to 0 (bullet axis is non-negative)", () => {
    // Regression: negative actual/target/range values used to produce
    // inverted-width rects. Bullet inputs are non-negative by contract;
    // values < 0 (or non-finite) clamp to 0.
    const negativeData = [
      { metric: "Loss", actual: -50, target: -20, ranges: [-10, 50, 100] },
    ]
    const result = bulletLayout(makeCtx({
      categoryAccessor: "metric",
      valueAccessor: "actual",
      targetAccessor: "target",
      rangesAccessor: "ranges",
    }, negativeData))
    const rects = result.nodes! as RectSceneNode[]
    // No rect should have negative width.
    for (const r of rects) {
      expect(r.w).toBeGreaterThanOrEqual(0)
    }
    // Actual at value=0 → zero-width bar. Target at value=0 → narrow tick at x=0 - tickW/2.
    const actualBar = rects.find((r) => r.datum?._bulletKind === "actual")!
    expect(actualBar.w).toBe(0)
  })

  it("sorts range thresholds ascending regardless of input order", () => {
    // Regression: ranges given out of order used to paint bands in the
    // wrong sequence and produce overlapping/inverted geometry.
    const unsortedData = [
      { metric: "Mixed", actual: 50, target: 60, ranges: [100, 25, 75] },
    ]
    const result = bulletLayout(makeCtx({
      categoryAccessor: "metric",
      valueAccessor: "actual",
      targetAccessor: "target",
      rangesAccessor: "ranges",
    }, unsortedData))
    const rects = result.nodes! as RectSceneNode[]
    const rangeRects = rects.filter((r) => String(r.group ?? "").startsWith("range-"))
    // Each subsequent range band should start at or after the previous
    // band's right edge (no overlap, no negative width).
    for (let i = 1; i < rangeRects.length; i++) {
      expect(rangeRects[i].x).toBeGreaterThanOrEqual(rangeRects[i - 1].x + rangeRects[i - 1].w - 1e-6)
    }
  })
})

describe("parallelCoordinatesLayout", () => {
  const data = [
    { mpg: 30, hp: 100, weight: 2500 },
    { mpg: 18, hp: 200, weight: 4000 },
    { mpg: 24, hp: 150, weight: 3200 },
  ]

  it("emits N-1 connector segments per datum", () => {
    const result = parallelCoordinatesLayout(makeCtx({
      fields: ["mpg", "hp", "weight"],
    }, data))
    // 3 fields → 2 segments per datum × 3 datums = 6
    expect(result.nodes).toHaveLength(6)
    for (const n of result.nodes!) {
      expect(n.type).toBe("connector")
    }
  })

  it("points option adds N point nodes per datum", () => {
    const result = parallelCoordinatesLayout(makeCtx({
      fields: ["mpg", "hp", "weight"],
      showPoints: true,
    }, data))
    // 3 datums × (2 segments + 3 points) = 15
    expect(result.nodes).toHaveLength(15)
  })

  it("connector x-coords land on evenly-spaced axis positions", () => {
    const result = parallelCoordinatesLayout(makeCtx({
      fields: ["mpg", "hp", "weight"],
    }, data))
    const segs = result.nodes! as ConnectorSceneNode[]
    // Plot width 600 → axes at x = 0, 300, 600
    const expectedX = [0, 300, 600]
    for (const s of segs) {
      expect(expectedX).toContain(s.x1)
      expect(expectedX).toContain(s.x2)
    }
  })

  it("returns empty when fewer than 2 fields configured", () => {
    const result = parallelCoordinatesLayout(makeCtx({
      fields: ["mpg"],
    }, data))
    expect(result.nodes).toEqual([])
  })
})
