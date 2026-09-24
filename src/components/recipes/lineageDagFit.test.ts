import { describe, expect, it } from "vitest"
import { createLineageDagFit, lineageDagLayout } from "semiotic/recipes"
import type { LineageDagConfig } from "./lineageDag"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"

const nodes = [
  { id: "a", x: 0, y: 0 },
  { id: "b", x: 1, y: -0.5 },
  { id: "c", x: 1, y: 0.5 },
  { id: "d", x: 2, y: 0 }
]
const plot = { x: 10, y: 20, width: 900, height: 500 }

describe("createLineageDagFit", () => {
  it("preserves the recipe's established default centers and bounds", () => {
    const fit = createLineageDagFit(nodes, plot)
    expect(fit).toMatchObject({
      layerCount: 3,
      maxLayerSize: 2,
      nodeWidth: 172,
      nodeHeight: 54,
      lod: "full"
    })
    expect(fit.nodeBounds(nodes[0])).toEqual({
      x: 10,
      y: 243,
      width: 172,
      height: 54,
      cx: 96,
      cy: 270
    })
    expect(fit.project(1, -0.5)).toEqual({ x: 460, y: 47 })
    expect(fit.project(2, 0)).toEqual({ x: 824, y: 270 })
    expect(fit.invert(460, 47)).toEqual({ layer: 1, row: -0.5 })
  })

  it.each(["full", "compact", "icon", "dot", "auto"] as const)(
    "matches emitted geometry with %s LOD and custom accessors",
    (lod) => {
      for (const width of [0, 30, 90, 180, 360, 900]) {
        const raw = nodes.map(({ id, x, y }) => ({ id, layer: x, row: y }))
        const wrapped = raw.map((node) => ({
          id: node.id,
          x: 999,
          y: 999,
          data: node
        }))
        const rect = { ...plot, width }
        const config: LineageDagConfig = {
          lod,
          layerAccessor: "layer",
          rowAccessor: "row",
          minGapX: 12,
          nodeHeight: 40
        }
        const fit = createLineageDagFit(raw, rect, config)
        const result = lineageDagLayout({
          nodes: wrapped,
          edges: [],
          dimensions: { width, height: rect.height, plot: rect },
          config,
          theme: { semantic: {}, categorical: [] },
          resolveColor: () => "navy"
        } as unknown as NetworkLayoutContext<LineageDagConfig>)
        expect(result.sceneNodes).toHaveLength(raw.length)
        result.sceneNodes!.forEach((node, index) => {
          const box = fit.nodeBounds(raw[index])
          expect(
            createLineageDagFit(wrapped, rect, config).nodeBounds(
              wrapped[index]
            )
          ).toEqual(box)
          if (node.type === "circle")
            expect(node).toMatchObject({
              cx: box.cx,
              cy: box.cy,
              r: box.width / 2
            })
          else
            expect(node).toMatchObject({
              type: "rect",
              x: box.x,
              y: box.y,
              w: box.width,
              h: box.height
            })
        })
      }
    }
  )

  it("maps a main viewport to a minimap with different size and dot LOD", () => {
    const main = createLineageDagFit(nodes, plot)
    const mini = createLineageDagFit(
      nodes,
      { x: 0, y: 0, width: 200, height: 100 },
      { lod: "dot" }
    )
    const start = main.invert(278, 47)
    const end = main.invert(642, 493)
    const topLeft = mini.project(start.layer!, start.row)
    const bottomRight = mini.project(end.layer!, end.row)
    expect(topLeft).toEqual({ x: 52.75, y: 5.5 })
    expect(bottomRight).toEqual({ x: 147.25, y: 94.5 })
    expect(bottomRight.x - topLeft.x).toBe(94.5)
  })

  it("keeps empty, single-layer, single-row and tiny fits finite and identifies the collapsed axis", () => {
    for (const rows of [[], [nodes[0]]]) {
      for (const width of [0, 1, 400]) {
        const fit = createLineageDagFit(rows, {
          x: 0,
          y: 0,
          width,
          height: width
        })
        const point = fit.project(0, 0)
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true)
        expect(fit.invert(point.x, point.y)).toEqual({ layer: null, row: 0 })
      }
    }
  })

  it("honors explicit domains and keeps an existing fit stable if its inputs are mutated", () => {
    const rect = { ...plot }
    const config = { layerCount: 5, maxLayerSize: 4 }
    const fit = createLineageDagFit(nodes, rect, config)
    const point = fit.project(3, 0.5)
    rect.x = 800
    config.layerCount = 2
    expect(fit.project(3, 0.5)).toEqual(point)
    expect(fit.invert(point.x, point.y).layer).toBeCloseTo(3)
    expect(fit.invert(point.x, point.y).row).toBeCloseTo(0.5)
  })
})
