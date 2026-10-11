import "../../test-utils/registerBuiltInXYPlugins"
import "./layouts/sankeyLayoutPlugin"
import * as React from "react"
import { act } from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamPhysicsFrame from "./physics/StreamPhysicsFrame"

const common = {
  title: "Measured chart",
  description: "Measured chart description",
  size: [300, 200] as [number, number],
  accessibleTable: false,
  animate: false as const
}
const charts = [
  {
    family: "xy",
    chart: () => (
      <StreamXYFrame {...common} chartType="scatter" data={[{ x: 1, y: 2 }]} />
    )
  },
  {
    family: "ordinal",
    chart: () => (
      <StreamOrdinalFrame
        {...common}
        chartType="bar"
        data={[{ category: "A", value: 2 }]}
      />
    )
  },
  {
    family: "network",
    chart: () => (
      <StreamNetworkFrame
        {...common}
        chartType="sankey"
        edges={[{ source: "A", target: "B", value: 2 }]}
      />
    )
  },
  {
    family: "geo",
    chart: () => (
      <StreamGeoFrame
        {...common}
        projection="mercator"
        points={[{ lon: 0, lat: 0 }]}
      />
    )
  },
  {
    family: "physics",
    chart: () => (
      <StreamPhysicsFrame
        {...common}
        simulationExecution="sync"
        initialSpawns={[
          { id: "A", x: 30, y: 30, shape: { type: "circle", radius: 4 } }
        ]}
        config={{ settleStepLimit: 1 }}
      />
    )
  }
]
let restoreCanvas: () => void
beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
})
afterEach(() => {
  restoreCanvas()
  vi.restoreAllMocks()
})

it.each(charts)(
  "$family has one named image and preserves the root through hydration",
  ({ family, chart }) => {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    host.innerHTML = renderToString(chart())
    const frame = host.querySelector(`.stream-${family}-frame`)!
    expect(frame).toHaveAttribute("role", "group")
    expect(frame.querySelectorAll('[role="img"]')).toHaveLength(1)
    expect(frame.querySelector('[role="img"]')).toHaveAccessibleName(
      "Measured chart description"
    )
    expect(frame.querySelector('[role="img"] [role="img"]')).toBeNull()
    expect(frame.querySelectorAll('svg[role="img"]')).toHaveLength(0)
    expect(
      frame.querySelectorAll('svg[role="presentation"] title')
    ).toHaveLength(0)
    let root: ReturnType<typeof hydrateRoot>
    act(() => {
      root = hydrateRoot(host, chart())
    })
    expect(host.querySelector(`.stream-${family}-frame`)).toBe(frame)
    expect(frame).toHaveAttribute("role", "group")
    expect(frame.querySelectorAll('[role="img"]')).toHaveLength(1)
    expect(frame.querySelector("canvas")).not.toBeNull()
    expect(
      errors.mock.calls.filter((call) =>
        /hydration|did not match/i.test(String(call[0]))
      )
    ).toEqual([])
    act(() => root!.unmount())
    host.remove()
  }
)
