import * as React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { TreeDiagram } from "../charts/network/TreeDiagram"
import { LineChart } from "../charts/xy/LineChart"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamXYFrame from "./StreamXYFrame"
import { registerLayoutPlugin, getLayoutPlugin } from "./layouts/registry"
import { hierarchyLayoutPlugin } from "./layouts/hierarchyLayoutPlugin"
import { registerBuiltInNetworkLayouts } from "./layouts/registerBuiltIn"
import { registerXYPlugin, getXYPlugin } from "./xyPlugins/registry"
import { areaXYPlugin } from "./xyPlugins/areaPlugin"
import { registerBuiltInXYPlugins } from "./xyPlugins/registerBuiltIn"

const hierarchy = { name: "Root", children: [{ name: "A", value: 1 }, { name: "B", value: 2 }] }
const data = [{ x: 0, y: 1 }, { x: 1, y: 2 }]

let restoreCanvas: () => void
beforeEach(() => { restoreCanvas = setupCanvasMock({ stubRaf: "noop" }) })
afterEach(() => {
  cleanup()
  restoreCanvas()
  registerBuiltInNetworkLayouts()
  registerBuiltInXYPlugins()
})

describe("implicit chart plugin registration", () => {
  it.each(["tree", "cluster", "treemap", "circlepack", "partition"] as const)(
    "TreeDiagram preserves a custom %s plugin used by a sibling frame",
    (chartType) => {
      const custom = { ...hierarchyLayoutPlugin, buildScene: vi.fn(hierarchyLayoutPlugin.buildScene) }
      registerLayoutPlugin(chartType, custom)
      const chart = (title: string) => <>
        <TreeDiagram data={hierarchy} title={title} />
        <StreamNetworkFrame chartType={chartType} edges={hierarchy} size={[300, 200]} />
      </>
      const view = render(chart("First tree"))
      expect(getLayoutPlugin(chartType)).toBe(custom)
      expect(custom.buildScene).toHaveBeenCalled()
      const scene = custom.buildScene.mock.results.find((result) => result.type === "return")!.value
      expect(scene.sceneNodes.length).toBeGreaterThan(0)
      view.rerender(chart("Updated tree"))
      expect(getLayoutPlugin(chartType)).toBe(custom)
    }
  )

  it("LineChart preserves a custom area plugin used by a sibling frame", () => {
    const custom = { ...areaXYPlugin, buildScene: vi.fn(areaXYPlugin.buildScene) }
    registerXYPlugin(custom)
    const chart = (title: string) => <>
      <LineChart data={data} xAccessor="x" yAccessor="y" title={title} />
      <StreamXYFrame chartType="area" data={data} xAccessor="x" yAccessor="y" size={[300, 200]} />
    </>
    const view = render(chart("First line"))
    expect(getXYPlugin("area")).toBe(custom)
    expect(custom.buildScene).toHaveBeenCalled()
    const scene = custom.buildScene.mock.results.find((result) => result.type === "return")!.value
    expect(scene).not.toEqual([])
    view.rerender(chart("Updated line"))
    expect(getXYPlugin("area")).toBe(custom)
  })
})
