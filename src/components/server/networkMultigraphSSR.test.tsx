// @vitest-environment node
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { ForceDirectedGraph } from "../charts/network/ForceDirectedGraph"
import { renderChart } from "./renderToStaticSVG"

it("renders loops and parallel edges in React SSR and standalone SVG", () => {
  const props = {
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ source: "a", target: "a" }, { source: "a", target: "b" }, { source: "a", target: "b" }],
    width: 500, height: 300, edgeColor: "#328461",
  }
  for (const svg of [renderToStaticMarkup(<ForceDirectedGraph {...props} />), renderChart("ForceDirectedGraph", props)]) {
    const edges = [...svg.matchAll(/<path\b[^>]*>/g)].map(match => match[0]).filter(tag => tag.includes('stroke="#328461"'))
    const paths = edges.map(tag => tag.match(/ d="([^"]+)"/)![1])
    expect(paths).toHaveLength(3)
    expect(new Set(paths).size).toBe(3)
    expect(paths.filter(d => / [Cc]/.test(d))).toHaveLength(1)
    expect(paths.filter(d => d.includes(" Q"))).toHaveLength(2)
  }
})
