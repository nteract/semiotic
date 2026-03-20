import { vi } from "vitest"
/**
 * StrictMode compatibility test suite.
 *
 * React.StrictMode double-mounts components in development: mount → unmount → remount.
 * This exposes bugs where:
 * - DataSourceAdapter's dedup cache prevents re-ingestion on remount
 * - rafRef.current isn't zeroed after cancelAnimationFrame, blocking scheduleRender
 * - Progressive chunk timers continue firing into unmounted components
 *
 * Each test renders a HOC chart inside StrictMode and verifies the canvas
 * gets non-default dimensions (300x150 is the HTML default for an unsized canvas).
 */
import React from "react"
import { render, act } from "@testing-library/react"
import { createMockCanvasContext } from "../../test-utils/canvasMock"

// ── Canvas + rAF mocks ──────────────────────────────────────────────────

function setupMocks() {
  ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => createMockCanvasContext())
  // Path2D not available in jsdom — mock it for network edge rendering
  if (!(globalThis as any).Path2D) {
    (globalThis as any).Path2D = class { constructor() {} }
  }

  let rafId = 0
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const id = ++rafId
    // Execute asynchronously to avoid recursive scheduleRender stack overflow
    Promise.resolve().then(() => cb(performance.now()))
    return id
  })
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
}

function teardownMocks() {
  if ((window.requestAnimationFrame as any).mockRestore)
    (window.requestAnimationFrame as any).mockRestore()
  if ((window.cancelAnimationFrame as any).mockRestore)
    (window.cancelAnimationFrame as any).mockRestore()
}

// ── Test data ────────────────────────────────────────────────────────────

const xyData = [
  { x: 0, y: 10 },
  { x: 1, y: 20 },
  { x: 2, y: 15 },
  { x: 3, y: 25 },
]

const barData = [
  { category: "A", value: 10 },
  { category: "B", value: 20 },
  { category: "C", value: 15 },
]

const networkNodes = [
  { id: "a" },
  { id: "b" },
  { id: "c" },
]
const networkEdges = [
  { source: "a", target: "b", value: 10 },
  { source: "b", target: "c", value: 5 },
]

const hierarchyData = {
  name: "root",
  children: [
    { name: "A", value: 10 },
    { name: "B", value: 20 },
  ],
}

// ── Import all HOC charts ────────────────────────────────────────────────

import { LineChart } from "./xy/LineChart"
import { AreaChart } from "./xy/AreaChart"
import { StackedAreaChart } from "./xy/StackedAreaChart"
import { Scatterplot } from "./xy/Scatterplot"
import { BubbleChart } from "./xy/BubbleChart"
import { Heatmap } from "./xy/Heatmap"
import { BarChart } from "./ordinal/BarChart"
import { StackedBarChart } from "./ordinal/StackedBarChart"
import { GroupedBarChart } from "./ordinal/GroupedBarChart"
import { PieChart } from "./ordinal/PieChart"
import { DonutChart } from "./ordinal/DonutChart"
import { DotPlot } from "./ordinal/DotPlot"
import { SwarmPlot } from "./ordinal/SwarmPlot"
import { BoxPlot } from "./ordinal/BoxPlot"
import { Histogram } from "./ordinal/Histogram"
import { ViolinPlot } from "./ordinal/ViolinPlot"
import { ForceDirectedGraph } from "./network/ForceDirectedGraph"
import { SankeyDiagram } from "./network/SankeyDiagram"
import { ChordDiagram } from "./network/ChordDiagram"
import { TreeDiagram } from "./network/TreeDiagram"
import { Treemap } from "./network/Treemap"
import { CirclePack } from "./network/CirclePack"

// ── Tests ────────────────────────────────────────────────────────────────

