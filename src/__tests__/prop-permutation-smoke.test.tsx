/**
 * Prop Permutation Smoke Tests
 *
 * Renders every HOC with adversarial combinations of optional props.
 * These tests do NOT check visual correctness — they only verify that
 * the component doesn't throw during render.
 *
 * This catches the class of bugs we've hit repeatedly:
 * - useStreamingLegend crashing when showLegend=undefined + push mode
 * - Normalized stacked bars with domain mismatch
 * - FlowMap crashing on undefined flow entries
 * - Grouped bar coloring with various colorBy/groupBy combos
 */
import { vi, describe, it, expect, beforeEach } from "vitest"
import React from "react"
import { render, cleanup } from "@testing-library/react"
import { TooltipProvider } from "../components/store/TooltipStore"

// ── Mock all four Stream Frames ─────────────────────────────────────────

let lastXYProps: any = null
vi.mock("../components/stream/StreamXYFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastXYProps = props
      return <div className="stream-xy-frame"><svg /></div>
    })
  }
})

let lastOrdinalProps: any = null
vi.mock("../components/stream/StreamOrdinalFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastOrdinalProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

let lastNetworkProps: any = null
vi.mock("../components/stream/StreamNetworkFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastNetworkProps = props
      return <div className="stream-network-frame"><svg /></div>
    })
  }
})

let lastGeoProps: any = null
vi.mock("../components/stream/StreamGeoFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastGeoProps = props
      return <div className="stream-geo-frame"><svg /></div>
    })
  }
})

vi.mock("../components/geo/useReferenceAreas", () => ({
  useReferenceAreas: (areas: any) => areas
}))

// ── Imports (after mocks) ───────────────────────────────────────────────

import { LineChart } from "../components/charts/xy/LineChart"
import { AreaChart } from "../components/charts/xy/AreaChart"
import { StackedAreaChart } from "../components/charts/xy/StackedAreaChart"
import { Scatterplot } from "../components/charts/xy/Scatterplot"
import { BubbleChart } from "../components/charts/xy/BubbleChart"
import { ConnectedScatterplot } from "../components/charts/xy/ConnectedScatterplot"
import { Heatmap } from "../components/charts/xy/Heatmap"
import { QuadrantChart } from "../components/charts/xy/QuadrantChart"
import { BarChart } from "../components/charts/ordinal/BarChart"
import { StackedBarChart } from "../components/charts/ordinal/StackedBarChart"
import { GroupedBarChart } from "../components/charts/ordinal/GroupedBarChart"
import { PieChart } from "../components/charts/ordinal/PieChart"
import { DonutChart } from "../components/charts/ordinal/DonutChart"
import { SwarmPlot } from "../components/charts/ordinal/SwarmPlot"
import { BoxPlot } from "../components/charts/ordinal/BoxPlot"
import { Histogram } from "../components/charts/ordinal/Histogram"
import { ViolinPlot } from "../components/charts/ordinal/ViolinPlot"
import { DotPlot } from "../components/charts/ordinal/DotPlot"
import { RidgelinePlot } from "../components/charts/ordinal/RidgelinePlot"
import { ForceDirectedGraph } from "../components/charts/network/ForceDirectedGraph"
import { SankeyDiagram } from "../components/charts/network/SankeyDiagram"
import { ChordDiagram } from "../components/charts/network/ChordDiagram"
import { TreeDiagram } from "../components/charts/network/TreeDiagram"
import { Treemap } from "../components/charts/network/Treemap"
import { CirclePack } from "../components/charts/network/CirclePack"
import { OrbitDiagram } from "../components/charts/network/OrbitDiagram"
import { ChoroplethMap } from "../components/charts/geo/ChoroplethMap"
import { ProportionalSymbolMap } from "../components/charts/geo/ProportionalSymbolMap"
import { FlowMap } from "../components/charts/geo/FlowMap"
import { DistanceCartogram } from "../components/charts/geo/DistanceCartogram"

// ── Shared test data ────────────────────────────────────────────────────

const xyData = [
  { x: 1, y: 10, category: "A", size: 5 },
  { x: 2, y: 20, category: "B", size: 10 },
  { x: 3, y: 15, category: "A", size: 8 },
  { x: 4, y: 25, category: "B", size: 3 },
]

