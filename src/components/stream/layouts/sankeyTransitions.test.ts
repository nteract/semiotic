import { circularAreaLink } from "../../geometry/sankeyLinks"
import { NetworkPipelineStore } from "../NetworkPipelineStore"
import type { CircularPathData, RealtimeEdge } from "../networkTypes"
import "./sankeyLayoutPlugin"

const size: [number, number] = [600, 400]
const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }]
const edgesFor = (value: number) => [
  { source: "A", target: "B", value: 100 },
  { source: "B", target: "C", value: 100 },
  { source: "B", target: "B", value }
]

function loop(store: NetworkPipelineStore): RealtimeEdge {
  return [...store.edges.values()].find((edge) => edge.circular)!
}

function expectAttachedBand(edge: RealtimeEdge) {
  const cpd = edge.circularPathData!
  if (typeof edge.source === "string" || typeof edge.target === "string") {
    throw new Error("Expected resolved Sankey nodes")
  }
  expect(cpd.sourceX).toBeCloseTo(edge.source.x1)
  expect(cpd.targetX).toBeCloseTo(edge.target.x0)
  expect(cpd.sourceY).toBeCloseTo(edge.y0)
  expect(cpd.targetY).toBeCloseTo(edge.y1)
  expect(edge.y0 - edge.sankeyWidth / 2).toBeGreaterThanOrEqual(
    edge.source.y0 - 1e-8
  )
  expect(edge.y0 + edge.sankeyWidth / 2).toBeLessThanOrEqual(
    edge.source.y1 + 1e-8
  )
  expect(edge.y1 - edge.sankeyWidth / 2).toBeGreaterThanOrEqual(
    edge.target.y0 - 1e-8
  )
  expect(edge.y1 + edge.sankeyWidth / 2).toBeLessThanOrEqual(
    edge.target.y1 + 1e-8
  )
  const path = circularAreaLink(edge) as string
  expect(path).not.toMatch(/NaN|Infinity/)
  const arcs = [...path.matchAll(/A([^,]+),([^ ]+)/g)]
  expect(arcs).toHaveLength(8)
  for (const [, rx, ry] of arcs) {
    expect(Number(rx)).toBeGreaterThanOrEqual(0)
    expect(Number(ry)).toBeGreaterThanOrEqual(0)
  }
  const start = path.match(/^M([^,]+),([^L]+)/)!
  const halfWidth = edge.sankeyWidth / 2
  const startPoint = [Number(start[1]), Number(start[2])]
  const logicalStart =
    edge.direction === "down" ? startPoint.reverse() : startPoint
  expect(logicalStart[0]).toBeCloseTo(edge.source.x1)
  expect(Math.abs(logicalStart[1] - edge.y0)).toBeCloseTo(halfWidth)
  const segments = edge.bezier!.segments!
  const first = segments[0][0]
  const last = segments[segments.length - 1][3]
  expect(first).toEqual(
    edge.direction === "down"
      ? { x: edge.y0, y: edge.source.x1 }
      : { x: edge.source.x1, y: edge.y0 }
  )
  expect(last).toEqual(
    edge.direction === "down"
      ? { x: edge.y1, y: edge.target.x0 }
      : { x: edge.target.x0, y: edge.y1 }
  )
}

