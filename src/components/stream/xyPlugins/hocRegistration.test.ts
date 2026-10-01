import { afterEach, describe, expect, it, vi } from "vitest"
import * as React from "react"
import { renderToString } from "react-dom/server"

type ChartType =
  | "line"
  | "area"
  | "mixed"
  | "stackedarea"
  | "scatter"
  | "bubble"
  | "heatmap"
  | "waterfall"
  | "candlestick"
  | "bar"
  | "swarm"
  | "custom"

const cases: Array<{
  name: string
  load: () => Promise<unknown>
  has: ChartType[]
  missing: ChartType[]
}> = [
  {
    name: "LineChart",
    load: () => import("../../charts/xy/LineChart"),
    has: ["line", "area", "mixed"],
    missing: ["candlestick", "heatmap", "bar", "custom"],
  },
  {
    name: "AreaChart",
    load: () => import("../../charts/xy/AreaChart"),
    has: ["area"],
    missing: ["line", "candlestick"],
  },
  {
    name: "StackedAreaChart",
    load: () => import("../../charts/xy/StackedAreaChart"),
    has: ["stackedarea"],
    missing: ["line"],
  },
  {
    name: "DifferenceChart",
    load: () => import("../../charts/xy/DifferenceChart"),
    has: ["mixed"],
    missing: ["line"],
  },
  {
    name: "Scatterplot",
    load: () => import("../../charts/xy/Scatterplot"),
    has: ["scatter"],
    missing: ["line", "bubble"],
  },
  {
    name: "BubbleChart",
    load: () => import("../../charts/xy/BubbleChart"),
    has: ["bubble"],
    missing: ["scatter", "line"],
  },
  {
    name: "Heatmap",
    load: () => import("../../charts/xy/Heatmap"),
    has: ["heatmap"],
    missing: ["line"],
  },
  {
    name: "WaterfallChart",
    load: () => import("../../charts/xy/WaterfallChart"),
    has: ["waterfall"],
    missing: ["line"],
  },
  {
    name: "CandlestickChart",
    load: () => import("../../charts/xy/CandlestickChart"),
    has: ["candlestick"],
    missing: ["line"],
  },
  {
    name: "MultiAxisLineChart",
    load: () => import("../../charts/xy/MultiAxisLineChart"),
    has: ["line"],
    missing: ["candlestick", "heatmap"],
  },
  {
    name: "MinimapChart",
    load: () => import("../../charts/xy/MinimapChart"),
    has: ["line", "area", "mixed"],
    missing: ["candlestick"],
  },
  {
    name: "XYCustomChart",
    load: () => import("../../charts/custom/XYCustomChart"),
    has: ["custom"],
    missing: ["line"],
  },
  {
    name: "RealtimeHistogram",
    load: () => import("../../charts/realtime/RealtimeHistogram"),
    has: ["bar"],
    missing: ["line"],
  },
  {
    name: "RealtimeSwarmChart",
    load: () => import("../../charts/realtime/RealtimeSwarmChart"),
    has: ["swarm"],
    missing: ["line"],
  },
  {
    name: "RealtimeLineChart",
    load: () => import("../../charts/realtime/RealtimeLineChart"),
    has: ["line"],
    missing: ["area", "bar"],
  },
  {
    name: "RealtimeWaterfallChart",
    load: () => import("../../charts/realtime/RealtimeWaterfallChart"),
    has: ["waterfall"],
    missing: ["line"],
  },
  {
    name: "RealtimeHeatmap",
    load: () => import("../../charts/realtime/RealtimeHeatmap"),
    has: ["heatmap"],
    missing: ["line"],
  },
  {
    name: "QuadrantChart",
    load: () => import("../../charts/xy/QuadrantChart"),
    has: ["scatter"],
    missing: ["line", "bubble"],
  },
  {
    name: "ConnectedScatterplot",
    load: () => import("../../charts/xy/ConnectedScatterplot"),
    has: ["scatter"],
    missing: ["line", "bubble"],
  },
]

describe("HOC module registration", () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock("../StreamXYFrame")
  })

  // Registration runs when the chart renders, not when its module is
  // imported: a module-scope call would be retained by consumer bundlers for
  // every chart that shares a published chunk with this one.
  it.each(cases)("$name registers only its plugins when it renders", async ({ name, load, has, missing }) => {
    vi.resetModules()
    vi.doMock("../StreamXYFrame", () => ({
      __esModule: true,
      default: () => null,
    }))
    const { getXYPlugin: before } = await import("./registry")
    expect(before(has[0])).toBeUndefined()
    const mod = (await load()) as Record<string, React.ComponentType<Record<string, unknown>>>
    const { getXYPlugin } = await import("./registry")
    for (const chartType of [...has, ...missing]) {
      expect(getXYPlugin(chartType), `${chartType} must not register at import`).toBeUndefined()
    }
    try {
      renderToString(React.createElement(mod[name], { width: 200, height: 120 }))
    } catch {
      // Registration precedes validation; a chart may reject empty props.
    }
    for (const chartType of has) {
      expect(getXYPlugin(chartType), `${chartType} should be registered`).toBeTruthy()
    }
    for (const chartType of missing) {
      expect(getXYPlugin(chartType), `${chartType} should stay unregistered`).toBeUndefined()
    }
  })
})