const xyDataSinglePoint = [{ x: 1, y: 10, category: "A", size: 5 }]

const xyDataWithNulls = [
  { x: 1, y: 10, category: "A" },
  { x: 2, y: null, category: "B" },
  { x: 3, y: 15, category: null },
  { x: null, y: 25, category: "A" },
]

const lineData = [
  { coordinates: [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 15 }] },
  { coordinates: [{ x: 1, y: 5 }, { x: 2, y: 25 }, { x: 3, y: 12 }] },
]

const ordinalData = [
  { category: "A", value: 10, group: "alpha" },
  { category: "B", value: 20, group: "beta" },
  { category: "C", value: 15, group: "alpha" },
  { category: "A", value: 8, group: "beta" },
  { category: "B", value: 12, group: "alpha" },
  { category: "C", value: 25, group: "beta" },
]

const ordinalSingleItem = [{ category: "A", value: 10, group: "alpha" }]

const heatmapData = [
  { x: "Mon", y: "Morning", value: 5 },
  { x: "Tue", y: "Morning", value: 8 },
  { x: "Mon", y: "Afternoon", value: 12 },
  { x: "Tue", y: "Afternoon", value: 3 },
]

const networkNodes = [
  { id: "A", group: "eng", weight: 10 },
  { id: "B", group: "design", weight: 5 },
  { id: "C", group: "eng", weight: 8 },
]

const networkEdges = [
  { source: "A", target: "B", value: 10 },
  { source: "B", target: "C", value: 5 },
  { source: "A", target: "C", value: 3 },
]

const hierarchyData = {
  name: "root",
  children: [
    { name: "A", value: 10 },
    { name: "B", children: [
      { name: "B1", value: 5 },
      { name: "B2", value: 8 },
    ]},
    { name: "C", value: 15 },
  ]
}

const geoFeatures = [
  { type: "Feature" as const, properties: { name: "A", value: 100 }, geometry: { type: "Polygon" as const, coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] } },
  { type: "Feature" as const, properties: { name: "B", value: 200 }, geometry: { type: "Polygon" as const, coordinates: [[[2,0],[3,0],[3,1],[2,1],[2,0]]] } },
]

const geoPoints = [
  { id: "P1", lon: -73.7, lat: 40.6, value: 100, category: "big" },
  { id: "P2", lon: -0.4, lat: 51.5, value: 50, category: "small" },
  { id: "P3", lon: 139.7, lat: 35.8, value: 200, category: "big" },
]

const geoFlows = [
  { source: "P1", target: "P2", value: 18000 },
  { source: "P2", target: "P3", value: 14000 },
]

// ── Wrapper ─────────────────────────────────────────────────────────────

const W = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

// ── Helper: render every prop combination without throwing ───────────────

type PropSet = Record<string, any>

/**
 * Renders a single HOC with all individual variations and all non-conflicting
 * pairwise combinations. Everything runs inside one `it()` per chart to keep
 * the test count reasonable while still covering the same surface area.
 */
function smokeTest(
  name: string,
  Component: React.ComponentType<any>,
  baseProps: PropSet,
  variations: PropSet[]
) {
  it(`${name} — survives all prop permutations`, () => {
    // Base case
    render(<W><Component {...baseProps} /></W>)
    cleanup()

    // Each variation applied individually
    for (const variation of variations) {
      render(<W><Component {...baseProps} {...variation} /></W>)
      cleanup()
    }

    // Pairwise combinations (catches interaction bugs)
    for (let i = 0; i < variations.length; i++) {
      for (let j = i + 1; j < variations.length; j++) {
        const keysI = Object.keys(variations[i])
        const keysJ = Object.keys(variations[j])
        if (keysI.some(k => keysJ.includes(k))) continue

        render(<W><Component {...baseProps} {...variations[i]} {...variations[j]} /></W>)
        cleanup()
      }
    }
  })
}

// ── Common variations ───────────────────────────────────────────────────

const tooltipVariations: PropSet[] = [
  { tooltip: true },
  { tooltip: false },
  { tooltip: undefined },
  { tooltip: (d: any) => <span>{JSON.stringify(d)}</span> },
]

