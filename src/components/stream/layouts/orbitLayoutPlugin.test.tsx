import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { networkSceneEdgeToSVG } from "../SceneToSVGNetwork"
import type {
  NetworkPipelineConfig,
  RealtimeEdge,
  RealtimeNode
} from "../networkTypes"
import { forceLayoutPlugin } from "./forceLayoutPlugin"
import { orbitLayoutPlugin } from "./orbitLayoutPlugin"
import { findNearestNetworkNode } from "../NetworkCanvasHitTester"

function node(id: string, x: number, y: number): RealtimeNode {
  return {
    id,
    x,
    y,
    x0: x,
    x1: x,
    y0: y,
    y1: y,
    width: 0,
    height: 0,
    value: 1,
    data: { id }
  }
}

describe("orbitLayoutPlugin scene styles", () => {
  it("keeps generated ring segments outside the interactive edge surface", () => {
    const nodes: RealtimeNode[] = []
    const edges: RealtimeEdge[] = []
    const config: NetworkPipelineConfig = {
      chartType: "orbit", orbitShowRings: true, nodeIDAccessor: "id",
      __hierarchyRoot: { id: "root", children: [{ id: "a" }, { id: "b" }] }
    }
    orbitLayoutPlugin.computeLayout(nodes, edges, config, [400, 300])
    const scene = orbitLayoutPlugin.buildScene(nodes, edges, config, [400, 300])
    const rings = scene.sceneEdges.filter((edge) => edge.datum == null)
    expect(rings).toHaveLength(48)
    for (const [index, ring] of rings.entries()) {
      expect(ring.interactive).toBe(false)
      if (ring.type === "line") {
        const next = rings[(index + 1) % rings.length]
        expect(next.type).toBe("line")
        if (next.type === "line") {
          expect(ring.x2).toBeCloseTo(next.x1, 8)
          expect(ring.y2).toBeCloseTo(next.y1, 8)
        }
        expect(findNearestNetworkNode([], [ring], (ring.x1 + ring.x2) / 2, (ring.y1 + ring.y2) / 2)).toBeNull()
      }
    }
  })

  it("applies edgeStyle, including cursor, to data edges but not decorative rings", () => {
    const source = node("source", 20, 20)
    const target = node("target", 80, 60)
    const edge = {
      source,
      target,
      value: 1,
      y0: 0,
      y1: 0,
      sankeyWidth: 1,
      data: { source: "source", target: "target" }
    } satisfies RealtimeEdge
    const config = {
      chartType: "orbit",
      orbitShowRings: false,
      edgeStyle: () => ({
        stroke: "#123456",
        strokeWidth: 3,
        opacity: 0.4,
        cursor: "pointer"
      })
    } satisfies NetworkPipelineConfig

    const result = orbitLayoutPlugin.buildScene(
      [source, target],
      [edge],
      config,
      [200, 120]
    )
    expect(result.sceneEdges).toHaveLength(1)
    expect(result.sceneEdges[0]?.style).toMatchObject({
      stroke: "#123456",
      strokeWidth: 3,
      opacity: 0.4,
      cursor: "pointer"
    })

    const html = renderToStaticMarkup(
      <svg>{networkSceneEdgeToSVG(result.sceneEdges[0]!, 0)}</svg>
    )
    expect(html).toContain('data-semiotic-mark-cursor="pointer"')
  })
})

describe.each([["orbit", orbitLayoutPlugin], ["force", forceLayoutPlugin]] as const)("%s multigraph", (chartType, plugin) => {
  it.each([[400, 40], [40, 400]])("exposes the loop stroke inside a %i by %i plot", (width, height) => {
    const cx = width / 2
    const cy = height / 2
    const radius = 30
    const edge = { source: "a", target: "a", value: 1, y0: 0, y1: 0, sankeyWidth: 0, data: {} }
    const scene = plugin.buildScene([node("a", cx, cy)], [edge], {
      chartType, nodeSize: radius, orbitShowRings: false
    }, [width, height])
    const loop = scene.sceneEdges[0]
    expect(loop.type).toBe("curved")
    if (loop.type !== "curved") throw new Error("Expected a cubic loop")
    const [x0, y0, x1, y1, x2, y2, x3, y3] = loop.pathD.match(/-?[\d.]+/g)!.map(Number)
    const x = x0 + (3 * x1 + 3 * x2 + x3) / 8
    const y = y0 + (3 * y1 + 3 * y2 + y3) / 8
    expect(x).toBeGreaterThan(0)
    expect(x).toBeLessThan(width)
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThan(height)
    expect(Math.hypot(x - cx, y - cy)).toBeGreaterThan(radius)
  })

  it("keeps loop and reciprocal paths distinct while preserving paint order, styles and source rows", () => {
    const nodes = [node("a", 30, 80), node("b", 130, 80), node("c", 220, 80)]
    const rows = [["a", "a"], ["b", "a"], ["a", "a"], ["a", "b"], ["b", "c"]]
    const edges = rows.map(([source, target], id) => ({
      source, target, value: 1, y0: 0, y1: 0, sankeyWidth: 0, data: { id },
    }))
    const { sceneEdges } = plugin.buildScene(nodes, edges, {
      chartType, nodeSize: 20, orbitShowRings: false, edgeStyle: () => ({ stroke: "purple" }),
    }, [300, 200])
    expect(sceneEdges.map(edge => edge.datum)).toEqual(edges)
    expect(sceneEdges.map(edge => edge.accessibleDatum)).toEqual(edges.map(edge => edge.data))
    expect(sceneEdges.every(edge => edge.style.stroke === "purple")).toBe(true)
    expect(sceneEdges.map(edge => edge.type)).toEqual(["curved", "curved", "curved", "curved", "line"])
    const paths = sceneEdges.flatMap(edge => edge.type === "curved" ? [edge.pathD] : [])
    expect(new Set(paths).size).toBe(4)
    const controlY = (path: string) => Number(path.match(/ Q[^,]+,([^ ]+)/)![1])
    expect((controlY(paths[1]) + controlY(paths[3])) / 2).toBe(80)
    expect(controlY(paths[1])).not.toBe(controlY(paths[3]))
  })
})
