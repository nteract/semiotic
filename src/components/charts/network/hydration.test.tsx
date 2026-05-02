/**
 * Phase 3 — hydration parity across the network HOC catalog.
 *
 * The boundary lives in `StreamNetworkFrame`, so every HOC that funnels
 * through it should hydrate for free. This file exercises the harder
 * scene primitives — chord ribbons, sankey beziers, hierarchy rects,
 * orbit arcs, force-directed positions — all of which need to round-trip
 * through `SceneToSVG` cleanly.
 */
import * as React from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { act } from "react"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"

import { ForceDirectedGraph } from "./ForceDirectedGraph"
import { ChordDiagram } from "./ChordDiagram"
import { SankeyDiagram } from "./SankeyDiagram"
import { TreeDiagram } from "./TreeDiagram"
import { Treemap } from "./Treemap"
import { CirclePack } from "./CirclePack"
import { OrbitDiagram } from "./OrbitDiagram"
import { NetworkCustomChart } from "../custom/NetworkCustomChart"

const nodes = [
  { id: "a", group: "x" },
  { id: "b", group: "x" },
  { id: "c", group: "y" },
  { id: "d", group: "y" },
]

const edges = [
  { source: "a", target: "b", value: 5 },
  { source: "a", target: "c", value: 2 },
  { source: "b", target: "d", value: 3 },
  { source: "c", target: "d", value: 4 },
]

const hierarchy = {
  name: "root",
  children: [
    {
      name: "alpha",
      children: [
        { name: "alpha-1", value: 10 },
        { name: "alpha-2", value: 7 },
      ],
    },
    {
      name: "beta",
      children: [
        { name: "beta-1", value: 4 },
        { name: "beta-2", value: 8 },
      ],
    },
  ],
}

interface HydrationCase {
  name: string
  render: () => React.ReactElement
}

const cases: HydrationCase[] = [
  // Force-directed: simulation-based node positions. Server pass and
  // first-client-render share the same store, so positions agree.
  { name: "ForceDirectedGraph", render: () => (
    <ForceDirectedGraph nodes={nodes} edges={edges} nodeIDAccessor="id" sourceAccessor="source" targetAccessor="target" iterations={50} width={400} height={300} />
  ) },
  // Ribbons (chord scene primitive).
  { name: "ChordDiagram", render: () => (
    <ChordDiagram edges={edges} valueAccessor="value" nodeIdAccessor="id" sourceAccessor="source" targetAccessor="target" width={400} height={400} />
  ) },
  // Bezier edges + rect nodes (sankey scene primitives).
  { name: "SankeyDiagram", render: () => (
    <SankeyDiagram nodes={nodes} edges={edges} nodeIdAccessor="id" sourceAccessor="source" targetAccessor="target" valueAccessor="value" width={500} height={300} />
  ) },
  // Hierarchy: rects + connectors.
  { name: "TreeDiagram", render: () => (
    <TreeDiagram data={hierarchy} childrenAccessor="children" valueAccessor="value" width={500} height={400} />
  ) },
  { name: "Treemap", render: () => (
    <Treemap data={hierarchy} childrenAccessor="children" valueAccessor="value" width={500} height={400} />
  ) },
  { name: "CirclePack", render: () => (
    <CirclePack data={hierarchy} childrenAccessor="children" valueAccessor="value" width={400} height={400} />
  ) },
  // Orbit: arcs + animated node positions. We freeze animation off so
  // the snapshot is stable; the SSR branch otherwise emits whatever
  // the store has at that microsecond.
  { name: "OrbitDiagram", render: () => (
    <OrbitDiagram data={hierarchy} childrenAccessor="children" animated={false} width={400} height={400} />
  ) },
  // Custom layout: trivial geometry to prove the boundary works for
  // user-supplied scene generators too.
  { name: "NetworkCustomChart", render: () => (
    <NetworkCustomChart
      nodes={nodes}
      edges={edges}
      layout={(ctx) => ({
        sceneNodes: ctx.nodes.map((n, i) => ({
          type: "circle" as const,
          x: 50 + i * 80,
          y: 100,
          r: 12,
          style: { fill: ctx.resolveColor(String(n.id)) },
          datum: n,
        })),
      })}
      width={400}
      height={200}
    />
  ) },
]

describe("Network HOC catalog — hydration parity", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  for (const c of cases) {
    describe(c.name, () => {
      it("renderToString produces SVG markup, no <canvas>", () => {
        const html = renderToString(c.render())
        expect(html).not.toContain("<canvas")
        expect(html).toContain("<svg")
      })

      it("hydrates from server-rendered HTML without React mismatch warnings", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        const html = renderToString(c.render())
        container.innerHTML = html

        let root: ReturnType<typeof hydrateRoot> | null = null
        act(() => {
          root = hydrateRoot(container, c.render())
        })

        const mismatchWarnings = errorSpy.mock.calls.filter((call) => {
          const msg = String(call[0] ?? "")
          return /did not match|hydration failed|hydration error/i.test(msg)
        })
        expect(mismatchWarnings).toEqual([])

        root?.unmount()
        errorSpy.mockRestore()
      })

      it("upgrades to interactive canvas after hydration", () => {
        const html = renderToString(c.render())
        container.innerHTML = html

        let root: ReturnType<typeof hydrateRoot> | null = null
        act(() => {
          root = hydrateRoot(container, c.render())
        })

        const canvases = container.querySelectorAll("canvas")
        expect(canvases.length).toBeGreaterThanOrEqual(1)

        root?.unmount()
      })
    })
  }
})
