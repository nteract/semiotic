// @vitest-environment node

/**
 * `perspective` across every network chart: component SSR (the hydration
 * SVG path through NetworkPipelineStore) and static rendering
 * (renderToStaticSVG / renderChart, which mirrors the projection stage).
 */
import { describe, expect, it } from "vitest"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

import { ForceDirectedGraph } from "../charts/network/ForceDirectedGraph"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import { ChordDiagram } from "../charts/network/ChordDiagram"
import { TreeDiagram } from "../charts/network/TreeDiagram"
import { Treemap } from "../charts/network/Treemap"
import { CirclePack } from "../charts/network/CirclePack"
import { OrbitDiagram } from "../charts/network/OrbitDiagram"
import { ProcessSankey } from "../charts/network/ProcessSankey"
import { NetworkCustomChart } from "../charts/custom/NetworkCustomChart"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { NetworkPerspective } from "../stream/networkPerspective"
import type { Datum } from "../charts/shared/datumTypes"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"

const nodes = [
  { id: "a", tier: 0 }, { id: "b", tier: 1 }, { id: "c", tier: 0 },
  { id: "d", tier: 2 }, { id: "e", tier: 0 }
]
const edges = [
  { source: "a", target: "b", value: 3 }, { source: "a", target: "c", value: 2 },
  { source: "b", target: "d", value: 1 }, { source: "c", target: "e", value: 2 }
]
const flows = [
  { source: "Coal", target: "Power", value: 30 }, { source: "Gas", target: "Power", value: 20 },
  { source: "Gas", target: "Heat", value: 15 }, { source: "Power", target: "Homes", value: 35 },
  { source: "Heat", target: "Homes", value: 15 }
]
const tree: Datum = {
  name: "root",
  children: [
    { name: "A", children: [{ name: "A1", value: 10 }, { name: "A2", value: 6 }] },
    { name: "B", children: [{ name: "B1", value: 8 }, { name: "B2", value: 12 }] }
  ]
}
const D = (m: number, d: number) => Date.UTC(2026, m - 1, d)

const grid: NetworkCustomLayout = ({ nodes: raw, dimensions }) => ({
  sceneNodes: raw.map((node, i) => ({
    type: "circle" as const,
    cx: 40 + (i % 3) * ((dimensions.width - 80) / 2),
    cy: 40 + Math.floor(i / 3) * ((dimensions.height - 80) / 2),
    r: 8,
    style: { fill: "#4e79a7" },
    datum: node,
    id: String(node.id)
  })),
  sceneEdges: []
})

type Case = [string, (perspective?: NetworkPerspective) => React.ReactElement]
const cases: Case[] = [
  ["ForceDirectedGraph", (p) => <ForceDirectedGraph nodes={nodes} edges={edges} iterations={60} width={400} height={300} perspective={p} />],
  ["SankeyDiagram", (p) => <SankeyDiagram edges={flows} width={400} height={300} perspective={p} />],
  ["ChordDiagram", (p) => <ChordDiagram edges={flows} width={400} height={300} perspective={p} />],
  ["TreeDiagram", (p) => <TreeDiagram data={tree} childrenAccessor="children" nodeIdAccessor="name" width={400} height={300} perspective={p} />],
  ["Treemap", (p) => <Treemap data={tree} childrenAccessor="children" valueAccessor="value" nodeIdAccessor="name" width={400} height={300} perspective={p} />],
  ["CirclePack", (p) => <CirclePack data={tree} childrenAccessor="children" valueAccessor="value" nodeIdAccessor="name" width={400} height={300} perspective={p} />],
  ["OrbitDiagram", (p) => <OrbitDiagram data={tree} childrenAccessor="children" nodeIdAccessor="name" width={400} height={300} animated={false} perspective={p} />],
  ["ProcessSankey", (p) => (
    <ProcessSankey
      nodes={[{ id: "Alice" }, { id: "Eng" }]}
      edges={[{ id: "e", source: "Alice", target: "Eng", value: 8, startTime: D(1, 20), endTime: D(2, 10) }]}
      domain={[D(1, 1), D(6, 30)]}
      layoutExecution="sync"
      width={400}
      height={300}
      perspective={p}
    />
  )],
  ["NetworkCustomChart", (p) => <NetworkCustomChart nodes={nodes} edges={[]} layout={grid} width={400} height={300} perspective={p} />]
]

/** Geometry-bearing attributes of the scene layer (paths, circles, rects, lines). */
function geometry(html: string): string[] {
  return [...html.matchAll(/<(path|circle|rect|line)\b([^>]*)>/g)]
    .map(([, tag, attrs]) => {
      const pick = (name: string) => attrs.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? ""
      return `${tag}:${pick("d")}${pick("cx")},${pick("cy")}${pick("x")},${pick("y")}${pick("x1")}`
    })
}