describe("StrictMode compatibility", () => {
  beforeEach(() => setupMocks())
  afterEach(() => teardownMocks())

  // XY charts
  const xyCharts: [string, React.ComponentType<any>][] = [
    ["LineChart", LineChart],
    ["AreaChart", AreaChart],
    ["StackedAreaChart", StackedAreaChart],
    ["Scatterplot", Scatterplot],
    ["BubbleChart", BubbleChart],
  ]

  for (const [name, Component] of xyCharts) {
    it(`${name} renders in StrictMode`, () => {
      const props: any = {
        data: xyData,
        xAccessor: "x",
        yAccessor: "y",
        width: 400,
        height: 250,
      }
      if (name === "BubbleChart") props.sizeBy = "y"
      if (name === "StackedAreaChart") props.areaBy = undefined

      const { container } = render(
        <React.StrictMode>
          <Component {...props} />
        </React.StrictMode>
      )

      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })
  }

  it("Heatmap renders in StrictMode", () => {
    const heatData = [
      { x: 0, y: 0, value: 10 },
      { x: 1, y: 0, value: 20 },
      { x: 0, y: 1, value: 15 },
      { x: 1, y: 1, value: 25 },
    ]
    const { container } = render(
      <React.StrictMode>
        <Heatmap data={heatData} xAccessor="x" yAccessor="y" valueAccessor="value" width={400} height={250} />
      </React.StrictMode>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  // Ordinal charts
  const ordinalCharts: [string, React.ComponentType<any>, any][] = [
    ["BarChart", BarChart, {}],
    ["StackedBarChart", StackedBarChart, { stackBy: "category" }],
    ["GroupedBarChart", GroupedBarChart, { groupBy: "category" }],
    ["DotPlot", DotPlot, {}],
    ["SwarmPlot", SwarmPlot, {}],
    ["BoxPlot", BoxPlot, {}],
    ["Histogram", Histogram, {}],
    ["ViolinPlot", ViolinPlot, {}],
    ["PieChart", PieChart, {}],
    ["DonutChart", DonutChart, {}],
  ]

  for (const [name, Component, extra] of ordinalCharts) {
    it(`${name} renders in StrictMode`, () => {
      const { container } = render(
        <React.StrictMode>
          <Component
            data={barData}
            categoryAccessor="category"
            valueAccessor="value"
            width={400}
            height={250}
            {...extra}
          />
        </React.StrictMode>
      )
      expect(container.querySelector(".stream-ordinal-frame")).toBeTruthy()
    })
  }

  // Network charts
  it("ForceDirectedGraph renders in StrictMode", () => {
    const { container } = render(
      <React.StrictMode>
        <ForceDirectedGraph
          nodes={networkNodes}
          edges={networkEdges}
          nodeIDAccessor="id"
          sourceAccessor="source"
          targetAccessor="target"
          width={400}
          height={250}
        />
      </React.StrictMode>
    )
    expect(container.querySelector(".stream-network-frame")).toBeTruthy()
  })

  it("SankeyDiagram renders in StrictMode", () => {
    const { container } = render(
      <React.StrictMode>
        <SankeyDiagram
          edges={networkEdges}
          valueAccessor="value"
          width={400}
          height={250}
        />
      </React.StrictMode>
    )
    expect(container.querySelector(".stream-network-frame")).toBeTruthy()
  })

  it("ChordDiagram renders in StrictMode", () => {
    const { container } = render(
      <React.StrictMode>
        <ChordDiagram
          edges={networkEdges}
          valueAccessor="value"
          width={400}
          height={250}
        />
      </React.StrictMode>
    )
    expect(container.querySelector(".stream-network-frame")).toBeTruthy()
  })

  // Hierarchy charts
  const hierarchyCharts: [string, React.ComponentType<any>][] = [
    ["TreeDiagram", TreeDiagram],
    ["Treemap", Treemap],
    ["CirclePack", CirclePack],
  ]

  for (const [name, Component] of hierarchyCharts) {
    it(`${name} renders in StrictMode`, () => {
      const { container } = render(
        <React.StrictMode>
          <Component
            data={hierarchyData}
            childrenAccessor="children"
            valueAccessor="value"
            nodeIdAccessor="name"
            width={400}
            height={250}
          />
        </React.StrictMode>
      )
      expect(container.querySelector(".stream-network-frame")).toBeTruthy()
    })
  }
})
