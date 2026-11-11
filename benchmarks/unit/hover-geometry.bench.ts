import { bench, describe } from "../setup/bench"
import { findNearestGeoNode } from "../../src/components/stream/GeoCanvasHitTester"
import type { GeoLineSceneNode } from "../../src/components/stream/geoTypes"
import { buildNetworkEdgeHitIndex } from "../../src/components/stream/networkEdgeHitIndex"
import type { NetworkSceneEdge } from "../../src/components/stream/networkTypes"

describe("Retained network hit geometry", () => {
  const edges: NetworkSceneEdge[] = Array.from({ length: 10_000 }, (_, i) => ({
    type: "line",
    x1: i * 10,
    y1: 0,
    x2: i * 10 + 5,
    y2: 10,
    style: { stroke: "blue", strokeWidth: 1 },
    datum: { id: i }
  }))
  buildNetworkEdgeHitIndex(edges)
  bench("retained-10k-edges-unchanged", () => {
    buildNetworkEdgeHitIndex(edges)
  })
  bench("retained-10k-edges-width-restyle", () => {
    edges[0].style.strokeWidth = edges[0].style.strokeWidth === 1 ? 4 : 1
    buildNetworkEdgeHitIndex(edges)
  })
})

describe("Map route hover", () => {
  const routes: GeoLineSceneNode[] = Array.from({ length: 100 }, (_, row) => ({
    type: "line",
    path: Array.from({ length: 501 }, (_, column): [number, number] => [
      column * 2,
      row * 10 + Math.sin(column / 10) * 4
    ]),
    style: { stroke: "blue", strokeWidth: 2 },
    datum: { id: `route-${row}` }
  }))
  // Line hit testing only uses segment geometry, so no canvas API is needed.
  const hitContext = {} as CanvasRenderingContext2D
  for (const [name, x, y] of [
    ["near-route", 503, 503],
    ["outside-map", 503, -100],
    ["near-endpoint", 1002, 500]
  ] as const) {
    bench(`geo-50k-segments-${name}`, () => {
      findNearestGeoNode(routes, x, y, 5, hitContext)
    })
  }
})
