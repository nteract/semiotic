import { afterEach, describe, expect, it, vi } from "vitest"

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
]

describe("HOC module registration", () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock("../StreamXYFrame")
  })

  it.each(cases)("$name import registers only its plugins", async ({ load, has, missing }) => {
    vi.resetModules()
    vi.doMock("../StreamXYFrame", () => ({
      __esModule: true,
      default: () => null,
    }))
    const { getXYPlugin: before } = await import("./registry")
    expect(before(has[0])).toBeUndefined()
    await load()
    const { getXYPlugin } = await import("./registry")
    for (const chartType of has) {
      expect(getXYPlugin(chartType), `${chartType} should be registered`).toBeTruthy()
    }
    for (const chartType of missing) {
      expect(getXYPlugin(chartType), `${chartType} should stay unregistered`).toBeUndefined()
    }
  })
})