describe("perspective component SSR", () => {
  it.each(cases)("%s renders a projected scene with the same marks", (_name, make) => {
    const flat = ReactDOMServer.renderToStaticMarkup(make())
    const thin = ReactDOMServer.renderToStaticMarkup(make({ type: "isometric", thickness: 0 }))
    const flatShapes = geometry(flat)
    const thinShapes = geometry(thin)
    expect(thinShapes.length).toBeGreaterThan(0)
    // Without thickness: the same number of drawn shapes, in different places.
    expect(thinShapes.length).toBe(flatShapes.length)
    expect(thinShapes).not.toEqual(flatShapes)
    // With the default thickness every chart also draws side walls or edge
    // shadows, so the projection reads as solid pieces.
    expect(geometry(ReactDOMServer.renderToStaticMarkup(make("isometric"))).length).toBeGreaterThan(flatShapes.length)
    // Explicit "flat" is the identity.
    expect(ReactDOMServer.renderToStaticMarkup(make("flat"))).toBe(flat)
  })

  it("stands billboard point marks upright: radii are unchanged", () => {
    const radii = (html: string) =>
      [...html.matchAll(/<circle\b[^>]*\sr="([^"]+)"/g)].map((m) => Number(m[1])).sort()
    const make = cases[0][1]
    expect(radii(ReactDOMServer.renderToStaticMarkup(make({ type: "isometric", marks: "billboard" })))).toEqual(
      radii(ReactDOMServer.renderToStaticMarkup(make()))
    )
  })

  it("draws point marks as tokens with a shaded rim by default", () => {
    const html = ReactDOMServer.renderToStaticMarkup(cases[0][1]("isometric"))
    expect(html).not.toMatch(/<circle\b/)
    // Each of the five nodes: at least one rim face in a darker shade.
    expect((html.match(/<path\b[^>]*fill="rgb\(\d+,\d+,\d+\)"/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })

  it("lays area marks on the ground as projected outlines", () => {
    const html = ReactDOMServer.renderToStaticMarkup(cases[4][1]("isometric"))
    // Treemap cells become parallelograms (paths), not axis-aligned rects.
    expect(html).not.toMatch(/<rect\b[^>]*width="[\d.]+"[^>]*height="[\d.]+"[^>]*fill="#/)
    expect((html.match(/<path\b[^>]*d="M[^"]*Z"/g) ?? []).length).toBeGreaterThan(3)
  })
})

describe("perspective static rendering", () => {
  it("projects a JSON config through renderChart and draws every mark", () => {
    const { svg, evidence } = renderChartWithEvidence("ForceDirectedGraph", {
      nodes,
      edges,
      iterations: 60,
      width: 400,
      height: 300,
      perspective: { type: "isometric", elevation: "tier" }
    })
    const flat = renderChartWithEvidence("ForceDirectedGraph", { nodes, edges, iterations: 60, width: 400, height: 300 })
    expect(evidence.nodeCount).toBe(flat.evidence.nodeCount)
    expect(evidence.edgeCount).toBe(flat.evidence.edgeCount)
    // Lifted nodes get dashed drop lines to their ground point.
    expect(svg).toMatch(/stroke-dasharray="3 3"/)
  })

  it("paints a frameProps background like the live chart does", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes, edges, iterations: 20, width: 300, height: 200,
      frameProps: { background: "#0b1a5c" }
    })
    expect(svg).toContain("#0b1a5c")
    // A top-level value still wins.
    const top = renderChart("ForceDirectedGraph", {
      nodes, edges, iterations: 20, width: 300, height: 200,
      background: "#123456", frameProps: { background: "#0b1a5c" }
    })
    expect(top).toContain("#123456")
    expect(top).not.toContain("#0b1a5c")
  })

  it("renders ground grid, plates and labelled regions synchronously", () => {
    const svg = renderChart("ForceDirectedGraph", {
      nodes,
      edges,
      iterations: 60,
      width: 400,
      height: 300,
      perspective: {
        type: "pixel",
        ground: { grid: { step: 30 }, plate: true },
        regions: [{ id: "dmz", label: "INTERNET FACING", nodes: ["a", "b"], depth: 8 }],
        labels: { mode: "ground" }
      }
    })
    expect(svg).toContain("INTERNET FACING")
    expect(svg).toMatch(/<text\b[^>]*transform="rotate\(/)
    const gridPath = [...svg.matchAll(/<path\b[^>]*d="([^"]+)"/g)].map((m) => m[1]).find((d) => (d.match(/M/g) ?? []).length > 10)
    expect(gridPath).toBeTruthy()
  })

  it("extrudes treemap leaves with shaded faces", () => {
    const svg = renderChart("Treemap", {
      data: tree,
      childrenAccessor: "children",
      valueAccessor: "value",
      nodeIdAccessor: "name",
      width: 400,
      height: 300,
      perspective: { type: "isometric", marks: "extrude", extrude: "value" }
    })
    expect(svg).toMatch(/fill="rgb\(\d+,\d+,\d+\)"/)
  })

  it("routes force edges orthogonally when asked", () => {
    const straight = renderChart("ForceDirectedGraph", { nodes, edges, iterations: 60, width: 400, height: 300, perspective: "isometric" })
    const routed = renderChart("ForceDirectedGraph", {
      nodes, edges, iterations: 60, width: 400, height: 300,
      perspective: { type: "isometric", edges: { route: "orthogonal" } }
    })
    expect((straight.match(/<line\b/g) ?? []).length).toBeGreaterThan(0)
    expect((routed.match(/<line\b/g) ?? []).length).toBe(0)
  })
})