const legendVariations: PropSet[] = [
  { showLegend: true },
  { showLegend: false },
  { showLegend: undefined },
]

const legendPositionVariations: PropSet[] = [
  { legendPosition: "right" },
  { legendPosition: "left" },
  { legendPosition: "top" },
  { legendPosition: "bottom" },
]

const sizeVariations: PropSet[] = [
  { width: 100, height: 100 },
  { width: 1200, height: 800 },
  { width: 600, height: 50 },
]

const marginVariations: PropSet[] = [
  { margin: { top: 0, right: 0, bottom: 0, left: 0 } },
  { margin: { top: 100, right: 100, bottom: 100, left: 100 } },
]

// ── All HOC permutation tests ───────────────────────────────────────────

describe("prop permutation smoke tests", () => {

// ── XY Charts ───────────────────────────────────────────────────────────

smokeTest("LineChart", LineChart, { data: xyData, xAccessor: "x", yAccessor: "y" }, [
  ...tooltipVariations,
  ...legendVariations,
  ...legendPositionVariations,
  ...sizeVariations,
  ...marginVariations,
  { data: [] },
  { data: xyDataSinglePoint },
  { data: xyDataWithNulls },
  { colorBy: "category" },
  { lineBy: "category" },
  { showPoints: true },
  { showPoints: false },
  { fillArea: true },
  { curve: "monotoneX" },
  { curve: "step" },
  { curve: "linear" },
  { showGrid: true },
  { xScaleType: "log" },
  { yScaleType: "log" },
  { gapStrategy: "break" },
  { gapStrategy: "zero" },
  { gapStrategy: "interpolate" },
  { directLabel: true },
  { lineWidth: 0 },
  { lineWidth: 10 },
  // Push API mode: omit data
  ...(() => {
    const noData = { data: undefined }
    return [noData]
  })(),
])

smokeTest("AreaChart", AreaChart, { data: xyData, xAccessor: "x", yAccessor: "y" }, [
  ...tooltipVariations,
  ...legendVariations,
  ...sizeVariations,
  { data: [] },
  { data: xyDataSinglePoint },
  { colorBy: "category" },
  { areaOpacity: 0 },
  { areaOpacity: 1 },
  { gradientFill: true },
  { gradientFill: false },
  { showLine: true },
  { showLine: false },
  { data: undefined },
])

smokeTest("StackedAreaChart", StackedAreaChart, {
  data: ordinalData, xAccessor: "category", yAccessor: "value", areaBy: "group"
}, [
  ...tooltipVariations,
  ...legendVariations,
  ...sizeVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { colorBy: "group" },
  { normalize: true },
  { normalize: false },
  { showGrid: true },
  { data: undefined },
])

smokeTest("Scatterplot", Scatterplot, { data: xyData, xAccessor: "x", yAccessor: "y" }, [
  ...tooltipVariations,
  ...legendVariations,
  ...sizeVariations,
  { data: [] },
  { data: xyDataSinglePoint },
  { data: xyDataWithNulls },
  { colorBy: "category" },
  { sizeBy: "size" },
  { pointRadius: 1 },
  { pointRadius: 50 },
  { pointOpacity: 0 },
  { pointOpacity: 1 },
  { xScaleType: "log" },
  { yScaleType: "log" },
  { data: undefined },
])

smokeTest("BubbleChart", BubbleChart, {
  data: xyData, xAccessor: "x", yAccessor: "y", sizeBy: "size"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: xyDataSinglePoint },
  { colorBy: "category" },
  { sizeRange: [1, 100] },
  { sizeRange: [5, 5] },
  { bubbleOpacity: 0 },
  { bubbleOpacity: 1 },
  { data: undefined },
])

smokeTest("ConnectedScatterplot", ConnectedScatterplot, {
  data: xyData, xAccessor: "x", yAccessor: "y"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: xyDataSinglePoint },
  { pointRadius: 1 },
  { pointRadius: 20 },
  { data: undefined },
])

smokeTest("Heatmap", Heatmap, {
  data: heatmapData, xAccessor: "x", yAccessor: "y", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { showValues: true },
  { showValues: false },
  { colorScheme: "blues" },
  { colorScheme: "reds" },
  { colorScheme: "viridis" },
  { data: undefined },
])

