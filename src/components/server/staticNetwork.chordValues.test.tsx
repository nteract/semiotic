// @vitest-environment node
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ChordDiagram } from "../charts/network/ChordDiagram"
import StreamNetworkFrame from "../stream/StreamNetworkFrame"
import { NetworkPipelineStore } from "../stream/NetworkPipelineStore"
import { DefaultNetworkTooltip } from "../stream/networkDefaultTooltip"
import { buildNetworkTableModel } from "../stream/networkAccessibleDataTableModel"
import {
  renderChartWithEvidence,
  renderNetworkToStaticSVG
} from "./renderToStaticSVG"
import { buildRealtimeEdges } from "./staticNetwork"
import type { HoverData } from "../realtime/types"

const size: [number, number] = [600, 400]
const margin = { top: 0, right: 0, bottom: 0, left: 0 }
const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }]
const edges = [
  { source: "A", target: "B", weight: 30 },
  { source: "A", target: "B", weight: 60 },
  { source: "B", target: "A", weight: 20 },
  { source: "A", target: "C", weight: 10 }
]
const paths = (svg: string) =>
  [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1]).sort()

describe("chord values across public entry points", () => {
  it.each(["weight" as const, (d: Record<string, unknown>) => Number(d.weight)])(
    "matches browser ribbon geometry for accessor %s",
    (valueAccessor) => {
      const props = {
        nodes,
        edges,
        valueAccessor,
        showLabels: false,
        margin,
        groupWidth: 20,
        padAngle: 0.01
      }
      const store = new NetworkPipelineStore({ chartType: "chord", ...props })
      store.ingestBounded(nodes, edges, size)
      store.buildScene(size)
      const browserPaths = store.sceneEdges
        .map((edge) => (edge.type === "ribbon" ? edge.pathD : ""))
        .sort()
      expect(browserPaths).toHaveLength(2)
      const highLevel = renderChartWithEvidence("ChordDiagram", {
        ...props,
        width: size[0],
        height: size[1]
      })
      expect(highLevel.evidence.edgeCount).toBe(2)
      const outputs = [
        highLevel.svg,
        renderNetworkToStaticSVG({ ...props, chartType: "chord", size }),
        renderToStaticMarkup(
          <ChordDiagram {...props} width={size[0]} height={size[1]} />
        ),
        renderToStaticMarkup(
          <StreamNetworkFrame {...props} chartType="chord" size={size} />
        )
      ]
      for (const svg of outputs) {
        // SVG also contains the arc node paths; each browser ribbon occurs once.
        const rendered = paths(svg)
        for (const path of browserPaths)
          expect(rendered.filter((d) => d === path)).toHaveLength(1)
        expect(svg).not.toMatch(/NaN|Infinity/)
      }
    }
  )

  it("retains every contributing value in default tooltips and accessible tables", () => {
    const store = new NetworkPipelineStore({
      chartType: "chord",
      valueAccessor: "weight"
    })
    store.ingestBounded(nodes, edges, size)
    store.buildScene(size)
    const edge = store.sceneEdges[0]
    const tooltip = renderToStaticMarkup(
      <DefaultNetworkTooltip
        data={{ nodeOrEdge: "edge", data: edge.datum } as HoverData}
      />
    )
    expect(tooltip).toContain("Connections: 3")
    for (const row of ["A → B: 30", "A → B: 60", "B → A: 20"])
      expect(tooltip).toContain(row)
    const model = buildNetworkTableModel(store.sceneNodes, store.sceneEdges)
    expect(model.edgeRows.map((row) => row.values)).toEqual(edges)
    expect(model.nodeRows.find((node) => node.id === "A")).toMatchObject({
      inDeg: 1,
      outDeg: 3,
      wInDeg: 20,
      wOutDeg: 100
    })
  })
})

it("uses the same missing, zero, and fractional value normalization on server and browser", () => {
  const raw = [undefined, null, 0, 0.2].map((weight, index) => ({
    source: "A",
    target: String(index),
    weight
  }))
  const config = { chartType: "chord" as const, valueAccessor: "weight" }
  const store = new NetworkPipelineStore(config)
  store.ingestBounded([], raw, size)
  const serverEdges = buildRealtimeEdges(raw, config)
  expect(serverEdges.map((edge) => edge.value)).toEqual([1, 1, 0, 0.2])
  expect(serverEdges.map((edge) => edge.value)).toEqual(
    [...store.edges.values()].map((edge) => edge.value)
  )
})
