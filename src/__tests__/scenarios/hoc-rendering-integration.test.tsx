/**
 * HOC rendering integration tests.
 *
 * Tests that HOC charts render without crashing under realistic prop combinations.
 * These are NOT unit tests for individual props — they exercise the full
 * HOC → hook → frame → store → scene → renderer pipeline to catch integration
 * issues that component-level tests miss.
 */

import React from "react"
import { render } from "@testing-library/react"

// XY
import { LineChart } from "../../components/charts/xy/LineChart"
import { BarChart } from "../../components/charts/ordinal/BarChart"
import { Heatmap } from "../../components/charts/xy/Heatmap"
import { Scatterplot } from "../../components/charts/xy/Scatterplot"
import { StackedAreaChart } from "../../components/charts/xy/StackedAreaChart"

// Ordinal
import { PieChart } from "../../components/charts/ordinal/PieChart"
import { StackedBarChart } from "../../components/charts/ordinal/StackedBarChart"
import { GroupedBarChart } from "../../components/charts/ordinal/GroupedBarChart"
import { GaugeChart } from "../../components/charts/ordinal/GaugeChart"

// Network
import { ForceDirectedGraph } from "../../components/charts/network/ForceDirectedGraph"
import { SankeyDiagram } from "../../components/charts/network/SankeyDiagram"

const lineData = [
  { x: 1, y: 10, series: "A" },
  { x: 2, y: 20, series: "A" },
  { x: 3, y: 15, series: "A" },
  { x: 1, y: 5, series: "B" },
  { x: 2, y: 15, series: "B" },
  { x: 3, y: 25, series: "B" },
]

const barData = [
  { category: "Q1", value: 10, region: "Americas" },
  { category: "Q1", value: 8, region: "EMEA" },
  { category: "Q2", value: 15, region: "Americas" },
  { category: "Q2", value: 12, region: "EMEA" },
]

const scatterData = [
  { x: 1, y: 10, size: 5, group: "A" },
  { x: 2, y: 20, size: 10, group: "B" },
  { x: 3, y: 15, size: 8, group: "A" },
]

const heatmapData = [
  { x: 0, y: 0, value: 10 },
  { x: 1, y: 0, value: 20 },
  { x: 0, y: 1, value: 30 },
  { x: 1, y: 1, value: 40 },
]

// ── XY Charts ──────────────────────────────────────────────────────────

describe("XY HOC rendering integration", () => {
  it("LineChart with all common props", () => {
    const { container } = render(
      <LineChart
        data={lineData}
        xAccessor="x"
        yAccessor="y"
        lineBy="series"
        colorBy="series"
        title="Test Line Chart"
        description="An accessible line chart"
        width={400}
        height={300}
        showLegend
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("LineChart with annotations", () => {
    const { container } = render(
      <LineChart
        data={lineData}
        xAccessor="x"
        yAccessor="y"
        annotations={[
          { type: "y-threshold", value: 18, label: "Target" },
        ]}
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("Scatterplot with colorBy + sizeBy", () => {
    const { container } = render(
      <Scatterplot
        data={scatterData}
        xAccessor="x"
        yAccessor="y"
        colorBy="group"
        sizeBy="size"
        sizeRange={[3, 20]}
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("StackedAreaChart with normalize", () => {
    const { container } = render(
      <StackedAreaChart
        data={lineData}
        xAccessor="x"
        yAccessor="y"
        areaBy="series"
        normalize
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("Heatmap with colorScheme", () => {
    const { container } = render(
      <Heatmap
        data={heatmapData}
        xAccessor="x"
        yAccessor="y"
        valueAccessor="value"
        colorScheme="blues"
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })
})

// ── Ordinal Charts ─────────────────────────────────────────────────────

describe("Ordinal HOC rendering integration", () => {
  it("BarChart with color + orientation", () => {
    const { container } = render(
      <BarChart
        data={barData}
        categoryAccessor="category"
        valueAccessor="value"
        colorBy="region"
        orientation="horizontal"
        width={400}
        height={300}
        margin={{ left: 100, top: 20, right: 20, bottom: 30 }}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("StackedBarChart with normalize", () => {
    const { container } = render(
      <StackedBarChart
        data={barData}
        categoryAccessor="category"
        valueAccessor="value"
        stackBy="region"
        normalize
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("GroupedBarChart with legend", () => {
    const { container } = render(
      <GroupedBarChart
        data={barData}
        categoryAccessor="category"
        valueAccessor="value"
        groupBy="region"
        colorBy="region"
        showLegend
        legendPosition="bottom"
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("PieChart with colorBy", () => {
    const { container } = render(
      <PieChart
        data={[
          { category: "A", value: 30 },
          { category: "B", value: 50 },
          { category: "C", value: 20 },
        ]}
        categoryAccessor="category"
        valueAccessor="value"
        colorBy="category"
        width={300}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("GaugeChart with thresholds", () => {
    const { container } = render(
      <GaugeChart
        value={72}
        min={0}
        max={100}
        thresholds={[
          { value: 60, color: "#22c55e" },
          { value: 80, color: "#f59e0b" },
          { value: 100, color: "#ef4444" },
        ]}
        width={300}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })
})

// ── Network Charts ────────────────────────────────────────────────────

describe("Network HOC rendering integration", () => {
  const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }]
  const edges = [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
  ]

  it("ForceDirectedGraph with labels", () => {
    const { container } = render(
      <ForceDirectedGraph
        nodes={nodes}
        edges={edges}
        nodeIDAccessor="id"
        sourceAccessor="source"
        targetAccessor="target"
        showLabels
        width={400}
        height={400}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("SankeyDiagram with value", () => {
    const { container } = render(
      <SankeyDiagram
        edges={[
          { source: "A", target: "B", value: 50 },
          { source: "B", target: "C", value: 30 },
        ]}
        sourceAccessor="source"
        targetAccessor="target"
        valueAccessor="value"
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })
})

// ── Edge cases ─────────────────────────────────────────────────────────

describe("HOC edge cases", () => {
  it("empty data renders without crash", () => {
    const { container } = render(
      <BarChart
        data={[]}
        categoryAccessor="category"
        valueAccessor="value"
        width={400}
        height={300}
      />
    )
    // Should render something (empty state or placeholder)
    expect(container.firstChild).not.toBeNull()
  })

  it("single data point renders", () => {
    const { container } = render(
      <LineChart
        data={[{ x: 1, y: 10 }]}
        xAccessor="x"
        yAccessor="y"
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("loading state renders skeleton", () => {
    const { container } = render(
      <BarChart
        data={barData}
        categoryAccessor="category"
        valueAccessor="value"
        loading
        width={400}
        height={300}
      />
    )
    // Loading skeleton should render, not canvas
    expect(container.firstChild).not.toBeNull()
  })

  it("hoverHighlight does not crash without colorBy", () => {
    const { container } = render(
      <LineChart
        data={lineData}
        xAccessor="x"
        yAccessor="y"
        hoverHighlight
        width={400}
        height={300}
      />
    )
    expect(container.querySelector("canvas")).toBeInTheDocument()
  })

  it("responsive width renders", () => {
    const { container } = render(
      <div style={{ width: 500 }}>
        <BarChart
          data={barData}
          categoryAccessor="category"
          valueAccessor="value"
          responsiveWidth
          height={300}
        />
      </div>
    )
    expect(container.firstChild).not.toBeNull()
  })
})