smokeTest("QuadrantChart", QuadrantChart, {
  data: xyData, xAccessor: "x", yAccessor: "y",
  quadrants: {
    topRight: { label: "TR", color: "#4caf50" },
    topLeft: { label: "TL", color: "#2196f3" },
    bottomRight: { label: "BR", color: "#ff9800" },
    bottomLeft: { label: "BL", color: "#f44336" },
  }
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: xyDataSinglePoint },
  { xCenter: 2.5, yCenter: 17 },
  { xCenter: undefined, yCenter: undefined },
  { colorBy: "category" },
  { sizeBy: "size" },
  { showQuadrantLabels: true },
  { showQuadrantLabels: false },
  { data: undefined },
])

// ── Ordinal Charts ──────────────────────────────────────────────────────

smokeTest("BarChart", BarChart, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  ...legendPositionVariations,
  ...sizeVariations,
  ...marginVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { colorBy: "group" },
  { orientation: "horizontal" },
  { orientation: "vertical" },
  { sort: "ascending" },
  { sort: "descending" },
  { barPadding: 0 },
  { barPadding: 100 },
  { showGrid: true },
  { data: undefined },
])

smokeTest("StackedBarChart", StackedBarChart, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value", stackBy: "group"
}, [
  ...tooltipVariations,
  ...legendVariations,
  ...legendPositionVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { colorBy: "group" },
  { normalize: true },
  { normalize: false },
  { orientation: "horizontal" },
  { orientation: "vertical" },
  { barPadding: 0 },
  { barPadding: 100 },
  { data: undefined },
])

smokeTest("GroupedBarChart", GroupedBarChart, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value", groupBy: "group"
}, [
  ...tooltipVariations,
  ...legendVariations,
  ...legendPositionVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { colorBy: "group" },
  { colorBy: "category" },
  { orientation: "horizontal" },
  { orientation: "vertical" },
  { barPadding: 0 },
  { barPadding: 100 },
  { data: undefined },
])

smokeTest("PieChart", PieChart, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { colorBy: "group" },
  { data: undefined },
])

smokeTest("DonutChart", DonutChart, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { colorBy: "group" },
  { innerRadius: 0 },
  { innerRadius: 100 },
  { centerContent: <div>50%</div> },
  { centerContent: undefined },
  { data: undefined },
])

smokeTest("SwarmPlot", SwarmPlot, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { colorBy: "group" },
  { sizeBy: "value" },
  { pointRadius: 1 },
  { pointRadius: 20 },
  { pointOpacity: 0 },
  { pointOpacity: 1 },
  { data: undefined },
])

smokeTest("BoxPlot", BoxPlot, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { showOutliers: true },
  { showOutliers: false },
  { data: undefined },
])

smokeTest("Histogram", Histogram, {
  data: ordinalData, valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { bins: 5 },
  { bins: 50 },
  { relative: true },
  { relative: false },
  { colorBy: "group" },
  { data: undefined },
])

smokeTest("ViolinPlot", ViolinPlot, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { bins: 5 },
  { bins: 50 },
  { showIQR: true },
  { showIQR: false },
  { data: undefined },
])

smokeTest("DotPlot", DotPlot, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { sort: true },
  { sort: false },
  { showGrid: true },
  { showGrid: false },
  { data: undefined },
])

smokeTest("RidgelinePlot", RidgelinePlot, {
  data: ordinalData, categoryAccessor: "category", valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { data: [] },
  { data: ordinalSingleItem },
  { data: undefined },
])

// ── Network Charts ──────────────────────────────────────────────────────

