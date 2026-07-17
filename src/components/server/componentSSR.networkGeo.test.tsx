// @vitest-environment node

/**
 * Component-level SSR tests — network, geo, and mark-count contracts.
 *
 * Split out of componentSSR.test.tsx (see scripts/file-size-policy.json) to
 * keep both files under the test hard limit. Runs in Node environment (no
 * window/document) so isServerEnvironment is true and Stream Frames render
 * SVG instead of canvas.
 */

import { describe, it, expect } from "vitest"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

// HOC components
import { ConnectedScatterplot } from "../charts/xy/ConnectedScatterplot"
import { QuadrantChart } from "../charts/xy/QuadrantChart"
import { ForceDirectedGraph } from "../charts/network/ForceDirectedGraph"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import { TreeDiagram } from "../charts/network/TreeDiagram"
import { Treemap } from "../charts/network/Treemap"
import { CirclePack } from "../charts/network/CirclePack"

// Standalone SSR for equivalence tests
import { renderXYToStaticSVG, renderOrdinalToStaticSVG, renderNetworkToStaticSVG, renderGeoToStaticSVG, renderChart } from "./renderToStaticSVG"

// ── Helpers ──────────────────────────────────────────────────────────────

function renderComponent(element: React.ReactElement): string {
  return ReactDOMServer.renderToStaticMarkup(element)
}

function countPattern(html: string, pattern: RegExp): number {
  return (html.match(pattern) || []).length
}

function countOccurrences(html: string, tag: string): number {
  const regex = new RegExp(`<${tag}[\\s/>]`, "g")
  return (html.match(regex) || []).length
}

type StaticNetworkProps = Parameters<typeof renderNetworkToStaticSVG>[0]
type StaticGeoProps = Parameters<typeof renderGeoToStaticSVG>[0]

// ── Network Chart SSR ──────────────────────────────────────────────────

const networkNodes = [
  { id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }
]
const networkEdges = [
  { source: "A", target: "B" },
  { source: "B", target: "C" },
  { source: "C", target: "D" },
  { source: "A", target: "D" },
]

const sankeyEdges = [
  { source: "Revenue", target: "Product", value: 80 },
  { source: "Revenue", target: "Services", value: 50 },
  { source: "Product", target: "Profit", value: 60 },
  { source: "Services", target: "Profit", value: 40 },
]

const treeData = {
  id: "root",
  children: [
    { id: "A", children: [{ id: "A1" }, { id: "A2" }] },
    { id: "B", children: [{ id: "B1" }] },
  ]
}

