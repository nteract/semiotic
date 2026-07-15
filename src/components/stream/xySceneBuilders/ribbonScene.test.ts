import { describe, it, expect } from "vitest"
import {
  buildRibbonForGroup,
  buildAggregateRibbons,
  buildPerSeriesRibbons,
  partitionRibbons,
  type ResolvedRibbon,
} from "./ribbonScene"
import type { XYSceneContext } from "./types"
import type { Datum } from "../../charts/shared/datumTypes"

/** Identity scales: pixel = data value. Lets tests assert raw coords. */
function makeCtx(overrides: Partial<XYSceneContext> = {}): XYSceneContext {
  const identity = (v: number) => v
  const identityScale = Object.assign(identity, { domain: () => [0, 100], range: () => [0, 400] })
  return {
    scales: { x: identityScale, y: identityScale } as unknown as XYSceneContext["scales"],
    config: {},
    getX: (d) => d.x,
    getY: (d) => d.y,
    resolveLineStyle: () => ({ stroke: "#1f77b4" }),
    resolveAreaStyle: () => ({ fill: "#1f77b4" }),
    resolveBoundsStyle: () => ({ fill: "#1f77b4", fillOpacity: 0.2, stroke: "none" }),
    resolveColorMap: () => new Map(),
    resolveGroupColor: () => null,
    groupData: (data) => {
      const map = new Map<string, Datum[]>()
      for (const d of data) {
        const key = d.group ?? "default"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(d)
      }
      return Array.from(map, ([key, data]) => ({ key, data }))
    },
    ...overrides,
  }
}

function makeBandRibbon(overrides: Partial<ResolvedRibbon> = {}): ResolvedRibbon {
  return {
    kind: "band",
    getTop: (d: Datum) => d.hi,
    getBottom: (d: Datum) => d.lo,
    perSeries: true,
    interactive: false,
    ...overrides,
  }
}

/** Bounds-style ribbon — top/bottom are `y ± offset`, collapsing to `y`
 *  when the offset is not a finite non-zero number. Mirrors the
 *  production resolution in PipelineStore.resolveRibbons (null/NaN y
 *  yields NaN top/bottom so the scene builder skips the datum). */
function makeBoundsRibbon(offsetGet: (d: Datum) => number, overrides: Partial<ResolvedRibbon> = {}): ResolvedRibbon {
    const rawY = (d: Datum) => d.y == null ? Number.NaN : Number(d.y)
  return {
    kind: "bounds",
      getTop: (d: Datum) => {
      const y = rawY(d)
      if (!Number.isFinite(y)) return Number.NaN
      const o = offsetGet(d)
      return Number.isFinite(o) && o !== 0 ? y + o : y
    },
      getBottom: (d: Datum) => {
      const y = rawY(d)
      if (!Number.isFinite(y)) return Number.NaN
      const o = offsetGet(d)
      return Number.isFinite(o) && o !== 0 ? y - o : y
    },
    perSeries: true,
    interactive: false,
    ...overrides,
  }
}

