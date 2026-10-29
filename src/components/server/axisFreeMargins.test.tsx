// @vitest-environment node
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PieChart } from "../charts/ordinal/PieChart"
import { DonutChart } from "../charts/ordinal/DonutChart"
import { ForceDirectedGraph } from "../charts/network/ForceDirectedGraph"
import { ChordDiagram } from "../charts/network/ChordDiagram"
import { CirclePack } from "../charts/network/CirclePack"
import { OrbitDiagram } from "../charts/network/OrbitDiagram"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import { TreeDiagram } from "../charts/network/TreeDiagram"
import { Treemap } from "../charts/network/Treemap"
import { GeoCustomChart } from "../charts/custom/GeoCustomChart"
import { ChoroplethMap } from "../charts/geo/ChoroplethMap"
import { ProportionalSymbolMap } from "../charts/geo/ProportionalSymbolMap"
import { FlowMap } from "../charts/geo/FlowMap"
import { DistanceCartogram } from "../charts/geo/DistanceCartogram"
import StreamOrdinalFrame from "../stream/StreamOrdinalFrame"
import StreamNetworkFrame from "../stream/StreamNetworkFrame"
import type { FrameGraphicsContext } from "../stream/types"
import type { MarginType } from "../types/marginType"
import {
  renderChartWithEvidence,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG
} from "./renderToStaticSVG"

const data = [
  { category: "A", value: 30 },
  { category: "B", value: 70 }
]
const nodes = [
  { id: "A", group: "First" },
  { id: "B", group: "Second" }
]
const edges = [{ source: "A", target: "B", value: 3 }]
const hierarchy = {
  name: "Root",
  children: [
    { name: "A", value: 3 },
    { name: "B", value: 7 }
  ]
}
const points = [
  { id: "A", lon: 0, lat: 0, cost: 0 },
  { id: "B", lon: 5, lat: 5, cost: 10 }
]
const areas = [
  {
    type: "Feature",
    properties: { value: 3 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
          [0, 0]
        ]
      ]
    }
  }
]
const inset = { top: 10, right: 10, bottom: 10, left: 10 }
const centered = { top: 40, right: 40, bottom: 40, left: 40 }
const directional = { top: 20, right: 20, bottom: 20, left: 20 }
const sparkline = { top: 2, right: 0, bottom: 2, left: 0 }

const cases = [
  { name: "PieChart", Chart: PieChart, props: { data }, margin: inset },
  { name: "DonutChart", Chart: DonutChart, props: { data }, margin: inset },
  {
    name: "ForceDirectedGraph",
    Chart: ForceDirectedGraph,
    props: { nodes, edges },
    margin: centered
  },
  {
    name: "ChordDiagram",
    Chart: ChordDiagram,
    props: { nodes, edges },
    margin: centered
  },
  {
    name: "CirclePack",
    Chart: CirclePack,
    props: { data: hierarchy },
    margin: centered
  },
  {
    name: "OrbitDiagram",
    Chart: OrbitDiagram,
    props: { data: hierarchy },
    margin: inset
  },
  {
    name: "SankeyDiagram",
    Chart: SankeyDiagram,
    props: { nodes, edges },
    margin: directional
  },
  {
    name: "TreeDiagram",
    Chart: TreeDiagram,
    props: { data: hierarchy },
    margin: directional
  },
  {
    name: "Treemap",
    Chart: Treemap,
    props: { data: hierarchy },
    margin: inset
  },
  {
    name: "ChoroplethMap",
    Chart: ChoroplethMap,
    props: { areas, valueAccessor: "value" },
    margin: inset
  },
  {
    name: "ProportionalSymbolMap",
    Chart: ProportionalSymbolMap,
    props: { points },
    margin: inset
  },
  {
    name: "FlowMap",
    Chart: FlowMap,
    props: { nodes: points, flows: edges },
    margin: inset
  },
  {
    name: "DistanceCartogram",
    Chart: DistanceCartogram,
    props: { points, center: "A", costAccessor: "cost" },
    margin: inset
  },
  {
    name: "GeoCustomChart",
    Chart: GeoCustomChart,
    props: {
      points: [{ lon: 0, lat: 0 }],
      layout: () => ({ nodes: [] })
    },
    margin: inset
  }
] as const

function hocMargin(Chart: React.ElementType, props: Record<string, unknown>) {
  let measured: MarginType | undefined
  const foregroundGraphics = ({ margin }: FrameGraphicsContext<unknown>) => {
    measured = margin
    return <g data-testid="plot-probe" />
  }
  const svg = renderToStaticMarkup(
    <Chart
      {...props}
      foregroundGraphics={foregroundGraphics}
      frameProps={{ foregroundGraphics }}
    />
  )
  expect(svg).toContain('data-testid="plot-probe"')
  return measured!
}