describe("Component SSR — Network Charts", () => {
  it("ForceDirectedGraph renders node circles and edge lines", () => {
    const html = renderComponent(
      <ForceDirectedGraph
        nodes={networkNodes}
        edges={networkEdges}
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(4)
  })

  it("SankeyDiagram renders node rects and edge paths", () => {
    const html = renderComponent(
      <SankeyDiagram
        edges={sankeyEdges}
        width={500}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    // 5 unique nodes inferred from edges
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(4)
    // 4 edges = 4 paths
    expect(countOccurrences(html, "path")).toBeGreaterThanOrEqual(4)
  })

  it("renderChart('ProcessSankey', …) renders lifecycle timing stubs in SSR", () => {
    const svg = renderChart("ProcessSankey", {
      nodes: [
        { id: "Queue" },
        { id: "Review" },
        { id: "Done" },
      ],
      edges: [
        {
          source: "Queue",
          target: "Review",
          value: 12,
          enteredSystem: 0,
          startTime: 1,
          endTime: 3,
          exitedSystem: 5,
        },
        {
          source: "Review",
          target: "Done",
          value: 8,
          enteredSystem: 1,
          startTime: 3,
          endTime: 5,
          exitedSystem: 6,
        },
      ],
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
      startTimeAccessor: "startTime",
      endTimeAccessor: "endTime",
      systemInTimeAccessor: "enteredSystem",
      systemOutTimeAccessor: "exitedSystem",
      domain: [0, 6],
      width: 520,
      height: 320,
      showLegend: false,
    })

    expect(svg).toContain("<svg")
    expect(svg).toContain("<path")
    expect(svg).toContain("opacity=\"0.35\"")
    expect(svg).toContain("fill-opacity=\"0.86\"")
  })

  it("renderChart('ProcessSankey', …) preserves temporal axis chrome", () => {
    const svg = renderChart("ProcessSankey", {
      nodes: [{ id: "Queue" }, { id: "Done" }],
      edges: [{ source: "Queue", target: "Done", value: 4, startTime: 1, endTime: 3 }],
      domain: [0, 4],
      axisTicks: [{ date: 1, label: "Start" }, { date: 3, label: "Finish" }],
      width: 500,
      height: 280,
    })
    expect(svg).toContain(">Start<")
    expect(svg).toContain(">Finish<")
    expect(svg).toContain('stroke="#94a3b8"')
  })

  it("TreeDiagram renders nodes and edges", () => {
    const html = renderComponent(
      <TreeDiagram
        data={treeData}
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    // 6 nodes total (root + A + A1 + A2 + B + B1)
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(5)
  })

  it("Treemap renders rect elements for each leaf", () => {
    const html = renderComponent(
      <Treemap
        data={{
          id: "root",
          children: [
            { id: "A", value: 30 },
            { id: "B", value: 50 },
            { id: "C", value: 20 },
          ]
        }}
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(3)
  })

  it("CirclePack renders circle elements", () => {
    const html = renderComponent(
      <CirclePack
        data={{
          id: "root",
          children: [
            { id: "A", value: 30 },
            { id: "B", value: 50 },
            { id: "C", value: 20 },
          ]
        }}
        width={400}
        height={400}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    // root + 3 children = at least 3 circles
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(3)
  })
})

// ── Network SSR — Node inference from edges ────────────────────────────

describe("Component SSR — Network node inference", () => {
  it("SankeyDiagram with edges-only infers nodes (no explicit nodes prop)", () => {
    const html = renderComponent(
      <SankeyDiagram
        edges={sankeyEdges}
        width={500}
        height={300}
      />
    )

    // Should have rects for each unique node (Revenue, Product, Services, Profit)
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(4)
    // Should have edge paths
    expect(countOccurrences(html, "path")).toBeGreaterThanOrEqual(4)
  })

  it("ForceDirectedGraph with edges-only shows validation message (nodes required)", () => {
    // The HOC requires explicit nodes — node inference only happens in standalone SSR.
    // The error boundary catches the validation and renders a helpful message.
    const html = renderComponent(
      <ForceDirectedGraph
        edges={networkEdges}
        width={400}
        height={400}
      />
    )

    expect(html).toContain("ForceDirectedGraph")
    expect(html).toContain("No nodes provided")
    expect(html).not.toContain("<canvas")
  })
})

// ── Standalone Network SSR — Node inference regression ─────────────────

describe("Standalone SSR — Network node inference from edges", () => {
  it("sankey renders nodes and edges when only edges are provided", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      edges: sankeyEdges,
      size: [500, 300],
    } as StaticNetworkProps)

    expect(svg).toContain("<svg")
    // 4 unique nodes
    expect((svg.match(/<rect /g) || []).length).toBeGreaterThanOrEqual(4)
    // 4 edge paths
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(4)
  })

  it("sankey with explicit nodes still works", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      nodes: [{ id: "Revenue" }, { id: "Product" }, { id: "Services" }, { id: "Profit" }],
      edges: sankeyEdges,
      size: [500, 300],
    } as StaticNetworkProps)

    expect(svg).toContain("<svg")
    expect((svg.match(/<rect /g) || []).length).toBeGreaterThanOrEqual(4)
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(4)
  })

  it("force renders circles when only edges are provided", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "force",
      edges: networkEdges,
      size: [400, 400],
    } as StaticNetworkProps)

    expect(svg).toContain("<svg")
    expect((svg.match(/<circle /g) || []).length).toBeGreaterThanOrEqual(4)
  })

  it("edges-only with no edges returns empty SVG", () => {
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      edges: [],
      size: [500, 300],
    } as StaticNetworkProps)

    expect(svg).toContain("<svg")
    expect((svg.match(/<rect /g) || []).length).toBe(0)
    expect((svg.match(/<path /g) || []).length).toBe(0)
  })
})

// ── Mark count contracts ───────────────────────────────────────────────

