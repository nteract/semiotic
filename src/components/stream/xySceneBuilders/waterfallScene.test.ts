import { describe, it, expect } from "vitest"
import { buildWaterfallScene } from "./waterfallScene"
import type { XYSceneContext } from "./types"
import type { Datum } from "../../charts/shared/datumTypes"

/** Minimal identity scales for testing — no pixel transform */
function makeCtx(overrides: Partial<XYSceneContext> = {}): XYSceneContext {
  const identity = (v: number) => v
  const identityScale = Object.assign(identity, { domain: () => [0, 100], range: () => [0, 400] })
  return {
    scales: { x: identityScale, y: identityScale } as unknown as XYSceneContext["scales"],
    config: {},
    getX: (d) => d.x,
    getY: (d) => d.y,
    resolveLineStyle: () => ({ stroke: "#000" }),
    resolveAreaStyle: () => ({ fill: "#000" }),
    resolveBoundsStyle: () => ({ fill: "#ccc" }),
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

const defaultLayout = { width: 400, height: 300, x: 0, y: 0 }

describe("buildWaterfallScene", () => {
  it("emits rect nodes with correct cumulative baselines", () => {
    const data = [
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: -5 },
    ]
    const ctx = makeCtx({ config: { waterfallStyle: { gap: 0 } } })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(3)

    // Bar 1: baseline=0, cumEnd=10, delta=10
    const bar1 = nodes[0]
    expect(bar1.type).toBe("rect")
    expect(bar1.datum!.baseline).toBe(0)
    expect(bar1.datum!.cumEnd).toBe(10)
    expect(bar1.datum!.delta).toBe(10)

    // Bar 2: baseline=10, cumEnd=30, delta=20
    const bar2 = nodes[1]
    expect(bar2.datum!.baseline).toBe(10)
    expect(bar2.datum!.cumEnd).toBe(30)
    expect(bar2.datum!.delta).toBe(20)

    // Bar 3: baseline=30, cumEnd=25, delta=-5
    const bar3 = nodes[2]
    expect(bar3.datum!.baseline).toBe(30)
    expect(bar3.datum!.cumEnd).toBe(25)
    expect(bar3.datum!.delta).toBe(-5)
  })

  it("assigns positiveColor for positive deltas and negativeColor for negative", () => {
    const data = [
      { x: 0, y: 10 },
      { x: 10, y: -3 },
      { x: 20, y: 0 },  // zero delta treated as positive (>= 0)
    ]
    const ctx = makeCtx({
      config: {
        waterfallStyle: {
          positiveColor: "#0f0",
          negativeColor: "#f00",
          gap: 0,
        },
      },
    })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(3)
    expect(nodes[0].style.fill).toBe("#0f0")
    expect(nodes[1].style.fill).toBe("#f00")
    // zero delta >= 0, so positive
    expect(nodes[2].style.fill).toBe("#0f0")
  })

  it("uses default colors when waterfallStyle is not provided", () => {
    const data = [
      { x: 0, y: 5 },
      { x: 10, y: -2 },
    ]
    const ctx = makeCtx()
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes[0].style.fill).toBe("#28a745")
    expect(nodes[1].style.fill).toBe("#dc3545")
  })

  it("filters out null/NaN Y values", () => {
    const data = [
      { x: 0, y: 10 },
      { x: 10, y: null },
      { x: 20, y: NaN },
      { x: 30, y: 5 },
    ]
    const ctx = makeCtx({ config: { waterfallStyle: { gap: 0 } } })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    // Only x=0 and x=30 survive filtering
    expect(nodes).toHaveLength(2)
    // Second valid bar baseline is cumEnd of first (10)
    expect(nodes[1].datum!.baseline).toBe(10)
    expect(nodes[1].datum!.cumEnd).toBe(15)
  })

  it("filters out non-finite X values", () => {
    const data = [
      { x: 0, y: 10 },
      { x: Infinity, y: 5 },
      { x: -Infinity, y: 3 },
      { x: NaN, y: 2 },
      { x: 20, y: 7 },
    ]
    const ctx = makeCtx({ config: { waterfallStyle: { gap: 0 } } })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(2)
    expect(nodes[0].datum!.x).toBe(0)
    expect(nodes[1].datum!.x).toBe(20)
  })

  it("filters out null X values", () => {
    const data = [
      { x: null, y: 10 },
      { x: 5, y: 7 },
    ]
    const ctx = makeCtx({ config: { waterfallStyle: { gap: 0 } } })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(1)
    expect(nodes[0].datum!.x).toBe(5)
  })

  it("applies gap symmetrically, narrowing bars", () => {
    // Two bars at x=0 and x=10 with gap=4
    // Their centered cells are [-5, 5] and [5, 15]. A 4px gap narrows
    // each side by 2px.
    const data = [
      { x: 0, y: 10 },
      { x: 10, y: 5 },
    ]
    const ctx = makeCtx({ config: { waterfallStyle: { gap: 4 } } })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(2)
    // Both bars have barWidth = 10 - 4 = 6
    expect(nodes[0].w).toBe(6)
    expect(nodes[1].w).toBe(6)
    expect(nodes[0].x).toBe(-3)
    expect(nodes[1].x).toBe(7)
  })

  it("uses fallback bar width for single data point", () => {
    // A single point uses a centered fallback cell of layout.width/10.
    const data = [{ x: 5, y: 10 }]
    const ctx = makeCtx({ config: { waterfallStyle: { gap: 1 } } })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(1)
    const bar = nodes[0]
    expect(bar.x).toBe(-14.5)
    expect(bar.w).toBe(39)
  })

  it("returns empty array for empty data", () => {
    const ctx = makeCtx()
    const nodes = buildWaterfallScene(ctx, [], defaultLayout)
    expect(nodes).toEqual([])
  })

  it("returns empty array when all data is invalid", () => {
    const data = [
      { x: NaN, y: 10 },
      { x: 5, y: null },
    ]
    const ctx = makeCtx()
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)
    expect(nodes).toEqual([])
  })

  it("computes correct x, y, w, h coordinates on rect nodes", () => {
    // Two bars, gap=0, identity scale
    // Bar 1: x=0, delta=10 → baseline=0, cumEnd=10
    //   centered cell spans -5..5
    //   yBaseline=scale(0)=0, yTop=scale(10)=10
    //   rectY=min(0,10)=0, rectH=|0-10|=10
    // Bar 2: x=10, delta=-3 → baseline=10, cumEnd=7
    //   centered cell spans 5..15
    //   yBaseline=scale(10)=10, yTop=scale(7)=7
    //   rectY=min(10,7)=7, rectH=|10-7|=3
    const data = [
      { x: 0, y: 10 },
      { x: 10, y: -3 },
    ]
    const ctx = makeCtx({ config: { waterfallStyle: { gap: 0 } } })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    const bar1 = nodes[0]
    expect(bar1.x).toBe(-5)
    expect(bar1.y).toBe(0)
    expect(bar1.w).toBe(10)
    expect(bar1.h).toBe(10)

    const bar2 = nodes[1]
    expect(bar2.x).toBe(5)
    expect(bar2.y).toBe(7)
    expect(bar2.w).toBe(10)
    expect(bar2.h).toBe(3)
  })

  it("passes stroke and strokeWidth from waterfallStyle to rect nodes", () => {
    const data = [{ x: 0, y: 10 }, { x: 10, y: 5 }]
    const ctx = makeCtx({
      config: {
        waterfallStyle: { gap: 0, stroke: "#333", strokeWidth: 2 },
      },
    })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes[0].style.stroke).toBe("#333")
    expect(nodes[0].style.strokeWidth).toBe(2)
  })

  it("preserves waterfallStyle cursor on emitted bars", () => {
    const ctx = makeCtx({
      config: { waterfallStyle: { gap: 0, cursor: "pointer" } },
    })
    const nodes = buildWaterfallScene(
      ctx,
      [{ x: 0, y: 10 }, { x: 10, y: 5 }],
      defaultLayout
    )
    expect(nodes[0]?.style.cursor).toBe("pointer")
  })

  it("stores connector metadata on datum for downstream rendering", () => {
    const data = [{ x: 0, y: 10 }, { x: 10, y: 5 }]
    const ctx = makeCtx({
      config: {
        waterfallStyle: {
          gap: 0,
          connectorStroke: "#999",
          connectorWidth: 1.5,
        },
      },
    })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    expect(nodes[0].datum!._connectorStroke).toBe("#999")
    expect(nodes[0].datum!._connectorWidth).toBe(1.5)
  })

  it("skips bars with zero or negative width after gap is applied", () => {
    // All centered cells are narrower than the requested 4px gap.
    const data = [
      { x: 0, y: 10 },
      { x: 1, y: 5 },
      { x: 3, y: 3 },
    ]
    const ctx = makeCtx({ config: { waterfallStyle: { gap: 4 } } })
    const nodes = buildWaterfallScene(ctx, data, defaultLayout)

    // All bars have barWidth <= 0 (gap too large for the spacing)
    expect(nodes).toHaveLength(0)
  })

  // ── Status-aware defaults (Phase A milestone 3) ──────────────────────
  //
  // Positive/negative bars default to the theme's success/danger roles
  // when waterfallStyle doesn't override them.
  describe("themeSemantic.success/.danger defaults", () => {
    it("positive bar uses themeSemantic.success when waterfallStyle.positiveColor absent", () => {
      const data = [{ x: 0, y: 10 }]
      const ctx = makeCtx({
        config: { themeSemantic: { success: "#0b8457", danger: "#c23030" } },
      })
      const nodes = buildWaterfallScene(ctx, data, defaultLayout)
      expect(nodes[0].style.fill).toBe("#0b8457")
    })

    it("negative bar uses themeSemantic.danger when waterfallStyle.negativeColor absent", () => {
      const data = [{ x: 0, y: -10 }]
      const ctx = makeCtx({
        config: { themeSemantic: { success: "#0b8457", danger: "#c23030" } },
      })
      const nodes = buildWaterfallScene(ctx, data, defaultLayout)
      expect(nodes[0].style.fill).toBe("#c23030")
    })

    it("waterfallStyle.positiveColor wins over themeSemantic.success", () => {
      const data = [{ x: 0, y: 10 }]
      const ctx = makeCtx({
        config: {
          waterfallStyle: { positiveColor: "#ff00aa" },
          themeSemantic: { success: "#0b8457" },
        },
      })
      const nodes = buildWaterfallScene(ctx, data, defaultLayout)
      expect(nodes[0].style.fill).toBe("#ff00aa")
    })

    it("waterfallStyle.negativeColor wins over themeSemantic.danger", () => {
      const data = [{ x: 0, y: -10 }]
      const ctx = makeCtx({
        config: {
          waterfallStyle: { negativeColor: "#ff00aa" },
          themeSemantic: { danger: "#c23030" },
        },
      })
      const nodes = buildWaterfallScene(ctx, data, defaultLayout)
      expect(nodes[0].style.fill).toBe("#ff00aa")
    })

    it("hardcoded status green/red fallbacks remain when no theme is present", () => {
      const dataPos = [{ x: 0, y: 10 }]
      const dataNeg = [{ x: 0, y: -10 }]
      const ctx = makeCtx()
      expect(buildWaterfallScene(ctx, dataPos, defaultLayout)[0].style.fill).toBe("#28a745")
      expect(buildWaterfallScene(ctx, dataNeg, defaultLayout)[0].style.fill).toBe("#dc3545")
    })
  })
})
