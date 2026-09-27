import { describe, expect, it } from "vitest"
import { unstable_fromGofishIR, type GofishDisplayItem } from "./gofishIR"
import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { NetworkRectNode } from "../stream/networkTypes"

const layout = (items: GofishDisplayItem[]) =>
  unstable_fromGofishIR({
    ir: "gofish-display-list",
    irVersion: 0,
    viewport: { w: 400, h: 300 },
    items
  }).networkLayout({} as NetworkLayoutContext).sceneNodes as NetworkRectNode[]

describe("GoFish path hit regions (#1509)", () => {
  it("uses analytic bounds for arcs, lines and Béziers while retaining the authored hit path and datum", () => {
    const datum = { name: "arc" }
    const paths = [
      "M0 100 A50 50 0 0 1 100 100",
      "M10 20 H90 V70 H10 Z",
      "M0 0 Q50 100 100 0Z"
    ]
    const nodes = layout(paths.map((d) => ({ kind: "path", d, datum })))
    expect(nodes).toHaveLength(3)
    expect(nodes[0]).toMatchObject({ x: 0, y: 50, w: 100, h: 50 })
    expect(nodes[1]).toMatchObject({ x: 10, y: 20, w: 80, h: 50 })
    expect(nodes[2]).toMatchObject({ x: 0, y: 0, w: 100, h: 50 })
    nodes.forEach((n, i) => {
      expect(n.datum).toBe(datum)
      expect(n._hitPath).toEqual({
        pathD: paths[i],
        transform: [0, 0, 1, 1],
        fill: true,
        strokeWidth: 0
      })
    })
  })

  it("preserves reflected and nested nonuniform group transforms", () => {
    const nodes = layout([
      {
        kind: "group",
        transform: { translate: [200, 10], scale: [-2, 3] },
        children: [
          {
            kind: "group",
            transform: { translate: [10, 20] },
            children: [
              {
                kind: "path",
                d: "M0 0h40v20h-40z",
                datum: { name: "reflected" }
              }
            ]
          }
        ]
      }
    ])
    expect(nodes[0]).toMatchObject({
      x: 100,
      y: 70,
      w: 80,
      h: 60,
      _hitPath: { transform: [180, 70, -2, 3] }
    })
  })

  it("includes stroked horizontal paths and rejects malformed or empty path marks", () => {
    const nodes = layout([
      {
        kind: "path",
        d: "M10 20h80",
        style: { fill: "none", stroke: "blue", strokeWidth: 4 },
        datum: { name: "line" }
      },
      ...["", "M10 20", "M10 20 L", "M10 20 A1 2 0 2 1 50 50"].map((d) => ({
        kind: "path" as const,
        d,
        datum: {}
      }))
    ])
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      x: 8,
      y: 18,
      w: 84,
      h: 4,
      _hitPath: { fill: false, strokeWidth: 4 }
    })
  })
})