describe("SSR mark count contracts", () => {
  it("N scatter points → N circles", () => {
    for (const n of [3, 7, 12]) {
      const data = Array.from({ length: n }, (_, i) => ({ x: i, y: i * 2 }))
      const svg = renderXYToStaticSVG({
        chartType: "scatter",
        data,
        xAccessor: "x",
        yAccessor: "y",
        size: [400, 300],
      })
      expect((svg.match(/<circle /g) || []).length).toBe(n)
    }
  })

  it("N bar categories → N rects", () => {
    for (const n of [2, 5, 8]) {
      const data = Array.from({ length: n }, (_, i) => ({
        category: `Cat${i}`,
        value: (i + 1) * 10,
      }))
      const svg = renderOrdinalToStaticSVG({
        chartType: "bar",
        data,
        oAccessor: "category",
        rAccessor: "value",
        size: [400, 300],
      })
      const rects = (svg.match(/<rect [^>]*fill="#[0-9a-f]{6}"/gi) || []).length
      expect(rects).toBe(n)
    }
  })

  it("N pie categories → N wedge paths", () => {
    for (const n of [3, 5]) {
      const data = Array.from({ length: n }, (_, i) => ({
        category: `Slice${i}`,
        value: (i + 1) * 10,
      }))
      const svg = renderOrdinalToStaticSVG({
        chartType: "pie",
        data,
        oAccessor: "category",
        rAccessor: "value",
        projection: "radial",
        size: [400, 400],
      })
      expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(n)
    }
  })

  it("sankey: E edges → E path elements", () => {
    const edges = [
      { source: "A", target: "B", value: 10 },
      { source: "A", target: "C", value: 20 },
      { source: "B", target: "D", value: 15 },
    ]
    const svg = renderNetworkToStaticSVG({
      chartType: "sankey",
      edges,
      size: [500, 300],
    } as StaticNetworkProps)

    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(3)
    // 4 unique nodes → 4 rects
    expect((svg.match(/<rect /g) || []).length).toBeGreaterThanOrEqual(4)
  })
})

// ── Geo SSR — renderGeoToStaticSVG ──────────────────────────────────────

const geoAreas = [
  {
    type: "Feature",
    properties: { name: "CountryA", gdp: 100 },
    geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }
  },
  {
    type: "Feature",
    properties: { name: "CountryB", gdp: 200 },
    geometry: { type: "Polygon", coordinates: [[[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]]] }
  },
  {
    type: "Feature",
    properties: { name: "CountryC", gdp: 50 },
    geometry: { type: "Polygon", coordinates: [[[40, 0], [50, 0], [50, 10], [40, 10], [40, 0]]] }
  },
]

const geoPoints = [
  { lon: 5, lat: 5, population: 1000000 },
  { lon: 25, lat: 5, population: 5000000 },
  { lon: 45, lat: 5, population: 2000000 },
]

const geoLines = [
  {
    coordinates: [
      { lon: 5, lat: 5 },
      { lon: 25, lat: 5 },
      { lon: 45, lat: 5 },
    ]
  }
]

describe("Standalone SSR — Geo Charts (renderGeoToStaticSVG)", () => {
  it("renders area polygons as SVG path elements", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as StaticGeoProps["areas"],
      projection: "equalEarth",
      size: [600, 400],
    } as StaticGeoProps)

    expect(svg).toContain("<svg")
    expect(svg).not.toContain("<canvas")
    // 3 areas = 3 paths
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(3)
  })

  it("renders point data as SVG circle elements", () => {
    const svg = renderGeoToStaticSVG({
      points: geoPoints,
      xAccessor: "lon",
      yAccessor: "lat",
      projection: "equalEarth",
      size: [600, 400],
    } as StaticGeoProps)

    expect(svg).toContain("<svg")
    expect(svg).not.toContain("<canvas")
    // 3 points = 3 circles
    expect((svg.match(/<circle /g) || []).length).toBeGreaterThanOrEqual(3)
  })

  it("renders line data as SVG path elements", () => {
    const svg = renderGeoToStaticSVG({
      lines: geoLines,
      xAccessor: "lon",
      yAccessor: "lat",
      lineDataAccessor: "coordinates",
      projection: "equalEarth",
      size: [600, 400],
    } as StaticGeoProps)

    expect(svg).toContain("<svg")
    expect(svg).not.toContain("<canvas")
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(1)
  })

  it("renders areas + points together", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as StaticGeoProps["areas"],
      points: geoPoints,
      xAccessor: "lon",
      yAccessor: "lat",
      projection: "equalEarth",
      size: [600, 400],
    } as StaticGeoProps)

    expect(svg).toContain("<svg")
    // At least 3 area paths + 3 point circles
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(3)
    expect((svg.match(/<circle /g) || []).length).toBeGreaterThanOrEqual(3)
  })

  it("returns empty SVG when no geo data is provided", () => {
    const svg = renderGeoToStaticSVG({
      projection: "equalEarth",
      size: [600, 400],
    } as StaticGeoProps)

    expect(svg).toContain("<svg")
    expect((svg.match(/<path /g) || []).length).toBe(0)
    expect((svg.match(/<circle /g) || []).length).toBe(0)
  })

  it("renders title text when provided", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as StaticGeoProps["areas"],
      projection: "equalEarth",
      size: [600, 400],
      title: "World GDP",
    } as StaticGeoProps)

    expect(svg).toContain("World GDP")
  })

  it("applies className to SVG element", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as StaticGeoProps["areas"],
      projection: "equalEarth",
      size: [600, 400],
      className: "my-geo-chart",
    } as StaticGeoProps)

    expect(svg).toContain("my-geo-chart")
    expect(svg).toContain("stream-geo-frame")
  })

  it("supports mercator projection", () => {
    const svg = renderGeoToStaticSVG({
      areas: geoAreas as StaticGeoProps["areas"],
      projection: "mercator",
      size: [600, 400],
    } as StaticGeoProps)

    expect(svg).toContain("<svg")
    expect((svg.match(/<path /g) || []).length).toBeGreaterThanOrEqual(3)
  })
})

