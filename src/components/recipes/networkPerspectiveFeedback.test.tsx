import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  buildNetworkPerspectiveFrame,
  resolveNetworkPerspective
} from "../stream/networkPerspective"
import { getNetworkPerspectiveSize } from "../stream/networkPerspectiveFit"
import { projectNetworkScene } from "../stream/networkPerspectiveScene"
import { NetworkPerspectiveLayer } from "../stream/networkPerspectiveContext"
import {
  NetworkPerspectiveGround,
  NetworkPerspectiveBillboard
} from "../stream/networkPerspectivePlacement"
import { renderChart, serializeSvgPrecision } from "../server/renderToStaticSVG"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import { lineageDagLayout } from "./lineageDag"
import { transitDiagramLayout } from "./transitDiagram"

const nodes = [
  { id: "a", x: 0, y: 0 },
  { id: "b", x: 1, y: 0 }
]
const edges = [{ source: "a", target: "b" }]
function context<C extends object>(config: C): NetworkLayoutContext<C> {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
      width: 0,
      height: 0,
      value: 1
    })),
    edges: edges.map((edge) => ({
      ...edge,
      value: 1,
      y0: 0,
      y1: 0,
      sankeyWidth: 1
    })),
    config,
    dimensions: {
      width: 1800,
      height: 900,
      plot: { x: 0, y: 0, width: 1800, height: 900 }
    },
    theme: { semantic: {}, categorical: ["#468"] },
    resolveColor: () => "#468",
    perspective: { type: "isometric", fitPadding: 0 }
  }
}

