import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it } from "vitest"
import * as rootCharts from "../semiotic"
import * as networkCharts from "../semiotic-network"
import * as geoCharts from "../semiotic-geo"
import * as physicsCharts from "../semiotic-physics"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { resolveChartSize } from "../semiotic-utils-core"

// Check every ordinary high-level chart, including the bespoke setup paths.
// Minimap and ProcessSankey compose multiple views and keep fixed defaults;
// ScatterplotMatrix derives its grid dimensions from fields and cellSize.
const names = [
  "LineChart",
  "AreaChart",
  "StackedAreaChart",
  "DifferenceChart",
  "BumpChart",
  "Scatterplot",
  "BubbleChart",
  "Heatmap",
  "QuadrantChart",
  "MultiAxisLineChart",
  "WaterfallChart",
  "CandlestickChart",
  "ConnectedScatterplot",
  "BarChart",
  "StackedBarChart",
  "GroupedBarChart",
  "DotPlot",
  "SwarmPlot",
  "BoxPlot",
  "ViolinPlot",
  "Histogram",
  "RidgelinePlot",
  "RadarChart",
  "PieChart",
  "DonutChart",
  "GaugeChart",
  "FunnelChart",
  "SwimlaneChart",
  "LikertChart",
  "ForceDirectedGraph",
  "SankeyDiagram",
  "ChordDiagram",
  "TreeDiagram",
  "Treemap",
  "CirclePack",
  "OrbitDiagram",
  "ChoroplethMap",
  "ProportionalSymbolMap",
  "FlowMap",
  "DistanceCartogram",
  "RealtimeLineChart",
  "RealtimeHistogram",
  "TemporalHistogram",
  "RealtimeSwarmChart",
  "RealtimeWaterfallChart",
  "RealtimeHeatmap",
  "GaltonBoardChart",
  "UnitPileChart",
  "CollisionSwarmChart",
  "EventDropChart",
  "PacketFlowChart",
  "ProcessFlowChart",
  "PhysicsCustomChart",
  "GauntletChart",
  "CrucibleChart",
  "XYCustomChart",
  "OrdinalCustomChart",
  "NetworkCustomChart",
  "GeoCustomChart"
] as const
const charts = {
  ...rootCharts,
  ...networkCharts,
  ...geoCharts,
  ...physicsCharts
}

const emptyInputs = {
  negativeProperties: [],
  gates: [],
  phases: [],
  products: [],
  events: [],
  stages: [{ id: "work" }],
  layout: () => ({ bodies: [], nodes: [], edges: [], pieces: [], points: [] }),
  data: [],
  nodes: [],
  edges: [],
  areas: [],
  points: [],
  flows: [],
  binSize: 10,
  center: [0, 0],
  value: NaN,
  series: [{ yAccessor: "a" }, { yAccessor: "b" }],
  levels: ["Low", "High"]
}
const hierarchyNames = ["TreeDiagram", "Treemap", "CirclePack", "OrbitDiagram"]
const validatedNetworkNames = [
  "ForceDirectedGraph",
  "SankeyDiagram",
  "ChordDiagram",
  ...hierarchyNames
]
const graph = {
  nodes: [{ id: "a" }, { id: "b" }],
  edges: [{ source: "a", target: "b", value: 1 }]
}

describe("chart placeholder sizing", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => restoreCanvas())

  for (const name of names.filter(name => name.startsWith("Realtime") || name === "TemporalHistogram")) {
    const Chart = charts[name] as React.ComponentType<Record<string, unknown>>
    for (const mode of ["primary", "context", "sparkline", "mobile"] as const) {
      it(`${name} keeps the explicit size tuple after ${mode} responsive rules`, () => {
        const props = {
          ...emptyInputs,
          mode,
          size: [300, 180] as [number, number],
          width: 700,
          height: 600,
          responsiveRules: [{ when: { maxWidth: 800 }, transform: { width: 200, height: 100 } }]
        }
        const size = resolveChartSize(name, props)
        expect(size).toEqual({ width: 300, height: 180 })
        const { container, getByText, rerender } = render(<Chart {...props} emptyContent={<span>No rows</span>} />)
        expect(getByText("No rows").parentElement).toHaveStyle({ width: `${size.width}px`, height: `${size.height}px` })
        rerender(<Chart {...props} loading loadingContent={<span>Fetching rows</span>} />)
        expect(getByText("Fetching rows").parentElement).toHaveStyle({ width: `${size.width}px`, height: `${size.height}px` })
        rerender(<Chart {...props} data={[{ time: 0, value: 4 }, { time: 10, value: 6 }]} />)
        expect(container.querySelector(".stream-xy-frame")).toHaveStyle({ width: `${size.width}px`, height: `${size.height}px` })
      })
    }
  }

  for (const name of names) {
    const Chart = charts[name] as React.ComponentType<Record<string, unknown>>
    for (const mode of ["primary", "context", "sparkline", "mobile"] as const) {
      it(`${name} resolves ${mode} dimensions before rendering empty and loading content`, () => {
        const { width, height } = resolveChartSize(name, { mode })
        // Omitted mode and explicitly undefined dimensions exercise the
        // consumer builder pattern that originally produced an unsized box.
        const props = {
          ...emptyInputs,
          mode: mode === "primary" ? undefined : mode,
          width: undefined,
          height: undefined
        }
        const { getByText, getByRole, rerender } = render(
          <Chart {...props} emptyContent={<span>No rows</span>} />
        )
        const expectSlot = (message: string) => {
          expect(getByText(message).parentElement).toHaveStyle({
            width: `${width}px`,
            height: `${height}px`,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "center"
          })
        }
        // These network charts deliberately validate empty/invalid graph
        // input before placeholders. Their diagnostic still needs a slot.
        if (validatedNetworkNames.includes(name)) {
          expect(getByRole("alert")).toHaveStyle({
            width: `${width}px`,
            height: `${Math.max(120, height)}px`
          })
        } else {
          expectSlot("No rows")
        }
        const loadingInputs = hierarchyNames.includes(name)
          ? { data: { name: "root", children: [{ name: "a", value: 1 }] } }
          : validatedNetworkNames.includes(name)
            ? graph
            : {}
        rerender(
          <Chart
            {...props}
            {...loadingInputs}
            loading
            loadingContent={<span>Fetching rows</span>}
          />
        )
        expectSlot("Fetching rows")
      })
    }
  }
})