describe("axis-free chart margins across React and static rendering", () => {
  it.each([
    ["tree", directional],
    ["cluster", directional],
    ["treemap", inset],
    ["partition", inset],
    ["circlepack", centered]
  ] as const)("TreeDiagram uses the %s layout's padding", (layout, margin) => {
    const input = { data: hierarchy, layout, width: 400, height: 400, showLegend: false }
    expect(hocMargin(TreeDiagram, input)).toEqual(margin)
    expect(renderChartWithEvidence("TreeDiagram", input).evidence.margin).toEqual(margin)
  })

  it.each(["sankey", "tree", "cluster", "treemap", "partition"] as const)(
    "direct %s frames reserve no fixed label gutters",
    (chartType) => {
      const input = {
        chartType,
        ...(chartType === "sankey" ? { nodes, edges } : { data: hierarchy }),
        size: [400, 400] as [number, number],
        showLabels: false
      }
      const margin = chartType === "treemap" || chartType === "partition" ? inset : directional
      expect(hocMargin(StreamNetworkFrame, input)).toEqual(margin)
      const svg = renderNetworkToStaticSVG(input)
      expect(svg).toContain(`transform="translate(${margin.left},${margin.top})"`)
    }
  )

  for (const { name, Chart, props, margin } of cases) {
    it.each(["primary", "mobile", "context", "sparkline"] as const)(
      `${name} in %s mode reserves layout padding only`,
      (mode) => {
        const input = {
          ...props,
          mode,
          width: 400,
          height: 400,
          showLegend: false
        }
        const expected =
          mode === "sparkline" ? sparkline : mode === "context" ? inset : margin
        expect(hocMargin(Chart, input)).toEqual(expected)
        const { evidence } = renderChartWithEvidence(name, input)
        expect(evidence.margin).toEqual(expected)
      }
    )

    it(`${name} preserves partial and numeric caller margins`, () => {
      for (const override of [{ left: 23 }, 12]) {
        const input = { ...props, showLegend: false, margin: override }
        const expected =
          typeof override === "number"
            ? { top: 12, right: 12, bottom: 12, left: 12 }
            : { ...margin, left: 23 }
        expect(hocMargin(Chart, input)).toEqual(expected)
        expect(renderChartWithEvidence(name, input).evidence.margin).toEqual(
          expected
        )
      }
    })
  }

  it.each(["PieChart", "DonutChart"] as const)(
    "%s uses the full centered plot and preserves title/legend space",
    (name) => {
      const Chart = name === "PieChart" ? PieChart : DonutChart
      const input = { data, width: 400, height: 400, showLegend: false }
      const { svg, evidence } = renderChartWithEvidence(name, input)
      expect(evidence.margin).toEqual(inset)
      // The centered 380px plot leaves the renderer's 4px radial padding.
      expect(svg).toMatch(/A186,186/)
      for (const legendPosition of [
        "top",
        "bottom",
        "left",
        "right"
      ] as const) {
        const titled = {
          ...input,
          title: "Shares",
          showLegend: true,
          legendPosition
        }
        const actual = hocMargin(Chart, titled)
        expect(actual.top).toBeGreaterThan(10)
        expect(actual[legendPosition]).toBeGreaterThan(10)
        expect(renderChartWithEvidence(name, titled).evidence.margin).toEqual(
          actual
        )
      }
    }
  )

  it("a network bottom legend reserves no phantom axis band", () => {
    const legendNodes = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      group: `Category number ${i}`
    }))
    const input = {
      nodes: legendNodes,
      edges: [{ source: "0", target: "1", value: 1 }],
      colorBy: "group",
      showLegend: true,
      legendPosition: "bottom",
      width: 300,
      height: 400
    }
    const actual = hocMargin(ForceDirectedGraph, input)
    expect(actual.bottom).toBeGreaterThan(80)
    expect(
      renderChartWithEvidence("ForceDirectedGraph", input).evidence.margin
    ).toEqual(actual)
  })

  it.each(["pie", "donut"] as const)(
    "direct %s frames use the same axis-free defaults",
    (chartType) => {
      const props = {
        chartType,
        data,
        projection: "radial" as const,
        oAccessor: "category",
        rAccessor: "value",
        size: [400, 400] as [number, number]
      }
      expect(hocMargin(StreamOrdinalFrame, props)).toEqual(inset)
      const svg = renderOrdinalToStaticSVG(props)
      expect(svg).toContain('transform="translate(200,200)"')
      expect(svg).toMatch(/A186,186/)
    }
  )

  it("responsive mode changes keep their compact inset", () => {
    const input = {
      data,
      width: 200,
      showLegend: false,
      responsiveRules: [
        { when: { maxWidth: 300 }, transform: { mode: "sparkline" } }
      ]
    }
    expect(hocMargin(PieChart, input)).toEqual(sparkline)
    expect(renderChartWithEvidence("PieChart", input).evidence.margin).toEqual(
      sparkline
    )
  })
})