describe("SSR mark count contracts — Geo", () => {
  it("N geo areas → N path elements", () => {
    for (const n of [1, 3, 5]) {
      const areas = Array.from({ length: n }, (_, i) => ({
        type: "Feature",
        properties: { name: `Country${i}` },
        geometry: {
          type: "Polygon",
          coordinates: [[[i * 15, 0], [i * 15 + 10, 0], [i * 15 + 10, 10], [i * 15, 10], [i * 15, 0]]]
        }
      }))
      const svg = renderGeoToStaticSVG({
        areas: areas as StaticGeoProps["areas"],
        projection: "equalEarth",
        size: [600, 400],
      } as StaticGeoProps)
      expect((svg.match(/<path /g) || []).length).toBe(n)
    }
  })

  it("N geo points → N circle elements", () => {
    for (const n of [2, 5, 10]) {
      const points = Array.from({ length: n }, (_, i) => ({
        lon: i * 10,
        lat: i * 5,
      }))
      const svg = renderGeoToStaticSVG({
        points,
        xAccessor: "lon",
        yAccessor: "lat",
        projection: "equalEarth",
        size: [600, 400],
      } as StaticGeoProps)
      expect((svg.match(/<circle /g) || []).length).toBe(n)
    }
  })
})

// ── ConnectedScatterplot SSR ──────────────────────────────────────────────

