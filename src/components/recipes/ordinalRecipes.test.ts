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
    // Datum now uses readable keys matching the user's accessors so the
    // default tooltip can find them.
    const amerW = rects.filter((r) => r.datum?.region === "AMER")[0].w
    const emeaW = rects.filter((r) => r.datum?.region === "EMEA")[0].w
    const apacW = rects.filter((r) => r.datum?.region === "APAC")[0].w
    expect(amerW).toBeCloseTo(80 / 180 * 600, 1)
    expect(emeaW).toBeCloseTo(60 / 180 * 600, 1)
    expect(apacW).toBeCloseTo(40 / 180 * 600, 1)
  })

  it("inner segment heights sum to plot height per category (labels off)", () => {
    // showCategoryLabels:false keeps the bars at full plot height so we
    // can compare directly against plot.height. With labels on, the
    // recipe reserves `labelPadding` (default 22px) for the labels.
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "region",
      stackBy: "product",
      valueAccessor: "revenue",
      showCategoryLabels: false,
    }, data))
    const rects = result.nodes! as RectSceneNode[]
    const sumByCat = new Map<string, number>()
    for (const rect of rects) {
      const cat = String(rect.datum?.region ?? "")
      sumByCat.set(cat, (sumByCat.get(cat) ?? 0) + rect.h)
    }
    for (const h of sumByCat.values()) {
      expect(h).toBeCloseTo(300, 0)
    }
  })

  it("emits readable datum keys so the default tooltip works", () => {
    // Regression: original recipe emitted only underscore-prefixed keys
    // which the default tooltip filters out, leaving the tooltip blank.
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "region",
      stackBy: "product",
      valueAccessor: "revenue",
    }, data))
    const rects = result.nodes! as RectSceneNode[]
    const first = rects[0]
    // User-accessor names: region, product, revenue
    expect(first.datum?.region).toBeDefined()
    expect(first.datum?.product).toBeDefined()
    expect(first.datum?.revenue).toBeDefined()
    // Generic fallback names: category, stack, value
    expect(first.datum?.category).toBeDefined()
    expect(first.datum?.stack).toBeDefined()
    expect(first.datum?.value).toBeDefined()
  })

  it("emits category-label overlays by default", () => {
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "region",
      stackBy: "product",
      valueAccessor: "revenue",
    }, data))
    expect(result.overlays).toBeDefined()
  })

  it("does not emit overlays when showCategoryLabels is false", () => {
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "region",
      stackBy: "product",
      valueAccessor: "revenue",
      showCategoryLabels: false,
    }, data))
    expect(result.overlays).toBeNull()
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

  it("does not pollute Object.prototype when accessor names are adversarial", () => {
    // Regression: assigning user-supplied keys like "__proto__" onto a
    // plain object literal mutates the prototype chain (or silently no-ops
    // on the setter, dropping the field). The recipe routes every assignment
    // through createSafeDatum's null-prototype writer so adversarial keys
    // become normal own-properties on the datum and the global prototype is
    // untouched.
    const before = Object.getOwnPropertyNames(Object.prototype).length
    const adversarial = [
      { region: "AMER", product: "Hardware", revenue: 50, polluted: "no" },
    ]
    const result = marimekkoLayout(makeCtx({
      categoryAccessor: "__proto__" as string,
      stackBy: "constructor" as string,
      valueAccessor: "revenue",
    }, adversarial))
    const after = Object.getOwnPropertyNames(Object.prototype).length
    expect(after).toBe(before)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    // The user-supplied "__proto__" accessor must round-trip as an
    // *own-property* on the datum — not be silently dropped by the
    // __proto__ setter on a non-null prototype intermediate.
    const rect = (result.nodes! as RectSceneNode[])[0]
    expect(Object.prototype.hasOwnProperty.call(rect.datum, "__proto__")).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(rect.datum, "constructor")).toBe(true)
  })
})

