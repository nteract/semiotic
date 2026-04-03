import { describe, it, expect } from "vitest"
import { buildCandlestickScene } from "./candlestickScene"
import type { XYSceneContext } from "./types"
import type { CandlestickSceneNode } from "../types"

/** Minimal identity scales for testing — no pixel transform */
function makeCtx(overrides: Partial<XYSceneContext> = {}): XYSceneContext {
  const identity = (v: number) => v
  const identityScale = Object.assign(identity, { domain: () => [0, 100], range: () => [0, 400] })
  return {
    scales: { x: identityScale, y: identityScale } as any,
    config: {},
    getX: (d) => d.x,
    getY: (d) => d.y,
    getOpen: (d) => d.open,
    getHigh: (d) => d.high,
    getLow: (d) => d.low,
    getClose: (d) => d.close,
    resolveLineStyle: () => ({ stroke: "#000" }),
    resolveAreaStyle: () => ({ fill: "#000" }),
    resolveBoundsStyle: () => ({ fill: "#ccc" }),
    resolveColorMap: () => new Map(),
    resolveGroupColor: () => null,
    groupData: (data) => {
      const map = new Map<string, any[]>()
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

function asCandlestick(node: any): CandlestickSceneNode {
  return node as CandlestickSceneNode
}

describe("buildCandlestickScene", () => {
  it("emits CandlestickSceneNode for each valid datum", () => {
    const data = [
      { x: 0, open: 10, high: 15, low: 5, close: 12 },
      { x: 10, open: 12, high: 18, low: 9, close: 8 },
    ]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(2)
    expect(nodes[0].type).toBe("candlestick")
    expect(nodes[1].type).toBe("candlestick")
  })

  it("sets isUp=true when close >= open, isUp=false when close < open", () => {
    const data = [
      { x: 0, open: 10, high: 20, low: 5, close: 15 },   // up: 15 >= 10
      { x: 10, open: 15, high: 20, low: 5, close: 10 },   // down: 10 < 15
      { x: 20, open: 12, high: 20, low: 5, close: 12 },   // equal: 12 >= 12 → up
    ]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    expect(asCandlestick(nodes[0]).isUp).toBe(true)
    expect(asCandlestick(nodes[1]).isUp).toBe(false)
    expect(asCandlestick(nodes[2]).isUp).toBe(true)
  })

  it("returns empty when high or low accessor is missing", () => {
    const data = [{ x: 0, open: 10, high: 15, low: 5, close: 12 }]

    // Missing getHigh — always required
    const noHigh = makeCtx({ getHigh: undefined })
    expect(buildCandlestickScene(noHigh, data, defaultLayout)).toEqual([])

    // Missing getLow — always required
    const noLow = makeCtx({ getLow: undefined })
    expect(buildCandlestickScene(noLow, data, defaultLayout)).toEqual([])
  })

  it("falls back to range mode when open/close are missing", () => {
    const data = [{ x: 0, high: 15, low: 5 }]
    const noOC = makeCtx({ getOpen: undefined, getClose: undefined })
    const nodes = buildCandlestickScene(noOC, data, defaultLayout)
    // Should produce range-mode nodes, not empty
    expect(nodes.length).toBe(1)
    expect((nodes[0] as any).isRange).toBe(true)
  })

  it("skips data with null/NaN OHLC values", () => {
    const data = [
      { x: 0, open: 10, high: 15, low: 5, close: 12 },      // valid
      { x: 10, open: null, high: 15, low: 5, close: 12 },    // null open
      { x: 20, open: 10, high: NaN, low: 5, close: 12 },     // NaN high
      { x: 30, open: 10, high: 15, low: null, close: 12 },   // null low
      { x: 40, open: 10, high: 15, low: 5, close: NaN },     // NaN close
      { x: 50, open: 8, high: 20, low: 3, close: 18 },       // valid
    ]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(2)
    expect(asCandlestick(nodes[0]).x).toBe(0)
    expect(asCandlestick(nodes[1]).x).toBe(50)
  })

  it("skips data with null/NaN X values", () => {
    const data = [
      { x: 0, open: 10, high: 15, low: 5, close: 12 },
      { x: NaN, open: 10, high: 15, low: 5, close: 12 },
      { x: null, open: 10, high: 15, low: 5, close: 12 },
    ]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(1)
    expect(asCandlestick(nodes[0]).x).toBe(0)
  })

  it("auto-calculates body width from min X gap × 0.6", () => {
    // Points at x=0, 10, 30 → pixel gaps (identity scale): 10, 20 → min=10
    // bodyWidth = max(2, min(10 * 0.6, 20)) = max(2, min(6, 20)) = 6
    const data = [
      { x: 0, open: 10, high: 15, low: 5, close: 12 },
      { x: 10, open: 12, high: 18, low: 9, close: 14 },
      { x: 30, open: 14, high: 20, low: 10, close: 16 },
    ]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(3)
    expect(asCandlestick(nodes[0]).bodyWidth).toBe(6)
    expect(asCandlestick(nodes[1]).bodyWidth).toBe(6)
    expect(asCandlestick(nodes[2]).bodyWidth).toBe(6)
  })

  it("clamps auto body width to minimum 2 and maximum 20", () => {
    // Very tight spacing: x=0, x=1 → gap=1, 1*0.6=0.6, clamped to 2
    const tightData = [
      { x: 0, open: 10, high: 15, low: 5, close: 12 },
      { x: 1, open: 12, high: 18, low: 9, close: 14 },
    ]
    const ctx = makeCtx()
    const tightNodes = buildCandlestickScene(ctx, tightData, defaultLayout)
    expect(asCandlestick(tightNodes[0]).bodyWidth).toBe(2)

    // Very wide spacing: x=0, x=1000 → gap=1000, 1000*0.6=600, clamped to 20
    const wideData = [
      { x: 0, open: 10, high: 15, low: 5, close: 12 },
      { x: 1000, open: 12, high: 18, low: 9, close: 14 },
    ]
    const wideNodes = buildCandlestickScene(ctx, wideData, defaultLayout)
    expect(asCandlestick(wideNodes[0]).bodyWidth).toBe(20)
  })

  it("uses default body width of 6 for single data point", () => {
    const data = [{ x: 5, open: 10, high: 15, low: 5, close: 12 }]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    expect(nodes).toHaveLength(1)
    expect(asCandlestick(nodes[0]).bodyWidth).toBe(6)
  })

  it("uses explicit bodyWidth from candlestickStyle config", () => {
    const data = [
      { x: 0, open: 10, high: 15, low: 5, close: 12 },
      { x: 10, open: 12, high: 18, low: 9, close: 14 },
    ]
    const ctx = makeCtx({
      config: { candlestickStyle: { bodyWidth: 15 } },
    })
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    // Explicit bodyWidth overrides auto-calculation
    expect(asCandlestick(nodes[0]).bodyWidth).toBe(15)
    expect(asCandlestick(nodes[1]).bodyWidth).toBe(15)
  })

  it("applies up/down colors from candlestickStyle config", () => {
    const data = [
      { x: 0, open: 10, high: 20, low: 5, close: 15 },   // up
      { x: 10, open: 15, high: 20, low: 5, close: 10 },   // down
    ]
    const ctx = makeCtx({
      config: {
        candlestickStyle: { upColor: "#00ff00", downColor: "#ff0000" },
      },
    })
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    expect(asCandlestick(nodes[0]).upColor).toBe("#00ff00")
    expect(asCandlestick(nodes[0]).downColor).toBe("#ff0000")
    expect(asCandlestick(nodes[1]).upColor).toBe("#00ff00")
    expect(asCandlestick(nodes[1]).downColor).toBe("#ff0000")
  })

  it("uses default colors when candlestickStyle is not provided", () => {
    const data = [{ x: 0, open: 10, high: 15, low: 5, close: 12 }]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    const node = asCandlestick(nodes[0])
    expect(node.upColor).toBe("#28a745")
    expect(node.downColor).toBe("#dc3545")
    expect(node.wickColor).toBe("#333")
    expect(node.wickWidth).toBe(1)
  })

  it("computes correct wick coordinates: highY to lowY at scaled x", () => {
    // Identity scale: pixel coords = data coords
    const data = [{ x: 50, open: 20, high: 30, low: 10, close: 25 }]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    const node = asCandlestick(nodes[0])
    expect(node.x).toBe(50)       // scaled x position (center of candle)
    expect(node.highY).toBe(30)    // identity scale: highY = high value
    expect(node.lowY).toBe(10)     // identity scale: lowY = low value
  })

  it("computes correct body coordinates: openY to closeY range", () => {
    // Up candle: open=20, close=25
    const data = [{ x: 50, open: 20, high: 30, low: 10, close: 25 }]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    const node = asCandlestick(nodes[0])
    expect(node.openY).toBe(20)
    expect(node.closeY).toBe(25)
    expect(node.isUp).toBe(true)

    // Down candle: open=25, close=18
    const downData = [{ x: 50, open: 25, high: 30, low: 10, close: 18 }]
    const downNodes = buildCandlestickScene(ctx, downData, defaultLayout)

    const downNode = asCandlestick(downNodes[0])
    expect(downNode.openY).toBe(25)
    expect(downNode.closeY).toBe(18)
    expect(downNode.isUp).toBe(false)
  })

  it("returns empty array for empty data", () => {
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, [], defaultLayout)
    expect(nodes).toEqual([])
  })

  it("returns empty when all data has invalid OHLC", () => {
    const data = [
      { x: 0, open: NaN, high: 15, low: 5, close: 12 },
      { x: 10, open: 10, high: null, low: 5, close: 12 },
    ]
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)
    expect(nodes).toEqual([])
  })

  it("preserves original datum reference on each node", () => {
    const d1 = { x: 0, open: 10, high: 15, low: 5, close: 12, extra: "foo" }
    const d2 = { x: 10, open: 12, high: 18, low: 9, close: 14, extra: "bar" }
    const ctx = makeCtx()
    const nodes = buildCandlestickScene(ctx, [d1, d2], defaultLayout)

    expect(asCandlestick(nodes[0]).datum).toBe(d1)
    expect(asCandlestick(nodes[1]).datum).toBe(d2)
  })

  it("applies wickColor and wickWidth from config", () => {
    const data = [{ x: 0, open: 10, high: 15, low: 5, close: 12 }]
    const ctx = makeCtx({
      config: {
        candlestickStyle: { wickColor: "#aabbcc", wickWidth: 3 },
      },
    })
    const nodes = buildCandlestickScene(ctx, data, defaultLayout)

    const node = asCandlestick(nodes[0])
    expect(node.wickColor).toBe("#aabbcc")
    expect(node.wickWidth).toBe(3)
  })
})

describe("Range / dumbbell mode", () => {
  const rangeData = [
    { x: 10, high: 80, low: 20 },
    { x: 30, high: 90, low: 40 },
    { x: 50, high: 70, low: 30 },
  ]

  it("renders when only high/low accessors are provided (no open/close)", () => {
    const ctx = makeCtx({
      getOpen: undefined,
      getClose: undefined,
      getHigh: (d) => d.high,
      getLow: (d) => d.low,
    })
    const nodes = buildCandlestickScene(ctx, rangeData, defaultLayout)
    expect(nodes.length).toBe(3)
  })

  it("sets bodyWidth to 0 in range mode", () => {
    const ctx = makeCtx({
      getOpen: undefined,
      getClose: undefined,
      getHigh: (d) => d.high,
      getLow: (d) => d.low,
    })
    const nodes = buildCandlestickScene(ctx, rangeData, defaultLayout)
    const node = asCandlestick(nodes[0])
    expect(node.bodyWidth).toBe(0)
  })

  it("uses range color (not up/down) in range mode", () => {
    const ctx = makeCtx({
      getOpen: undefined,
      getClose: undefined,
      getHigh: (d) => d.high,
      getLow: (d) => d.low,
      config: { candlestickStyle: { rangeColor: "#6366f1" } },
    })
    const nodes = buildCandlestickScene(ctx, rangeData, defaultLayout)
    const node = asCandlestick(nodes[0])
    // Range mode: rangeColor used instead of up/down
    expect(node.upColor).toBe("#6366f1")
    expect(node.downColor).toBe("#6366f1")
  })

  it("sets openY=highY and closeY=lowY in range mode (no body needed)", () => {
    const ctx = makeCtx({
      getOpen: undefined,
      getClose: undefined,
      getHigh: (d) => d.high,
      getLow: (d) => d.low,
    })
    const nodes = buildCandlestickScene(ctx, rangeData, defaultLayout)
    const node = asCandlestick(nodes[0])
    // openY/closeY should mirror high/low since there's no open/close distinction
    expect(node.openY).toBe(node.highY)
    expect(node.closeY).toBe(node.lowY)
  })

  it("marks range mode nodes with isRange flag", () => {
    const ctx = makeCtx({
      getOpen: undefined,
      getClose: undefined,
      getHigh: (d) => d.high,
      getLow: (d) => d.low,
    })
    const nodes = buildCandlestickScene(ctx, rangeData, defaultLayout)
    const node = asCandlestick(nodes[0])
    expect((node as any).isRange).toBe(true)
  })
})