describe.each(["horizontal", "vertical"] as const)(
  "%s circular Sankey transitions",
  (orientation) => {
    it.each([
      ["streaming", 100, 1],
      ["bounded", 100, 1],
      ["streaming", 1, 100],
      ["bounded", 1, 100]
    ] as const)(
      "preserves the entire band while %s flow changes from %s to %s",
      (mode, before, after) => {
        const store = new NetworkPipelineStore({
          chartType: "sankey",
          orientation
        })
        store.ingestBounded(nodes, edgesFor(before), size)
        const old = { ...loop(store).circularPathData! }
        if (mode === "bounded")
          store.ingestBounded(nodes, edgesFor(after), size)
        else {
          store.updateEdge("B", "B", (datum) => ({ ...datum, value: after }))
          store.runLayout(size)
        }
        const edge = loop(store)
        const transition = store.transition!
        expect(transition).not.toBeNull()
        expectAttachedBand(edge)
        for (const key of Object.keys(old) as (keyof CircularPathData)[]) {
          expect(edge.circularPathData![key]).toBeCloseTo(old[key])
        }
        const startWidth = edge.sankeyWidth
        store.advanceTransition(transition.startTime + transition.duration)
        const target = { ...edge.circularPathData! }
        const targetWidth = edge.sankeyWidth
        // Replay to inspect the same transition at t=0 and its eased midpoint.
        store.transition = transition
        for (const fraction of [0, 0.5, 1]) {
          store.advanceTransition(
            transition.startTime + transition.duration * fraction
          )
          expectAttachedBand(edge)
          const eased = 1 - (1 - fraction) ** 3
          expect(edge.sankeyWidth).toBeCloseTo(
            startWidth + (targetWidth - startWidth) * eased
          )
          for (const key of Object.keys(target) as (keyof CircularPathData)[]) {
            expect(edge.circularPathData![key]).toBeCloseTo(
              old[key] + (target[key] - old[key]) * eased
            )
          }
        }
      }
    )

    it("grows a newly circular edge from zero width with attached geometry", () => {
      const store = new NetworkPipelineStore({
        chartType: "sankey",
        orientation
      })
      const fork = [
        { source: "A", target: "B", value: 100 },
        { source: "A", target: "D", value: 100 },
        { source: "B", target: "C", value: 100 },
        { source: "D", target: "C", value: 100 },
        { source: "D", target: "D", value: 0 }
      ]
      store.ingestBounded([...nodes, { id: "D" }], fork, size)
      store.ingestBounded(
        [...nodes, { id: "D" }],
        fork.map((edge) => ({
          ...edge,
          value: edge.source === edge.target ? 10 : edge.value
        })),
        size
      )
      const edge = loop(store)
      const transition = store.transition!
      expect(edge.sankeyWidth).toBe(0)
      expectAttachedBand(edge)
      store.advanceTransition(transition.startTime + transition.duration / 2)
      expect(edge.sankeyWidth).toBeGreaterThan(0)
      expectAttachedBand(edge)
      store.advanceTransition(transition.startTime + transition.duration)
      expectAttachedBand(edge)
    })

    it("keeps the circular intro attached and restores complete geometry on hydration", () => {
      const store = new NetworkPipelineStore({
        chartType: "sankey",
        orientation,
        introAnimation: true
      })
      store.ingestBounded(nodes, edgesFor(10), size)
      const edge = loop(store)
      expect(edge.sankeyWidth).toBe(0)
      expectAttachedBand(edge)
      expect(edge.circularPathData!.sourceX).toBe(
        size[orientation === "vertical" ? 1 : 0] / 2
      )
      expect(edge.circularPathData!.sourceY).toBe(
        size[orientation === "vertical" ? 0 : 1] / 2
      )
      const transition = store.transition!
      store.advanceTransition(transition.startTime + transition.duration / 2)
      expectAttachedBand(edge)
      store.cancelIntroAnimation()
      store.buildScene(size)
      expect(store.transition).toBeNull()
      expect(edge.sankeyWidth).toBeGreaterThan(0)
      expectAttachedBand(edge)
      expect(store.sceneEdges).toHaveLength(3)
    })

    it("starts an existing forward band at zero width when it becomes circular", () => {
      const store = new NetworkPipelineStore({
        chartType: "sankey",
        orientation
      })
      const edges = [
        { source: "A", target: "B", value: 100 },
        { source: "B", target: "C", value: 100 },
        { source: "C", target: "A", value: 0 }
      ]
      store.ingestBounded(nodes, edges, size)
      expect([...store.edges.values()][1].circular).toBe(false)
      expect([...store.edges.values()][1].sankeyWidth).toBeGreaterThan(0)
      store.ingestBounded(
        [...nodes].reverse(),
        edges.map((edge) => ({
          ...edge,
          value: edge.source === "C" ? 1 : edge.value
        })),
        size
      )
      const edge = loop(store)
      expect(edge.data).toMatchObject({ source: "B", target: "C" })
      expect(edge.sankeyWidth).toBe(0)
      const transition = store.transition!
      for (const fraction of [0, 0.5, 1]) {
        store.advanceTransition(
          transition.startTime + transition.duration * fraction
        )
        expectAttachedBand(edge)
      }
      expect(edge.sankeyWidth).toBeGreaterThan(0)
    })

    it("keeps independent bounded snapshots for parallel circular bands", () => {
      const store = new NetworkPipelineStore({
        chartType: "sankey",
        orientation
      })
      const edges = [...edgesFor(100), { source: "B", target: "B", value: 5 }]
      store.ingestBounded(nodes, edges, size)
      const previous = [...store.edges.values()]
        .filter((edge) => edge.circular)
        .map((edge) => ({
          width: edge.sankeyWidth,
          cpd: { ...edge.circularPathData! }
        }))
      store.ingestBounded(
        nodes,
        [edges[2], edges[0], edges[3], edges[1]].map((edge) => ({
          ...edge,
          value: edge.value / 2
        })),
        size
      )
      const circular = [...store.edges.values()].filter((edge) => edge.circular)
      expect(circular).toHaveLength(2)
      circular.forEach((edge, index) => {
        expect(edge.sankeyWidth).toBeCloseTo(previous[index].width)
        expect(edge.circularPathData!.sourceY).toBeCloseTo(
          previous[index].cpd.sourceY
        )
        expectAttachedBand(edge)
      })
      const transition = store.transition!
      for (const fraction of [0.5, 1]) {
        store.advanceTransition(
          transition.startTime + transition.duration * fraction
        )
        circular.forEach(expectAttachedBand)
      }
    })
  }
)
