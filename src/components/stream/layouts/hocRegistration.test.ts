import { afterEach, describe, expect, it, vi } from "vitest"
import * as React from "react"
import { renderToString } from "react-dom/server"
import type { NetworkChartType } from "../networkTypes"

const cases: Array<{
  name: string
  load: () => Promise<unknown>
  has: NetworkChartType[]
  missing: NetworkChartType[]
}> = [
  {
    name: "SankeyDiagram",
    load: () => import("../../charts/network/SankeyDiagram"),
    has: ["sankey"],
    missing: ["force", "chord", "tree"]
  },
  {
    name: "ForceDirectedGraph",
    load: () => import("../../charts/network/ForceDirectedGraph"),
    has: ["force"],
    missing: ["sankey", "chord"]
  },
  {
    name: "ChordDiagram",
    load: () => import("../../charts/network/ChordDiagram"),
    has: ["chord"],
    missing: ["sankey", "force"]
  },
  {
    name: "TreeDiagram",
    load: () => import("../../charts/network/TreeDiagram"),
    has: ["tree", "cluster", "treemap", "circlepack", "partition"],
    missing: ["sankey", "orbit"]
  },
  {
    name: "Treemap",
    load: () => import("../../charts/network/Treemap"),
    has: ["treemap"],
    missing: ["tree", "sankey"]
  },
  {
    name: "CirclePack",
    load: () => import("../../charts/network/CirclePack"),
    has: ["circlepack"],
    missing: ["tree", "sankey"]
  },
  {
    name: "OrbitDiagram",
    load: () => import("../../charts/network/OrbitDiagram"),
    has: ["orbit"],
    missing: ["tree", "force"]
  }
]

describe("network HOC registration", () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock("../StreamNetworkFrame")
  })

  // Import side effects would be retained for every chart that shares a
  // published chunk, so layouts and the perspective engine register on render.
  it.each(cases)("$name registers its layout and perspective engine when it renders", async ({ name, load, has, missing }) => {
    vi.resetModules()
    vi.doMock("../StreamNetworkFrame", () => ({ __esModule: true, default: () => null }))
    const mod = (await load()) as Record<string, React.ComponentType<Record<string, unknown>>>
    const { getLayoutPlugin } = await import("./registry")
    const { getNetworkPerspectiveEngine } = await import("../networkPerspectiveLoader")
    for (const chartType of [...has, ...missing]) {
      expect(getLayoutPlugin(chartType), `${chartType} must not register at import`).toBeUndefined()
    }
    expect(getNetworkPerspectiveEngine()).toBeNull()

    try {
      renderToString(React.createElement(mod[name], { width: 200, height: 120 }))
    } catch {
      // Registration precedes validation; a chart may reject empty props.
    }

    for (const chartType of has) {
      expect(getLayoutPlugin(chartType), `${chartType} should be registered`).toBeTruthy()
    }
    for (const chartType of missing) {
      expect(getLayoutPlugin(chartType), `${chartType} should stay unregistered`).toBeUndefined()
    }
    expect(getNetworkPerspectiveEngine()).not.toBeNull()
  })
})