describe("buildRibbonForGroup — common primitive", () => {
  it("returns null when there are fewer than 2 valid datums", () => {
    const ctx = makeCtx()
    const data = [{ x: 1, lo: 0, hi: 10 }]
    expect(buildRibbonForGroup(ctx, data, "default", makeBandRibbon())).toBeNull()
  })

  it("topPath traces getTop; bottomPath traces getBottom", () => {
    const ctx = makeCtx()
    const data = [
      { x: 10, lo: 4, hi: 20 },
      { x: 20, lo: 8, hi: 24 },
      { x: 30, lo: 6, hi: 30 },
    ]
    const node = buildRibbonForGroup(ctx, data, "default", makeBandRibbon())!
    expect(node.topPath).toEqual([
      [10, 20], [20, 24], [30, 30],
    ])
    expect(node.bottomPath).toEqual([
      [10, 4], [20, 8], [30, 6],
    ])
  })

  it("skips datums when x, top, or bottom is non-finite (gap semantics)", () => {
    const ctx = makeCtx()
    const data = [
      { x: 1, lo: 0, hi: 10 },
      { x: null, lo: 0, hi: 10 },      // null x → skip
      { x: 2, lo: NaN, hi: 10 },       // NaN bottom → skip
      { x: 3, lo: 5, hi: null },       // null top → skip
      { x: 4, lo: 4, hi: 14 },
    ]
    const node = buildRibbonForGroup(ctx, data, "default", makeBandRibbon())!
    expect(node.topPath).toEqual([[1, 10], [4, 14]])
    expect(node.bottomPath).toEqual([[1, 0], [4, 4]])
  })

  it("falls back to resolveBoundsStyle when ribbon.style is omitted", () => {
    const ctx = makeCtx({
      resolveBoundsStyle: () => ({ fill: "#abc", fillOpacity: 0.2 }),
    })
    const data = [{ x: 1, lo: 0, hi: 10 }, { x: 2, lo: 1, hi: 11 }]
    const node = buildRibbonForGroup(ctx, data, "default", makeBandRibbon())!
    expect(node.style).toEqual({ fill: "#abc", fillOpacity: 0.2 })
  })

  it("uses static style override when provided", () => {
    const style = { fill: "#f00", fillOpacity: 0.4, stroke: "none" }
    const data = [{ x: 1, lo: 0, hi: 10 }, { x: 2, lo: 1, hi: 11 }]
    const node = buildRibbonForGroup(makeCtx(), data, "default", makeBandRibbon({ style }))!
    expect(node.style).toEqual(style)
  })

  it("calls style function with the first datum and group key", () => {
    let receivedGroup: string | undefined
    let receivedDatum: Datum | undefined
    const data = [
      { x: 1, lo: 0, hi: 10, label: "first" },
      { x: 2, lo: 1, hi: 11, label: "second" },
    ]
    const node = buildRibbonForGroup(makeCtx(), data, "regionA", makeBandRibbon({
      style: (d, group) => {
        receivedGroup = group
        receivedDatum = d
        return { fill: "#0f0" }
      },
    }))!
    expect(receivedGroup).toBe("regionA")
    expect(receivedDatum).toEqual({ x: 1, lo: 0, hi: 10, label: "first" })
    expect(node.style).toEqual({ fill: "#0f0" })
  })

  it("interactive flag flows from ribbon to scene node", () => {
    const data = [{ x: 1, lo: 0, hi: 10 }, { x: 2, lo: 1, hi: 11 }]
    expect(buildRibbonForGroup(makeCtx(), data, "g", makeBandRibbon())!.interactive).toBe(false)
    expect(buildRibbonForGroup(makeCtx(), data, "g", makeBandRibbon({ interactive: true }))!.interactive).toBe(true)
  })

  it("preserves group key and source datum array on the scene node", () => {
    const data = [{ x: 1, lo: 0, hi: 10 }, { x: 2, lo: 1, hi: 11 }]
    const node = buildRibbonForGroup(makeCtx(), data, "seriesA", makeBandRibbon())!
    expect(node.group).toBe("seriesA")
    expect(node.datum).toBe(data)
  })

  it("applies the y scale to top and bottom coordinates", () => {
    const double = (v: number) => v * 2
    const doubleScale = Object.assign(double, { domain: () => [0, 50], range: () => [0, 100] })
    const ctx = makeCtx({
      scales: { x: doubleScale, y: doubleScale } as unknown as XYSceneContext["scales"],
    })
    const data = [{ x: 5, lo: 1, hi: 10 }, { x: 10, lo: 2, hi: 12 }]
    const node = buildRibbonForGroup(ctx, data, "default", makeBandRibbon())!
    expect(node.topPath).toEqual([[10, 20], [20, 24]])
    expect(node.bottomPath).toEqual([[10, 2], [20, 4]])
  })
})

// ── Bounds (symmetric ±offset) — legacy behaviors pinned ───────────────