smokeTest("ForceDirectedGraph", ForceDirectedGraph, {
  nodes: networkNodes, edges: networkEdges
}, [
  ...tooltipVariations,
  ...legendVariations,
  ...sizeVariations,
  { nodes: [], edges: [] },
  { nodes: networkNodes, edges: [] },
  { nodes: [{ id: "solo" }], edges: [] },
  { colorBy: "group" },
  { nodeSize: "weight" },
  { nodeSize: 10 },
  { nodeSize: (d: any) => d.weight || 5 },
  { showLabels: true },
  { showLabels: false },
  { iterations: 1 },
  { iterations: 500 },
  { forceStrength: 0 },
  { forceStrength: 1 },
  { edgeWidth: 1 },
  { edgeWidth: 10 },
  { edgeOpacity: 0 },
  { edgeOpacity: 1 },
  // Push API mode
  { nodes: undefined, edges: undefined },
])

smokeTest("SankeyDiagram", SankeyDiagram, {
  nodes: networkNodes, edges: networkEdges, valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { nodes: [], edges: [] },
  { nodes: networkNodes, edges: [] },
  { orientation: "horizontal" },
  { orientation: "vertical" },
  { showLabels: true },
  { showLabels: false },
  { edgeOpacity: 0 },
  { edgeOpacity: 1 },
  { edges: undefined },
])

smokeTest("ChordDiagram", ChordDiagram, {
  nodes: networkNodes, edges: networkEdges, valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { nodes: [], edges: [] },
  { showLabels: true },
  { showLabels: false },
  { edgeOpacity: 0 },
  { edgeOpacity: 1 },
  { edges: undefined },
])

smokeTest("TreeDiagram", TreeDiagram, {
  data: hierarchyData
}, [
  ...tooltipVariations,
  ...legendVariations,
  { layout: "tree" },
  { layout: "cluster" },
  { layout: "radial" },
  { orientation: "horizontal" },
  { orientation: "vertical" },
  { colorBy: "name" },
  { colorByDepth: true },
])

smokeTest("Treemap", Treemap, {
  data: hierarchyData, valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { showLabels: true },
  { showLabels: false },
  { colorBy: "name" },
  { colorByDepth: true },
])

smokeTest("CirclePack", CirclePack, {
  data: hierarchyData, valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { colorBy: "name" },
  { colorByDepth: true },
  { circleOpacity: 0 },
  { circleOpacity: 1 },
])

smokeTest("OrbitDiagram", OrbitDiagram, {
  data: hierarchyData
}, [
  ...tooltipVariations,
  ...legendVariations,
  { orbitMode: "flat" },
  { orbitMode: "solar" },
  { orbitMode: "atomic" },
  { speed: 0 },
  { speed: 1 },
  { animated: true },
  { animated: false },
  { showRings: true },
  { showRings: false },
  { showLabels: true },
  { showLabels: false },
])

// ── Geo Charts ──────────────────────────────────────────────────────────

smokeTest("ChoroplethMap", ChoroplethMap, {
  areas: geoFeatures, valueAccessor: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { areas: [] },
  { areas: geoFeatures.slice(0, 1) },
  { colorScheme: "blues" },
  { colorScheme: "reds" },
  { colorScheme: "viridis" },
  { areaOpacity: 0 },
  { areaOpacity: 1 },
  { projection: "equalEarth" },
  { projection: "mercator" },
  { graticule: true },
  { graticule: false },
  { zoomable: true },
  { zoomable: false },
])

smokeTest("ProportionalSymbolMap", ProportionalSymbolMap, {
  points: geoPoints, xAccessor: "lon", yAccessor: "lat", sizeBy: "value"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { points: [] },
  { points: geoPoints.slice(0, 1) },
  { colorBy: "category" },
  { sizeRange: [1, 50] },
  { sizeRange: [3, 3] },
  { areas: geoFeatures },
  { areas: undefined },
  { projection: "equalEarth" },
  { projection: "mercator" },
  { zoomable: true },
  { zoomable: false },
  { points: undefined },
])

smokeTest("FlowMap", FlowMap, {
  nodes: geoPoints, flows: geoFlows, nodeIdAccessor: "id"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { flows: [] },
  { nodes: [], flows: [] },
  { nodes: geoPoints, flows: geoFlows.slice(0, 1) },
  // Adversarial: undefined entries in flows array (caused the crash we just fixed)
  { flows: [undefined, ...geoFlows] as any },
  { flows: [...geoFlows, null] as any },
  { flows: [...geoFlows, { source: undefined, target: "P2", value: 1 }] as any },
  { flows: [...geoFlows, { source: "P1", target: undefined, value: 1 }] as any },
  { edgeColorBy: "source" },
  { edgeOpacity: 0 },
  { edgeOpacity: 1 },
  { edgeWidthRange: [1, 1] },
  { edgeWidthRange: [1, 20] },
  { lineType: "geo" },
  { lineType: "line" },
  { areas: geoFeatures },
  { areas: undefined },
  { showParticles: true },
  { showParticles: false },
  { zoomable: true },
  { zoomable: false },
])

