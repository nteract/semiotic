/**
 * HOC rendering integration tests.
 *
 * Tests that HOC charts render without crashing under realistic prop combinations.
 * These are NOT unit tests for individual props — they exercise the full
 * HOC → hook → frame → store → scene → renderer pipeline to catch integration
 * issues that component-level tests miss.
 */

import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"

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

// Use the shared `setupCanvasMock` helper for canvas + Path2D so this file
// no longer reimplements that mock. rAF is left as jsdom's default (not
// stubbed synchronously) because this suite includes force-simulation
// network charts (ForceDirectedGraph, SankeyDiagram) whose tick loop
// re-queues itself on every animation frame — a synchronous-fire stub
// would recurse indefinitely. `waitFor` in the assertions handles the
// async paint window.
let restoreCanvasContext: (() => void) | undefined

beforeEach(() => {
  restoreCanvasContext = setupCanvasMock({ stubRaf: false })
})

afterEach(() => {
  restoreCanvasContext?.()
  restoreCanvasContext = undefined
})

async function expectCanvasSummary(container: HTMLElement, expectedParts: string[]) {
  await waitFor(() => {
    const canvas = container.querySelector("canvas[aria-label]")
    expect(canvas).not.toBeNull() // test-quality-gate: allow-mount-only - precondition for semantic aria-label assertions below.
    const label = canvas?.getAttribute("aria-label") ?? ""
    for (const part of expectedParts) {
      expect(label).toContain(part)
    }
  })
}

// ── XY Charts ──────────────────────────────────────────────────────────

describe("XY HOC rendering integration", () => {
  it("LineChart with all common props", async () => {
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
    await expectCanvasSummary(container, ["line chart", "2 lines"])
    const legendLabels = Array.from(container.querySelectorAll(".legend-item text"))
      .map(node => node.textContent)
    expect(legendLabels).toEqual(expect.arrayContaining(["A", "B"]))
  })

  it("LineChart with annotations", async () => {
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
    await expectCanvasSummary(container, ["line chart", "1 lines"])
    await waitFor(() => {
      const svgText = Array.from(container.querySelectorAll("svg"))
        .map(svg => svg.textContent ?? "")
        .join("\n")
      expect(svgText).toContain("Target")
    })
  })

  it("Scatterplot with colorBy + sizeBy", async () => {
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
    await expectCanvasSummary(container, ["scatter chart", "3 points"])
  })

  it("StackedAreaChart with normalize", async () => {
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
    await expectCanvasSummary(container, ["stackedarea chart", "2 areas"])
  })

  it("Heatmap with colorScheme", async () => {
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
    await expectCanvasSummary(container, ["heatmap chart", "4 cells"])
  })
})

// ── Ordinal Charts ─────────────────────────────────────────────────────

describe("Ordinal HOC rendering integration", () => {
  it("BarChart with color + orientation", async () => {
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
    await expectCanvasSummary(container, ["bar chart", "2 bars"])
  })

  it("StackedBarChart with normalize", async () => {
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
    await expectCanvasSummary(container, ["bar chart", "4 bars"])
  })

  it("GroupedBarChart with legend", async () => {
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
    await expectCanvasSummary(container, ["bar chart", "4 bars"])
    const legendLabels = Array.from(container.querySelectorAll(".legend-item text"))
      .map(node => node.textContent)
    expect(legendLabels).toEqual(expect.arrayContaining(["Americas", "EMEA"]))
  })

  it("PieChart with colorBy", async () => {
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
    await expectCanvasSummary(container, ["pie chart", "3 wedges"])
  })

  it("GaugeChart with thresholds", async () => {
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
    await expectCanvasSummary(container, ["donut chart", "4 wedges"])
    expect(container.textContent).toContain("72")
  })
})

// ── Network Charts ────────────────────────────────────────────────────

describe("Network HOC rendering integration", () => {
  const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }]
  const edges = [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
  ]

  it("ForceDirectedGraph with labels", async () => {
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
    await expectCanvasSummary(container, ["Network chart", "3 nodes", "2 edges"])
  })

  it("SankeyDiagram with value", async () => {
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
    await expectCanvasSummary(container, ["Network chart", "3 nodes", "2 edges"])
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
    expect(container.textContent).toContain("No data available")
    expect(container.querySelector("canvas")).toBeNull()
  })

  it("single data point renders", async () => {
    const { container } = render(
      <LineChart
        data={[{ x: 1, y: 10 }]}
        xAccessor="x"
        yAccessor="y"
        width={400}
        height={300}
      />
    )
    await expectCanvasSummary(container, ["line chart", "1 lines"])
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
    // `renderLoadingState` adjusts bar count to the chart height and caps
    // at 5 — assert the boundary, not an exact count, so a heuristic tweak
    // doesn't break this scenario test without a user-visible change.
    const loadingBars = container.querySelectorAll(".semiotic-loading-bar")
    expect(loadingBars.length).toBeGreaterThan(0)
    expect(loadingBars.length).toBeLessThanOrEqual(5)
    expect(container.querySelector("canvas")).toBeNull()
  })

  it("hoverHighlight does not crash without colorBy", async () => {
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
    await expectCanvasSummary(container, ["line chart", "1 lines"])
  })

  it("responsive width renders semantic chart shell", () => {
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
    const frame = container.querySelector(".stream-ordinal-frame")
    expect(frame).toHaveAttribute("role", "group")
    expect(frame).toHaveAttribute("aria-label", "Ordinal chart")
  })
})