describe("downstream perspective contracts", () => {
  it.each([0, 2, 4, undefined])(
    "keeps ground marks registered at long distances with SVG precision %s",
    (precision) => {
      const resolved = resolveNetworkPerspective("isometric")!
      const frame = {
        ...buildNetworkPerspectiveFrame(
          "isometric",
          [...resolved.linear, 10.123, 20.456],
          resolved.verticalScale
        ),
        thickness: 6
      }
      const html = serializeSvgPrecision(
        renderToStaticMarkup(
          <svg>
            <NetworkPerspectiveLayer frame={frame}>
              <NetworkPerspectiveGround z="top">
                <circle cx={1592} cy={340} r={1} />
              </NetworkPerspectiveGround>
            </NetworkPerspectiveLayer>
          </svg>
        ),
        precision
      )
      const [a, b, c, d, e, f] = html
        .match(/matrix\(([^)]+)\)/)![1]
        .split(" ")
        .map(Number)
      for (const [x, y] of [
        [0, 0],
        [1592, 340],
        [16000, 7200]
      ]) {
        const expected = frame.project(x, y, 6)
        const tolerance = precision === 0 ? 0.51 : 0.011
        expect(Math.abs(a * x + c * y + e - expected[0])).toBeLessThan(
          tolerance
        )
        expect(Math.abs(b * x + d * y + f - expected[1])).toBeLessThan(
          tolerance
        )
      }
      expect(frame.groundTransform).toBe(`matrix(${frame.matrix.join(" ")})`)
    }
  )

  it("keeps on-ground billboard anchors aligned with their tokens on wide charts", () => {
    const resolved = resolveNetworkPerspective("isometric")!
    const frame = buildNetworkPerspectiveFrame(
      "isometric",
      [...resolved.linear, 10, 20],
      resolved.verticalScale
    )
    const html = renderToStaticMarkup(
      <NetworkPerspectiveLayer frame={frame}>
        <NetworkPerspectiveBillboard x={1592} y={342} onGround>
          <circle cx={1592} cy={342} r={2} />
        </NetworkPerspectiveBillboard>
      </NetworkPerspectiveLayer>
    )
    const coefficients = html
      .match(/matrix\(([^)]+)\)/)![1]
      .split(" ")
      .map(Number)
    expect(coefficients.slice(0, 4)).toEqual(
      resolved.linear.map(
        (v) => v / Math.hypot(resolved.linear[0], resolved.linear[2])
      )
    )
  })

  it("fits upright card chrome even with zero padding and no hulls", () => {
    const result = lineageDagLayout(context({ lod: "full", nodeWidth: 200 }))
    expect(result.perspectiveBounds).toHaveLength(2)
    const scene = projectNetworkScene({
      sceneNodes: result.sceneNodes!,
      sceneEdges: result.sceneEdges!,
      labels: [],
      bounds: result.perspectiveBounds,
      size: [1800, 900],
      perspective: resolveNetworkPerspective({
        type: "isometric",
        fitPadding: 0
      })!
    })
    for (const bound of result.perspectiveBounds!) {
      if (!("extent" in bound)) throw new Error("Expected upright chrome")
      const [x, y] = scene.frame.project(
        bound.x,
        bound.y,
        scene.frame.thickness
      )
      expect(x - bound.extent[0]).toBeGreaterThanOrEqual(-1e-5)
      expect(x + bound.extent[1]).toBeLessThanOrEqual(1800.00001)
      expect(y - bound.extent[2]).toBeGreaterThanOrEqual(-1e-5)
      expect(y + bound.extent[3]).toBeLessThanOrEqual(900.00001)
    }
  })

  it("offers arrow opt-out and ground chrome without modifying the overlay tree", () => {
    const props = {
      nodes,
      edges,
      layout: lineageDagLayout,
      width: 900,
      height: 500,
      perspective: "isometric"
    }
    const defaultSvg = renderChart("NetworkCustomChart", props)
    const svg = renderChart("NetworkCustomChart", {
      ...props,
      layoutConfig: { showArrowheads: false, chromePlacement: "ground" }
    })
    expect(defaultSvg).toContain('class="recipe-edge-arrow"')
    expect(svg).not.toContain('class="recipe-edge-arrow"')
    expect(svg).toContain(
      'class="lineage-dag-glyphs"><g data-perspective="ground"'
    )
    expect(svg).not.toContain('data-perspective="billboard"')
    const flat = { nodes, edges, layout: lineageDagLayout }
    expect(renderChart("NetworkCustomChart", flat)).toBe(
      renderChart("NetworkCustomChart", {
        ...flat,
        layoutConfig: { chromePlacement: "ground" }
      })
    )
  })

  it.each(["upright", "ground"] as const)(
    "declares custom transit station %s extents",
    (chromePlacement) => {
      const result = transitDiagramLayout(
        context({
          chromePlacement,
          renderStation: ({ x, y }: { x: number; y: number }) => (
            <rect x={x - 100} y={y - 20} width={200} height={40} />
          ),
          stationBounds: () => [100, 100, 20, 20] as const
        })
      )
      expect(result.perspectiveBounds).toHaveLength(2)
      expect(result.perspectiveBounds![0]).toMatchObject(
        chromePlacement === "ground"
          ? { width: 200, height: 40, z: "top" }
          : { extent: [100, 100, 20, 20] }
      )
    }
  )

  it("sizes a wide ground rectangle with token extents without shrinking it", () => {
    const perspective = { type: "isometric" as const, fitPadding: 0 }
    const bounds = [
      { x: 0, y: 0, extent: [6, 6, 6, 6] as const },
      { x: 1800, y: 120, extent: [6, 6, 6, 6] as const }
    ]
    const size = getNetworkPerspectiveSize(perspective, [1800, 120], bounds)
    const scene = projectNetworkScene({
      sceneNodes: [],
      sceneEdges: [],
      labels: [],
      size,
      bounds: [{ x: 0, y: 0, width: 1800, height: 120 }, ...bounds],
      perspective: resolveNetworkPerspective(perspective)!
    })
    expect(scene.frame.scale).toBe(1)
    expect(size[1]).toBeGreaterThan(600)
    expect(getNetworkPerspectiveSize("flat", [1800, 120])).toEqual([1800, 120])
    expect(() => getNetworkPerspectiveSize(perspective, [-1, NaN])).toThrow(
      RangeError
    )
  })

  it("emits a single flat token rim and stable SVG roles", () => {
    const props = {
      nodes: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 1, y: 0 }
      ],
      edges,
      layout: lineageDagLayout,
      layoutConfig: { lod: "dot" }
    }
    const svg = renderChart("NetworkCustomChart", {
      ...props,
      perspective: { type: "isometric", tokenRim: "flat" }
    })
    const facets = renderChart("NetworkCustomChart", {
      ...props,
      perspective: "isometric"
    })
    expect(svg.match(/data-perspective-part="token-rim"/g)).toHaveLength(2)
    expect(svg.match(/data-perspective-part="token-top"/g)).toHaveLength(2)
    expect(
      facets.match(/data-perspective-part="token-rim"/g)!.length
    ).toBeGreaterThan(2)
    expect(svg).toContain('data-perspective-part="edge-shadow"')
    expect(svg).toBe(
      renderChart("NetworkCustomChart", {
        ...props,
        perspective: { type: "isometric", tokenRim: "flat" }
      })
    )
  })
})