smokeTest("DistanceCartogram", DistanceCartogram, {
  points: geoPoints, center: "P1", costAccessor: "value", nodeIdAccessor: "id"
}, [
  ...tooltipVariations,
  ...legendVariations,
  { points: [] },
  { points: geoPoints.slice(0, 1) },
  { strength: 0 },
  { strength: 1 },
  { showRings: true },
  { showRings: false },
  { showNorth: true },
  { showNorth: false },
  { zoomable: true },
  { zoomable: false },
  { points: undefined },
])

}) // end describe("prop permutation smoke tests")

// ── Cross-cutting adversarial scenarios ─────────────────────────────────

describe("adversarial edge cases", () => {
  afterEach(() => { cleanup() })

  it("StackedBarChart: normalize + horizontal + showLegend + colorBy", () => {
    expect(() => {
      render(<W>
        <StackedBarChart
          data={ordinalData}
          categoryAccessor="category"
          valueAccessor="value"
          stackBy="group"
          normalize={true}
          orientation="horizontal"
          showLegend={true}
          colorBy="group"
          legendPosition="bottom"
        />
      </W>)
    }).not.toThrow()
  })

  it("GroupedBarChart: horizontal + colorBy=category (not groupBy)", () => {
    expect(() => {
      render(<W>
        <GroupedBarChart
          data={ordinalData}
          categoryAccessor="category"
          valueAccessor="value"
          groupBy="group"
          colorBy="category"
          orientation="horizontal"
        />
      </W>)
    }).not.toThrow()
  })

  it("LineChart: log scale + zero values", () => {
    const dataWithZeros = [
      { x: 0, y: 0 },
      { x: 1, y: 10 },
      { x: 2, y: 0 },
    ]
    expect(() => {
      render(<W>
        <LineChart
          data={dataWithZeros}
          xAccessor="x"
          yAccessor="y"
          xScaleType="log"
          yScaleType="log"
        />
      </W>)
    }).not.toThrow()
  })

  it("Scatterplot: all identical values", () => {
    const sameData = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ]
    expect(() => {
      render(<W>
        <Scatterplot data={sameData} xAccessor="x" yAccessor="y" />
      </W>)
    }).not.toThrow()
  })

  it("BarChart: extreme margin that exceeds chart dimensions", () => {
    expect(() => {
      render(<W>
        <BarChart
          data={ordinalData}
          categoryAccessor="category"
          valueAccessor="value"
          width={200}
          height={200}
          margin={{ top: 100, right: 100, bottom: 100, left: 100 }}
        />
      </W>)
    }).not.toThrow()
  })

  it("ForceDirectedGraph: edges reference nonexistent nodes", () => {
    const badEdges = [
      { source: "X", target: "Y" },
      { source: "A", target: "Z" },
    ]
    expect(() => {
      render(<W>
        <ForceDirectedGraph nodes={networkNodes} edges={badEdges} />
      </W>)
    }).not.toThrow()
  })

  it("FlowMap: flows array with mixed valid and invalid entries", () => {
    const messyFlows = [
      ...geoFlows,
      null,
      undefined,
      {},
      { source: "P1" },
      { target: "P2" },
      { source: null, target: null, value: 0 },
      { source: "P1", target: "P2", value: NaN },
      { source: "P1", target: "P2", value: Infinity },
    ] as any[]
    expect(() => {
      render(<W>
        <FlowMap nodes={geoPoints} flows={messyFlows} nodeIdAccessor="id" />
      </W>)
    }).not.toThrow()
  })

  it("Heatmap: empty string accessor values", () => {
    const emptyKeyData = [
      { x: "", y: "", value: 5 },
      { x: "A", y: "", value: 10 },
      { x: "", y: "B", value: 15 },
    ]
    expect(() => {
      render(<W>
        <Heatmap data={emptyKeyData} xAccessor="x" yAccessor="y" valueAccessor="value" />
      </W>)
    }).not.toThrow()
  })

  it("DonutChart: all zero values", () => {
    const zeroData = [
      { category: "A", value: 0 },
      { category: "B", value: 0 },
      { category: "C", value: 0 },
    ]
    expect(() => {
      render(<W>
        <DonutChart data={zeroData} categoryAccessor="category" valueAccessor="value" />
      </W>)
    }).not.toThrow()
  })

  it("DonutChart: negative values", () => {
    const negData = [
      { category: "A", value: -10 },
      { category: "B", value: 20 },
      { category: "C", value: -5 },
    ]
    expect(() => {
      render(<W>
        <DonutChart data={negData} categoryAccessor="category" valueAccessor="value" />
      </W>)
    }).not.toThrow()
  })

  it("Histogram: all same value", () => {
    const sameValues = Array.from({ length: 20 }, () => ({ value: 42 }))
    expect(() => {
      render(<W>
        <Histogram data={sameValues} valueAccessor="value" bins={10} />
      </W>)
    }).not.toThrow()
  })

  it("SankeyDiagram: self-loop edge", () => {
    const selfLoop = [
      ...networkEdges,
      { source: "A", target: "A", value: 5 },
    ]
    expect(() => {
      render(<W>
        <SankeyDiagram nodes={networkNodes} edges={selfLoop} valueAccessor="value" />
      </W>)
    }).not.toThrow()
  })

  it("QuadrantChart: center lines at data extremes", () => {
    expect(() => {
      render(<W>
        <QuadrantChart
          data={xyData}
          xAccessor="x"
          yAccessor="y"
          quadrants={{
            topRight: { label: "TR", color: "#4caf50" },
            topLeft: { label: "TL", color: "#2196f3" },
            bottomRight: { label: "BR", color: "#ff9800" },
            bottomLeft: { label: "BL", color: "#f44336" },
          }}
          xCenter={0}
          yCenter={1000}
        />
      </W>)
    }).not.toThrow()
  })

  it("BarChart: push mode (no data) + showLegend=undefined + colorBy", () => {
    expect(() => {
      render(<W><BarChart categoryAccessor="category" valueAccessor="value" colorBy="group" showLegend={undefined} /></W>)
    }).not.toThrow()
  })

  it("StackedBarChart: push mode (no data) + showLegend=undefined + colorBy", () => {
    expect(() => {
      render(<W><StackedBarChart categoryAccessor="category" valueAccessor="value" stackBy="group" colorBy="group" showLegend={undefined} /></W>)
    }).not.toThrow()
  })

  it("GroupedBarChart: push mode (no data) + showLegend=undefined + colorBy", () => {
    expect(() => {
      render(<W><GroupedBarChart categoryAccessor="category" valueAccessor="value" groupBy="group" colorBy="group" showLegend={undefined} /></W>)
    }).not.toThrow()
  })

  it("PieChart: push mode (no data) + showLegend=undefined + colorBy", () => {
    expect(() => {
      render(<W><PieChart categoryAccessor="category" valueAccessor="value" colorBy="group" showLegend={undefined} /></W>)
    }).not.toThrow()
  })

  it("DonutChart: push mode (no data) + showLegend=undefined + colorBy", () => {
    expect(() => {
      render(<W><DonutChart categoryAccessor="category" valueAccessor="value" colorBy="group" showLegend={undefined} /></W>)
    }).not.toThrow()
  })

  it("ChoroplethMap: features with missing properties", () => {
    const badFeatures = [
      { type: "Feature", properties: null, geometry: { type: "Polygon", coordinates: [[[0,0],[1,0],[1,1],[0,0]]] } },
      { type: "Feature", geometry: { type: "Polygon", coordinates: [[[2,0],[3,0],[3,1],[2,0]]] } },
    ] as any[]
    expect(() => {
      render(<W>
        <ChoroplethMap areas={badFeatures} valueAccessor="value" />
      </W>)
    }).not.toThrow()
  })
})