describe("Component SSR — ConnectedScatterplot", () => {
  const trajectoryData = [
    { x: 10, y: 20 },
    { x: 20, y: 40 },
    { x: 30, y: 35 },
    { x: 40, y: 60 },
    { x: 50, y: 50 },
  ]

  it("renders point circles in SSR", () => {
    const html = renderComponent(
      <ConnectedScatterplot
        data={trajectoryData}
        xAccessor="x"
        yAccessor="y"
        width={400}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    // 5 data points = 5 circles
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(5)
  })

  it("renders connecting line segments via svgPreRenderers", () => {
    const html = renderComponent(
      <ConnectedScatterplot
        data={trajectoryData}
        xAccessor="x"
        yAccessor="y"
        width={400}
        height={300}
      />
    )

    // Connecting segments use stroke-linecap="round" — unique to svgPreRenderer lines
    // 5 points = 4 connecting segments (each with stroke-linecap="round")
    const roundCapLines = countPattern(html, /stroke-linecap="round"/g)
    expect(roundCapLines).toBeGreaterThanOrEqual(4)
  })

  it("renders halo lines when fewer than 100 points", () => {
    const html = renderComponent(
      <ConnectedScatterplot
        data={trajectoryData}
        xAccessor="x"
        yAccessor="y"
        width={400}
        height={300}
      />
    )

    // Halo lines have stroke="white" + stroke-linecap="round"
    // 5 points = 4 halos
    const haloLines = countPattern(html, /stroke="white"[^>]*stroke-linecap="round"/g)
    expect(haloLines).toBe(4)
  })

  it("applies viridis colors to connecting segments", () => {
    const html = renderComponent(
      <ConnectedScatterplot
        data={trajectoryData}
        xAccessor="x"
        yAccessor="y"
        width={400}
        height={300}
      />
    )

    // Connecting segments have hex stroke + stroke-linecap="round" (unique to pre-renderer)
    const viridisSegments = countPattern(html, /stroke="#[0-9a-f]{6}"[^>]*stroke-linecap="round"/gi)
    expect(viridisSegments).toBe(4) // 4 connecting segments
  })

  it("respects orderAccessor for sorting", () => {
    const unordered = [
      { x: 30, y: 35, t: 3 },
      { x: 10, y: 20, t: 1 },
      { x: 50, y: 50, t: 5 },
      { x: 20, y: 40, t: 2 },
      { x: 40, y: 60, t: 4 },
    ]
    const html = renderComponent(
      <ConnectedScatterplot
        data={unordered}
        xAccessor="x"
        yAccessor="y"
        orderAccessor="t"
        width={400}
        height={300}
      />
    )

    // Should still render circles and round-capped connecting lines
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(5)
    expect(countPattern(html, /stroke-linecap="round"/g)).toBeGreaterThanOrEqual(4)
  })
})

// ── QuadrantChart SSR ─────────────────────────────────────────────────────

describe("Component SSR — QuadrantChart", () => {
  const quadrantData = [
    { x: 10, y: 80 },
    { x: 90, y: 90 },
    { x: 20, y: 20 },
    { x: 80, y: 10 },
  ]

  const quadrants = {
    topRight: { label: "Stars", color: "#4caf50" },
    topLeft: { label: "Question Marks", color: "#ff9800" },
    bottomRight: { label: "Cash Cows", color: "#2196f3" },
    bottomLeft: { label: "Dogs", color: "#f44336" },
  }

  it("renders point circles in SSR", () => {
    const html = renderComponent(
      <QuadrantChart
        data={quadrantData}
        xAccessor="x"
        yAccessor="y"
        quadrants={quadrants}
        width={400}
        height={300}
      />
    )

    expect(html).not.toContain("<canvas")
    expect(html).toContain("<svg")
    expect(countOccurrences(html, "circle")).toBeGreaterThanOrEqual(4)
  })

  it("renders quadrant fill rects via svgPreRenderers", () => {
    const html = renderComponent(
      <QuadrantChart
        data={quadrantData}
        xAccessor="x"
        yAccessor="y"
        quadrants={quadrants}
        xCenter={50}
        yCenter={50}
        width={400}
        height={300}
      />
    )

    // 4 quadrant fill rects (from svgPreRenderers) + any axis/bg rects
    expect(countOccurrences(html, "rect")).toBeGreaterThanOrEqual(4)
  })

  it("renders center lines via svgPreRenderers", () => {
    const html = renderComponent(
      <QuadrantChart
        data={quadrantData}
        xAccessor="x"
        yAccessor="y"
        quadrants={quadrants}
        xCenter={50}
        yCenter={50}
        width={400}
        height={300}
      />
    )

    // 2 center lines (vertical + horizontal) with default stroke="#999"
    const centerLines = countPattern(html, /stroke="#999"/g)
    expect(centerLines).toBe(2)
  })

  it("renders quadrant labels when showQuadrantLabels is true", () => {
    const html = renderComponent(
      <QuadrantChart
        data={quadrantData}
        xAccessor="x"
        yAccessor="y"
        quadrants={quadrants}
        xCenter={50}
        yCenter={50}
        showQuadrantLabels
        width={400}
        height={300}
      />
    )

    expect(html).toContain("Stars")
    expect(html).toContain("Question Marks")
    expect(html).toContain("Cash Cows")
    expect(html).toContain("Dogs")
  })

  it("renders quadrant fill colors", () => {
    const html = renderComponent(
      <QuadrantChart
        data={quadrantData}
        xAccessor="x"
        yAccessor="y"
        quadrants={quadrants}
        xCenter={50}
        yCenter={50}
        width={400}
        height={300}
      />
    )

    expect(html).toContain("#4caf50")
    expect(html).toContain("#ff9800")
    expect(html).toContain("#2196f3")
    expect(html).toContain("#f44336")
  })
})
