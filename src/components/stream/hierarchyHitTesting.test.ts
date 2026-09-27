import { describe, expect, it } from "vitest"
import { quadtree } from "d3-quadtree"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import { findNearestNetworkNode } from "./NetworkCanvasHitTester"
import type { NetworkCircleNode } from "./networkTypes"
import "./layouts/hierarchyLayoutPlugin"

describe("hierarchy hover for coincident parent and leaf geometry", () => {
  it.each(["treemap", "circlepack"] as const)(
    "%s reaches the leaf when zero padding gives it its parent's bounds",
    (chartType) => {
      const leaf = { name: "Other", value: 4 }
      const store = new NetworkPipelineStore({ chartType, padding: 0 })
      store.ingestHierarchy(
        { name: "root", children: [{ name: "branch", children: [leaf] }] },
        [400, 300]
      )
      store.buildScene([400, 300])
      for (const nodes of [store.sceneNodes, [...store.sceneNodes].reverse()]) {
        const circles = nodes.filter(
          (n): n is NetworkCircleNode => n.type === "circle"
        )
        const tree = quadtree<NetworkCircleNode>()
          .x((n) => n.cx)
          .y((n) => n.cy)
          .addAll(circles)
        for (const index of [null, circles.length ? tree : null]) {
          for (const x of [200, 230]) {
            const hit = findNearestNetworkNode(
              nodes,
              [],
              x,
              150,
              30,
              index,
              150
            )
            expect(hit?.datum?.data).toBe(leaf)
            expect(hit?.mark?.type).toBe(
              chartType === "treemap" ? "rect" : "circle"
            )
          }
        }
      }
    }
  )
})