describe("buildRibbonForGroup — bounds (symmetric)", () => {
  it("emits an envelope at y+offset / y-offset around the line", () => {
    const ctx = makeCtx()
    const data = [
      { x: 10, y: 50, offset: 10 },
      { x: 20, y: 60, offset: 15 },
      { x: 30, y: 70, offset: 5 },
    ]
    const node = buildRibbonForGroup(ctx, data, "default", makeBoundsRibbon(d => d.offset))!
    expect(node.topPath).toEqual([[10, 60], [20, 75], [30, 75]])
    expect(node.bottomPath).toEqual([[10, 40], [20, 45], [30, 65]])
  })

  it("zero or null offset collapses to topPath === bottomPath (degenerate ribbon, no gap)", () => {
    const ctx = makeCtx()
    const data = [{ x: 10, y: 30 }, { x: 20, y: 50 }]
    const zero = buildRibbonForGroup(ctx, data, "default", makeBoundsRibbon(() => 0))!
    expect(zero.topPath).toEqual([[10, 30], [20, 50]])
    expect(zero.bottomPath).toEqual([[10, 30], [20, 50]])
    const nul = buildRibbonForGroup(ctx, data, "default", makeBoundsRibbon(() => null as unknown as number))!
    expect(nul.topPath).toEqual(nul.bottomPath)
  })

  it("negative offset inverts top/bottom (top below bottom)", () => {
    const ctx = makeCtx()
    const data = [{ x: 5, y: 50 }, { x: 15, y: 80 }]
    const node = buildRibbonForGroup(ctx, data, "default", makeBoundsRibbon(() => -10))!
    expect(node.topPath).toEqual([[5, 40], [15, 70]])
    expect(node.bottomPath).toEqual([[5, 60], [15, 90]])
  })

  it("skips datums where y itself is non-finite (offset can't rescue)", () => {
    const ctx = makeCtx()
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: null },
      { x: 3, y: NaN },
      { x: 4, y: 40 },
    ]
    const node = buildRibbonForGroup(ctx, data, "default", makeBoundsRibbon(() => 5))!
    expect(node.topPath).toEqual([[1, 15], [4, 45]])
    expect(node.bottomPath).toEqual([[1, 5], [4, 35]])
  })
})

// ── Partition + multi-build helpers ────────────────────────────────────

describe("partitionRibbons", () => {
  it("splits perSeries=true vs perSeries=false ribbons", () => {
    const a = makeBandRibbon({ perSeries: true })
    const b = makeBandRibbon({ perSeries: false })
    const c = makeBoundsRibbon(() => 5, { perSeries: true })
    const { perSeries, aggregate } = partitionRibbons([a, b, c])
    expect(perSeries).toEqual([a, c])
    expect(aggregate).toEqual([b])
  })

  it("handles undefined and empty inputs", () => {
    expect(partitionRibbons(undefined)).toEqual({ perSeries: [], aggregate: [] })
    expect(partitionRibbons([])).toEqual({ perSeries: [], aggregate: [] })
  })
})

describe("buildAggregateRibbons", () => {
  it("emits one scene node per aggregate ribbon, painted across the full dataset", () => {
    const ctx = makeCtx()
    const data = [
      { x: 1, lo: 0, hi: 10, group: "A" },
      { x: 2, lo: 0, hi: 10, group: "B" },
      { x: 3, lo: 0, hi: 10, group: "A" },
    ]
    const ribbons = [makeBandRibbon({ perSeries: false }), makeBandRibbon({ perSeries: false })]
    const nodes = buildAggregateRibbons(ctx, data, ribbons)
    expect(nodes).toHaveLength(2)
    expect(nodes[0].topPath).toHaveLength(3)
    expect(nodes[0].group).toBe("__ribbon_aggregate")
  })
})

describe("buildPerSeriesRibbons", () => {
  it("emits one scene node per ribbon for one group's data slice", () => {
    const ctx = makeCtx()
    const data = [{ x: 1, lo: 0, hi: 10 }, { x: 2, lo: 1, hi: 11 }]
    const ribbons = [makeBandRibbon(), makeBandRibbon({ style: { fill: "#f0f" } })]
    const nodes = buildPerSeriesRibbons(ctx, data, "regionA", ribbons)
    expect(nodes).toHaveLength(2)
    for (const node of nodes) {
      expect(node.group).toBe("regionA")
    }
  })
})
