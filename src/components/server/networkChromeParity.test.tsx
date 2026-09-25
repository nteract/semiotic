// @vitest-environment node
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ProcessSankey } from "../charts/network/ProcessSankey"
import { ForceDirectedGraph } from "../charts/network/ForceDirectedGraph"
import { renderChart } from "./renderToStaticSVG"

const nodes = [
  { id: "A", category: "First" },
  { id: "B", category: "Second" }
]
const edges = [{ source: "A", target: "B", value: 3, startTime: 2, endTime: 8 }]
const geometry = (svg: string) =>
  [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
    .map((match) => match[1])
    .sort()

describe("network HOC and static chrome parity", () => {
  it.each(["horizontal", "vertical"] as const)(
    "ProcessSankey %s uses the same plot extent for automatic ticks",
    (orientation) => {
      const props = {
        nodes,
        edges,
        domain: [0, 10] as [number, number],
        orientation,
        width: 500,
        height: 320,
        colorBy: "category" as const,
        showLegend: true
      }
      const hoc = renderToStaticMarkup(<ProcessSankey {...props} />)
      const server = renderChart("ProcessSankey", props)
      expect(geometry(server)).toEqual(geometry(hoc))
      expect(geometry(server).length).toBeGreaterThan(2)
    }
  )

  it.each([undefined, false, true])(
    "ForceDirectedGraph matches default and explicit label visibility (%s)",
    (showLabels) => {
      const props = { nodes, edges, width: 400, height: 300, showLabels }
      const hoc = renderToStaticMarkup(<ForceDirectedGraph {...props} />)
      const server = renderChart("ForceDirectedGraph", props)
      for (const svg of [hoc, server]) {
        expect(/<text\b[^>]*>A<\/text>/.test(svg)).toBe(showLabels === true)
        expect(/<text\b[^>]*>B<\/text>/.test(svg)).toBe(showLabels === true)
      }
    }
  )
})
