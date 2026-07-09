import { describe, it, expect } from "vitest"
import {
  emitProcessSankeyScenes,
  type ProcessSankeyLayoutConfig,
} from "./streamingLayout"
import type { NetworkLayoutContext } from "../../../stream/networkCustomLayout"
import type {
  NetworkBezierEdge,
  NetworkCircleNode,
} from "../../../stream/networkTypes"

function ctxWith(config: ProcessSankeyLayoutConfig): NetworkLayoutContext<ProcessSankeyLayoutConfig> {
  return {
    nodes: [],
    edges: [],
    dimensions: { width: 400, height: 300, plot: { x: 0, y: 0, width: 400, height: 300 } },
    theme: { semantic: {}, categorical: [] },
    resolveColor: (k: string) => `color(${k})`,
    config,
  }
}

describe("emitProcessSankeyScenes", () => {
  it("emits band+ribbon scene edges as bezier primitives", () => {
    const result = emitProcessSankeyScenes(ctxWith({
      bands: [{
        id: "A", pathD: "M0,0", fill: "red", rawDatum: { id: "A" },
        labelX: 10, labelY: 20, labelText: "A",
      }],
      ribbons: [{
        id: "a-b", pathD: "M0,0C", fill: "red", opacity: 0.4,
        rawDatum: { id: "a-b" },
      }],
    }))
    const sceneEdges = result.sceneEdges as NetworkBezierEdge[]
    expect(sceneEdges).toHaveLength(2)
    expect(sceneEdges[0].type).toBe("bezier")
    expect(sceneEdges[0].pathD).toBe("M0,0C") // ribbon paints first (behind bands)
    expect(sceneEdges[1].pathD).toBe("M0,0")
  })

  it("emits color-binding scene nodes off-canvas so the frame's nodeColorMap picks up band fills", () => {
    // Without these, StreamNetworkFrame's palette-by-array-index fallback
    // assigns particle/hover colors that don't match the HOC's `colorOf`
    // band-fill resolution. The hit tester and renderer both gate on
    // r:0 and far-off coords (renderer skips, hit-test distance > 30),
    // so the placeholder nodes don't interfere with band/ribbon hover.
    const result = emitProcessSankeyScenes(ctxWith({
      bands: [
        { id: "Alice", pathD: "M0,0", fill: "#abc", rawDatum: { id: "Alice" },
          labelX: 0, labelY: 0, labelText: "Alice" },
        { id: "Bob", pathD: "M0,0", fill: "#abc", rawDatum: { id: "Bob" },
          labelX: 0, labelY: 0, labelText: "Bob" },
        { id: "Eng", pathD: "M0,0", fill: "#def", rawDatum: { id: "Eng" },
          labelX: 0, labelY: 0, labelText: "Eng" },
      ],
      ribbons: [],
    }))
    const sceneNodes = result.sceneNodes as NetworkCircleNode[]
    expect(sceneNodes).toHaveLength(3)
    const alice = sceneNodes.find((n) => n.id === "Alice")!
    expect(alice.type).toBe("circle")
    expect(alice.r).toBe(0)
    expect(alice.cx).toBeLessThan(-1000) // off-canvas
    expect(alice.cy).toBeLessThan(-1000)
    expect(alice.style.fill).toBe("#abc")
    // Each band's resolved fill maps to its node id — this is what feeds
    // `nodeColorMap` for particle/hover color inheritance.
    const fills = new Map(sceneNodes.map((n) => [n.id, n.style.fill]))
    expect(fills.get("Alice")).toBe("#abc")
    expect(fills.get("Bob")).toBe("#abc")
    expect(fills.get("Eng")).toBe("#def")
  })

  it("emits labels for each band when showLabels is true (default)", () => {
    const result = emitProcessSankeyScenes(ctxWith({
      bands: [
        { id: "A", pathD: "M0,0", fill: "red", rawDatum: { id: "A" },
          labelX: 10, labelY: 20, labelText: "Alice" },
      ],
      ribbons: [],
    }))
    expect(result.labels).toHaveLength(1)
    expect(result.labels![0].text).toBe("Alice")
  })

  it("suppresses labels when showLabels is false", () => {
    const result = emitProcessSankeyScenes(ctxWith({
      bands: [
        { id: "A", pathD: "M0,0", fill: "red", rawDatum: { id: "A" },
          labelX: 0, labelY: 0, labelText: "A" },
      ],
      ribbons: [],
      showLabels: false,
    }))
    expect(result.labels).toEqual([])
  })
})
