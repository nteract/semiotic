import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import type { NetworkLayoutContext } from "../../stream/networkCustomLayout"
import type {
  NetworkCurvedEdge,
  NetworkGlyphNode
} from "../../stream/networkTypes"
import { prepareMotifBraid } from "./braid"
import {
  motifBraidLayout,
  type MotifBraidLayoutConfig
} from "./motifBraidLayout"
import { taperedBraidPath } from "./motifBraidGeometry"
import { prepareNetworkAtlas } from "./prepare"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "./types"

type Journey = {
  path: string[]
  counts?: number[]
  count?: number
  partition?: string
}

function fixture(journeys: Journey[]) {
  const { spec, source } = JSON.parse(
    readFileSync(
      "scripts/network-atlas/fixtures/search-no-result-v1.json",
      "utf8"
    )
  ) as { spec: NetworkAtlasSpec; source: NetworkAtlasSource }
  const states = [...new Set(journeys.flatMap((journey) => journey.path))]
  spec.coordinate = { kind: "ordinal", sectionIds: states }
  spec.forest.display = { kind: "observed-prefix" }
  source.nodes = states.map((id) => ({ id, sectionId: id }))
  source.edges = []
  source.occurrences = journeys.map((journey, i) => ({
    id: String(i),
    entityId: String(i),
    nodePath: journey.path,
    entityCount: journey.count ?? 100,
    stepEntityCounts: journey.counts,
    partition: journey.partition,
    complete: true
  }))
  return { spec, source }
}

function prepare(journeys: Journey[]) {
  const { spec, source } = fixture(journeys)
  const prepared = prepareNetworkAtlas(spec, source)
  if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
  const braid = prepareMotifBraid(prepared.atlas)
  const ctx: NetworkLayoutContext<MotifBraidLayoutConfig> = {
    nodes: [],
    edges: [],
    config: { braid },
    dimensions: {
      width: 800,
      height: 500,
      plot: { x: 12, y: 18, width: 776, height: 464 }
    },
    theme: {
      semantic: { text: "#222", surface: "#fff", border: "#888" },
      categorical: ["#4e79a7", "#f28e2c", "#59a14f"]
    },
    resolveColor: () => "#b07aa1"
  }
  const scene = motifBraidLayout(ctx)
  return {
    braid,
    ctx,
    scene,
    nodes: scene.sceneNodes as NetworkGlyphNode[],
    edges: scene.sceneEdges as NetworkCurvedEdge[]
  }
}

function points(path: string) {
  return [...path.matchAll(/[ML]([-\d.e+]+),([-\d.e+]+)/g)].map((match) => ({
    x: +match[1],
    y: +match[2]
  }))
}

function endWidths(edge: NetworkCurvedEdge): number[] {
  if (edge.style.fill === "none")
    return [edge.style.strokeWidth!, edge.style.strokeWidth!]
  const polygon = points(edge.pathD)
  const half = polygon.length / 2
  return [
    polygon[0].y - polygon.at(-1)!.y,
    polygon[half - 1].y - polygon[half].y
  ].map((width) => Number(Math.abs(width).toFixed(6)))
}

