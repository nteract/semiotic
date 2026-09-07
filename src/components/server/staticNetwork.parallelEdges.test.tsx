// @vitest-environment node

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import StreamNetworkFrame from "../stream/StreamNetworkFrame"
import { NetworkPipelineStore } from "../stream/NetworkPipelineStore"
import type { NetworkPipelineConfig } from "../stream/networkTypes"
import { buildRealtimeEdges } from "./staticNetwork"
import {
  renderChartWithEvidence,
  renderNetworkToStaticSVG
} from "./renderToStaticSVG"

const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }]
const edges = [
  { id: "first", source: "A", target: "B", value: 1 },
  { id: "second", source: "A", target: "B", value: 2 },
  { id: "onward", source: "B", target: "C", value: 3 }
]
const size: [number, number] = [600, 300]
const margin = { top: 0, right: 0, bottom: 0, left: 0 }

function pathGeometry(svg: string): string[] {
  return [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)]
    .map((match) => match[1])
    .sort()
}

describe("parallel Sankey edges across static entry points", () => {
  it("assigns each source row the same distinct identity as bounded browser ingestion", () => {
    const raw = edges.map(({ source, target, value }) => ({
      from: source,
      to: target,
      amount: value
    }))
    const config: NetworkPipelineConfig = {
      chartType: "sankey",
      sourceAccessor: "from",
      targetAccessor: "to",
      valueAccessor: "amount"
    }
    const serverEdges = buildRealtimeEdges(raw, config)
    const browserStore = new NetworkPipelineStore(config)
    browserStore.ingestBounded(nodes, raw, size)
    expect(serverEdges.map((edge) => edge._edgeKey)).toEqual([
      ...browserStore.edges.keys()
    ])
    expect(new Set(serverEdges.map((edge) => edge._edgeKey)).size).toBe(3)
    expect(serverEdges.map((edge) => edge.data)).toEqual(raw)
    expect(serverEdges.map((edge) => edge.value)).toEqual([1, 2, 3])
  })

  it.each(["horizontal", "vertical"] as const)(
    "retains all ribbons with the browser's geometry in %s output",
    (orientation) => {
      const config: NetworkPipelineConfig = {
        chartType: "sankey",
        orientation,
        nodeWidth: 10,
        nodePaddingRatio: 0.05,
        nodeAlign: "justify",
        showLabels: false
      }
      const browserStore = new NetworkPipelineStore(config)
      browserStore.ingestBounded(nodes, edges, size)
      browserStore.buildScene(size)
      const renderedEdges = [...browserStore.edges.values()]
      expect(renderedEdges.map((edge) => edge.value)).toEqual([1, 2, 3])
      expect(renderedEdges[0].sankeyWidth).toBeGreaterThan(0)
      expect(renderedEdges[1].sankeyWidth).toBeGreaterThan(
        renderedEdges[0].sankeyWidth
      )
      expect(renderedEdges[2].sankeyWidth).toBeGreaterThan(
        renderedEdges[1].sankeyWidth
      )
      const browserPaths = browserStore.sceneEdges
        .map((edge) => ("pathD" in edge ? edge.pathD : ""))
        .sort()
      expect(browserPaths).toHaveLength(3)
      expect(new Set(browserPaths).size).toBe(3)

      const props = {
        nodes,
        edges,
        orientation,
        nodeWidth: 10,
        nodePaddingRatio: 0.05,
        nodeAlign: "justify" as const,
        showLabels: false,
        margin
      }
      const highLevel = renderChartWithEvidence("SankeyDiagram", {
        ...props,
        width: size[0],
        height: size[1]
      })
      expect(highLevel.evidence.edgeCount).toBe(3)
      const outputs = [
        highLevel.svg,
        renderNetworkToStaticSVG({ ...props, chartType: "sankey", size }),
        renderToStaticMarkup(
          <SankeyDiagram {...props} width={size[0]} height={size[1]} />
        ),
        renderToStaticMarkup(
          <StreamNetworkFrame {...props} chartType="sankey" size={size} />
        )
      ]
      for (const svg of outputs) expect(pathGeometry(svg)).toEqual(browserPaths)
    }
  )
})