describe("bulletLayout", () => {
  const data = [
    { metric: "Revenue", actual: 270, target: 250, ranges: [150, 225, 300] },
    { metric: "Profit", actual: 23, target: 27, ranges: [20, 25, 30] },
  ]

  // Bullet now reserves space for a left-side label column (default 120px)
  // and bottom tick numbers; tests use showLabels:false / showTicks:false
  // when checking raw bar geometry to keep math direct.
  const bareCfg = {
    categoryAccessor: "metric",
    valueAccessor: "actual",
    targetAccessor: "target",
    rangesAccessor: "ranges",
    showLabels: false,
    showTicks: false,
  } as const

  it("emits 5 nodes per row (3 ranges + actual + target)", () => {
    const result = bulletLayout(makeCtx(bareCfg, data))
    expect(result.nodes).toHaveLength(10) // 2 rows × 5 nodes
  })

  it("emits row-label + tick overlays by default", () => {
    const result = bulletLayout(makeCtx({
      categoryAccessor: "metric",
      valueAccessor: "actual",
      targetAccessor: "target",
      rangesAccessor: "ranges",
    }, data))
    expect(result.overlays).toBeDefined()
    expect(result.overlays).not.toBeNull()
  })

  it("does not emit overlays when both showLabels and showTicks are false", () => {
    const result = bulletLayout(makeCtx(bareCfg, data))
    expect(result.overlays).toBeNull()
  })

  it("overflow guard accounts for tick chrome (last row's ticks can't spill)", () => {
    // Regression: previous guard only checked rowH; tick labels rendered
    // below the row could fall outside the plot rect. Plot height is
    // capped here to a value where row 1 fits but row 2's ticks would
    // overflow with showTicks enabled — recipe must skip row 2.
    const tightCtx = makeCtx({
      categoryAccessor: "metric",
      valueAccessor: "actual",
      targetAccessor: "target",
      rangesAccessor: "ranges",
      rowHeight: 24,
      rowGap: 8,
      showLabels: false,
      showTicks: true,
    }, data, {
      dimensions: {
        width: 600, height: 60,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        plot: { x: 0, y: 0, width: 600, height: 60 },
      },
    })
    const result = bulletLayout(tightCtx)
    const rects = result.nodes! as RectSceneNode[]
    // Only one row of nodes should be emitted (3 ranges + actual + target = 5).
    // If the guard doesn't include tickAreaH, both rows render and
    // there are 10 nodes.
    expect(rects.length).toBeLessThanOrEqual(5)
  })

  it("reserves labelWidth on the left for row labels", () => {
    // With labelWidth=200, bars start at x = plot.x + 200 = 200.
    const result = bulletLayout(makeCtx({
      categoryAccessor: "metric",
      valueAccessor: "actual",
      targetAccessor: "target",
      rangesAccessor: "ranges",
      showLabels: true,
      labelWidth: 200,
      showTicks: false,
    }, data))
    const rects = result.nodes! as RectSceneNode[]
    const actualBar = rects.find((r) => r.datum?.metric === "Revenue" && r.datum?.kind === "actual")!
    // Actual bar always starts at the left edge of the bullet area.
    expect(actualBar.x).toBe(200)
  })

  it("actual bar width is proportional to actual / max(actual,target,ranges)", () => {
    const result = bulletLayout(makeCtx(bareCfg, data))
    const rects = result.nodes! as RectSceneNode[]
    // Revenue: actual=270, max=300 → width = 270/300 * bulletW.
    // showLabels:false → bulletW = plot.width = 600.
    const revenueActual = rects.find(
      (r) => r.datum?.metric === "Revenue" && r.datum?.kind === "actual"
    )!
    expect(revenueActual.w).toBeCloseTo(270 / 300 * 600, 1)
  })

  it("target tick is narrow and centered at target value", () => {
    const result = bulletLayout(makeCtx({ ...bareCfg, rowHeight: 40 }, data))
    const rects = result.nodes! as RectSceneNode[]
    const target = rects.find(
      (r) => r.datum?.metric === "Revenue" && r.datum?.kind === "target"
    )!
    expect(target.w).toBeLessThanOrEqual(4)
    // Target=250, max=300 → x ≈ 250/300 * 600 = 500 (minus half tick width)
    expect(target.x).toBeCloseTo(500 - target.w / 2, 1)
  })

  it("clamps negative inputs to 0 (bullet axis is non-negative)", () => {
    const negativeData = [
      { metric: "Loss", actual: -50, target: -20, ranges: [-10, 50, 100] },
    ]
    const result = bulletLayout(makeCtx(bareCfg, negativeData))
    const rects = result.nodes! as RectSceneNode[]
    for (const r of rects) {
      expect(r.w).toBeGreaterThanOrEqual(0)
    }
    const actualBar = rects.find((r) => r.datum?.kind === "actual")!
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

  it("does not pollute Object.prototype when accessor names are adversarial", () => {
    // Regression: bullet emits datum objects keyed by user-supplied
    // accessor names. createSafeDatum's null-prototype writer keeps
    // "__proto__" assignments as own-properties instead of routing them
    // through the prototype setter on an intermediate object.
    const before = Object.getOwnPropertyNames(Object.prototype).length
    const result = bulletLayout(makeCtx({
      categoryAccessor: "__proto__" as string,
      valueAccessor: "constructor" as string,
      targetAccessor: "prototype" as string,
      rangesAccessor: "ranges",
    }, [{ metric: "X", actual: 50, target: 60, ranges: [10, 50, 100] }]))
    const after = Object.getOwnPropertyNames(Object.prototype).length
    expect(after).toBe(before)
    // Each rect's datum must surface the user-supplied accessor name as
    // an own-property, not silently lose it to the __proto__ setter.
    const rects = result.nodes! as RectSceneNode[]
    const actualRect = rects.find((r) => r.datum?.kind === "actual")!
    const targetRect = rects.find((r) => r.datum?.kind === "target")!
    expect(Object.prototype.hasOwnProperty.call(actualRect.datum, "__proto__")).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(actualRect.datum, "constructor")).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(targetRect.datum, "prototype")).toBe(true)
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

  it("emits axis chrome overlays by default", () => {
    const result = parallelCoordinatesLayout(makeCtx({
      fields: ["mpg", "hp", "weight"],
    }, data))
    expect(result.overlays).toBeDefined()
    expect(result.overlays).not.toBeNull()
  })

  it("does not emit overlays when showAxes is false", () => {
    const result = parallelCoordinatesLayout(makeCtx({
      fields: ["mpg", "hp", "weight"],
      showAxes: false,
    }, data))
    expect(result.overlays).toBeNull()
  })

  it("highlightFn dims non-matching rows and z-orders matches on top", () => {
    // 3 rows, 2 segments each = 6 connectors total. Highlight only the
    // first row → 4 dimmed connectors first, then 2 highlighted.
    const result = parallelCoordinatesLayout(makeCtx({
      fields: ["mpg", "hp", "weight"],
      highlightFn: (d) => d.mpg === 30, // only first row
      dimmedOpacity: 0.05,
      opacity: 0.5,
      showAxes: false,
    }, data))
    const segs = result.nodes! as ConnectorSceneNode[]
    expect(segs).toHaveLength(6)
    // First 4 are dimmed (rows 2 + 3); last 2 are highlighted (row 1).
    for (let i = 0; i < 4; i++) {
      expect(segs[i].style.opacity).toBeCloseTo(0.05, 3)
    }
    for (let i = 4; i < 6; i++) {
      // Highlighted row's opacity is opacity + 0.4 = 0.9, capped at 1.
      expect(segs[i].style.opacity).toBeGreaterThan(0.5)
    }
  })

  it("highlightFn=undefined leaves all rows at uniform opacity", () => {
    const result = parallelCoordinatesLayout(makeCtx({
      fields: ["mpg", "hp", "weight"],
      opacity: 0.4,
      showAxes: false,
    }, data))
    const segs = result.nodes! as ConnectorSceneNode[]
    for (const seg of segs) {
      expect(seg.style.opacity).toBeCloseTo(0.4, 3)
    }
  })
})