describe("Motif Braid step geometry", () => {
  it("labels every shared, repeated, terminal and independent-root vertex at its depth", () => {
    const journeys = [
      { path: ["A", "B", "C", "D", "E"] },
      { path: ["A", "B", "C", "D", "F"] },
      { path: ["A", "B", "C", "B", "C", "E"] },
      { path: ["A", "B"] },
      { path: ["U", "V", "E"] }
    ]
    const { nodes, edges, scene } = prepare(journeys)
    const prefixes = new Set(
      journeys.flatMap(({ path }) =>
        path.map((_, i) => path.slice(0, i + 1).join(">"))
      )
    )
    expect(new Set(nodes.map((node) => node.datum!.prefixId))).toEqual(prefixes)
    expect(
      nodes.every((node) => node.glyph.viewBox?.[0] === node.glyph.viewBox?.[1])
    ).toBe(true)
    expect(nodes.every((node) => node.glyph.parts[0].d.includes(" Q"))).toBe(
      true
    )
    for (let depth = 1; depth <= 6; depth++) {
      const atDepth = nodes.filter((node) => node.depth === depth)
      expect(new Set(atDepth.map((node) => node.cx)).size).toBe(1)
      expect(scene.labels).toContainEqual(
        expect.objectContaining({ x: atDepth[0].cx, text: `Step ${depth}` })
      )
    }
    for (const node of nodes) {
      expect(scene.labels).toContainEqual(
        expect.objectContaining({ x: node.cx, text: node.datum!.state })
      )
    }
    expect(
      nodes
        .filter((node) => node.datum!.state === "B")
        .map((node) => node.depth)
    ).toEqual([2, 4])
    const earlyJourney = edges.filter(
      (edge) => edge.datum!.groupId === "group:3"
    )
    expect(earlyJourney).toHaveLength(1)
    expect(points(earlyJourney[0].pathD).at(-1)!.x).toBe(
      nodes.find((node) => node.datum!.prefixId === "A>B")!.cx
    )
    // Every edge is an observed transition; separate roots are never joined.
    expect(edges).toHaveLength(
      journeys.reduce((count, { path }) => count + path.length - 1, 0)
    )
    expect(
      nodes.filter((node) => node.depth === 1).map((node) => node.datum!.state)
    ).toEqual(["A", "U"])
    expect(nodes.some((node) => node.depth === 0)).toBe(false)
  })

  it("keeps independently tapering strands straight through shared steps, then separates their branches", () => {
    const { braid, nodes, edges } = prepare([
      { path: ["A", "B", "C", "D"], counts: [100, 80, 50, 10] },
      { path: ["A", "B", "C", "E"], counts: [70, 50, 20, 5] }
    ])
    expect(braid.groups[0].stepEntityCounts).toEqual([100, 80, 50, 10])
    expect(braid.ribbons[0]).toMatchObject({
      entityCount: 100,
      toEntityCount: 80
    })
    const shared = edges.filter(
      (edge) => edge.datum!.fromStep === 0 && edge.datum!.toStep === 1
    )
    expect(shared).toHaveLength(2)
    const centers = shared.map((edge, index) => {
      const polygon = points(edge.pathD)
      expect(polygon).toHaveLength(4)
      const [startLower, endLower, endUpper, startUpper] = polygon
      expect(startLower.y - startUpper.y).toBeCloseTo([10, 7][index])
      expect(endLower.y - endUpper.y).toBeCloseTo([8, 5][index])
      const startCenter = (startLower.y + startUpper.y) / 2
      expect((endLower.y + endUpper.y) / 2).toBeCloseTo(startCenter)
      return startCenter
    })
    expect(centers[0]).not.toBe(centers[1])
    expect(shared.map(endWidths)).toEqual([
      [10, 8],
      [7, 5]
    ])
    const nextShared = edges.filter(
      (edge) => edge.datum!.fromStep === 1 && edge.datum!.toStep === 2
    )
    expect(
      nextShared.map((edge) => {
        const polygon = points(edge.pathD)
        return (polygon[0].y + polygon.at(-1)!.y) / 2
      })
    ).toEqual(centers)
    const branches = edges.filter(
      (edge) => edge.datum!.fromStep === 2 && edge.datum!.toStep === 3
    )
    expect(branches).toHaveLength(2)
    expect(branches.every((edge) => points(edge.pathD).length > 4)).toBe(true)
    expect(nodes.find((node) => node.datum!.state === "D")!.cy).not.toBe(
      nodes.find((node) => node.datum!.state === "E")!.cy
    )
    expect(
      endWidths(branches.find((edge) => edge.datum!.groupId === "group:0")!)[1]
    ).toBe(1)
  })

  it("retains parallel lanes through a nested split and does not overlap their vertical runs", () => {
    const { edges } = prepare([
      { path: ["A", "B", "C", "D"] },
      { path: ["A", "B", "C", "E"] },
      { path: ["A", "F"] }
    ])
    const sharedBranch = edges.filter((edge) =>
      String(edge.id).startsWith("step:all:A>B:")
    )
    expect(sharedBranch).toHaveLength(2)
    const bends = sharedBranch.map(
      (edge) => +edge.pathD.match(/Q([-\d.e+]+),/)![1]
    )
    expect(Math.abs(bends[0] - bends[1])).toBeGreaterThan(10)
  })

  it("keeps omitted counts constant and duplicate journeys in separate lanes", () => {
    const { braid, edges } = prepare([
      { path: ["A", "B"], count: 20 },
      { path: ["A", "B"], count: 10 }
    ])
    expect(
      braid.groups.every((group) => group.stepEntityCounts === undefined)
    ).toBe(true)
    const transitions = edges.filter(
      (edge) => edge.datum!.fromStep !== edge.datum!.toStep
    )
    expect(transitions.map((edge) => edge.style.strokeWidth)).toEqual([10, 5])
    expect(transitions[0].pathD).not.toBe(transitions[1].pathD)
    expect(edges.every((edge) => edge.style.fill === "none")).toBe(true)
  })

  it("tapers to zero without drawing a minimum-width phantom continuation", () => {
    const { edges, nodes } = prepare([
      { path: ["A", "B", "C"], counts: [100, 0, 0] }
    ])
    expect(nodes).toHaveLength(3)
    expect(edges).toHaveLength(1)
    const transition = edges.find((edge) => edge.datum!.toStep === 1)!
    expect(endWidths(transition)[1]).toBe(0)
    const polygon = points(transition.pathD)
    expect(polygon[1]).toEqual(polygon[2])
  })

  it("scales fractional traffic relative to the largest visible step", () => {
    const { edges } = prepare([{ path: ["A", "B"], counts: [0.5, 0.05] }])
    expect(endWidths(edges[0])).toEqual([10, 1])
  })

  it("uses a common scale across partitions and ignores hidden step counts", () => {
    const { ctx } = prepare([
      { path: ["A", "B"], counts: [100, 10], partition: "control" },
      { path: ["A", "B"], counts: [50, 20], partition: "treatment" },
      { path: ["X", "Y"], counts: [1e9, 1e8], partition: "hidden" }
    ])
    ctx.config.braid.atlas.spec.comparison = {
      partitions: ["control", "treatment"],
      denominatorMeasureId: "assigned"
    }
    const before = motifBraidLayout(ctx)
    const transitions = before.sceneEdges!.filter(
      (edge): edge is NetworkCurvedEdge => edge.type === "curved"
    )
    expect(transitions.map(endWidths)).toEqual([
      [10, 1],
      [5, 2]
    ])
    ctx.config.braid.groups.pop()
    expect(motifBraidLayout(ctx)).toEqual(before)
  })

  it("constructs actual endpoint widths and finite rounded outlines in both branch directions", () => {
    for (const y of [-80, 80]) {
      const polygon = points(
        taperedBraidPath(
          [
            { x: 0, y: 0 },
            { x: 60, y: 0 },
            { x: 60, y },
            { x: 120, y }
          ],
          10,
          1
        )
      )
      expect(
        polygon.every(
          (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
        )
      ).toBe(true)
      expect(polygon[0].y - polygon.at(-1)!.y).toBe(10)
      const half = polygon.length / 2
      expect(polygon[half - 1].y - polygon[half].y).toBe(1)
    }
  })
})

describe("Motif Braid traffic validation", () => {
  it.each([
    { counts: [100] },
    { counts: [100, -1] },
    { counts: [100, NaN] },
    { counts: [100, Infinity] },
    { counts: [100, undefined] },
    { counts: "100,20" },
    { counts: null },
    { counts: Array(2) }
  ])("rejects malformed per-step counts: $counts", ({ counts }) => {
    const { spec, source } = fixture([{ path: ["A", "B"] }])
    source.occurrences![0].stepEntityCounts = counts as unknown as number[]
    const result = prepareNetworkAtlas(spec, source)
    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        kind: "occurrence-step-counts",
        severity: "fatal"
      })
    )
  })

  it("does not change cohort weights or motif prevalence when per-step traffic is supplied", () => {
    const { braid } = prepare([
      { path: ["A", "B", "A"], count: 7, counts: [100, 50, 10] }
    ])
    expect(braid.groups[0].entityCount).toBe(7)
    expect(
      braid.profile.cells.find((cell) => cell.sectionId === "A")!
        .completionCount
    ).toBe(7)
  })
})
