// @vitest-environment node
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import StreamNetworkFrame from "../stream/StreamNetworkFrame"
import { NetworkPipelineStore } from "../stream/NetworkPipelineStore"
import { DefaultNetworkTooltip } from "../stream/networkDefaultTooltip"
import { buildNetworkTableModel } from "../stream/networkAccessibleDataTableModel"
import {
  renderChartWithEvidence,
  renderNetworkToStaticSVG
} from "./renderToStaticSVG"
import type { HoverData } from "../realtime/types"

const size: [number, number] = [600, 400]
const margin = { top: 0, right: 0, bottom: 0, left: 0 }
const nodes = ["A", "B", "C", "D", "E", "F"].map((id) => ({ id }))
const cycles = nodes.map(({ id }, i) => ({
  source: id,
  target: id,
  value: i + 1
}))
cycles.push(
  ...nodes
    .slice(1)
    .map(({ id }, i) => ({ source: nodes[i].id, target: id, value: 1 }))
)
const paths = (svg: string) =>
  [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1]).sort()

it.each(["horizontal", "vertical"] as const)(
  "preserves all circular Sankey bands across %s browser/server entry points",
  (orientation) => {
    const props = {
      nodes,
      edges: cycles,
      showLabels: false,
      margin,
      orientation,
      nodeWidth: 10,
      nodePaddingRatio: 0.05,
      nodeAlign: "justify" as const
    }
    const store = new NetworkPipelineStore({ chartType: "sankey", ...props })
    store.ingestBounded(nodes, cycles, size)
    store.buildScene(size)
    const browserPaths = store.sceneEdges
      .map((edge) => (edge.type === "bezier" ? edge.pathD : ""))
      .sort()
    expect(browserPaths).toHaveLength(11)
    const highLevel = renderChartWithEvidence("SankeyDiagram", {
      ...props,
      width: size[0],
      height: size[1]
    })
    expect(highLevel.evidence.edgeCount).toBe(11)
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
    for (const svg of outputs) expect(paths(svg)).toEqual(browserPaths)
  }
)

it("reports original Sankey totals in default tooltips and accessible tables", () => {
  const edges = [
    { source: "A", target: "B", value: 100 },
    { source: "B", target: "C", value: 50 },
    { source: "B", target: "D", value: 50 }
  ]
  const store = new NetworkPipelineStore({ chartType: "sankey" })
  store.ingestBounded(nodes.slice(0, 4), edges, size)
  store.buildScene(size)
  const node = store.nodes.get("B")!
  const tooltip = renderToStaticMarkup(
    <DefaultNetworkTooltip
      data={{ nodeOrEdge: "node", data: node, x: node.x, y: node.y } as HoverData}
    />
  )
  expect(tooltip).toContain("Total: 100")
  const model = buildNetworkTableModel(store.sceneNodes, store.sceneEdges)
  expect(
    model.nodeRows.find((row) => row.id === "B")?.semantic.values.value
  ).toBe(100)
})
