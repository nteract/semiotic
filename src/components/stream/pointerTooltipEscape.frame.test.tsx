import "../../test-utils/registerBuiltInXYPlugins"
import * as React from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import StreamGeoFrame from "./StreamGeoFrame"
import type { StreamGeoFrameHandle } from "./geoTypes"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import { setupCanvasMock } from "../../test-utils/canvasMock"

type Scheduler = ReturnType<typeof createFrameScheduler>
const margin = { top: 0, right: 0, bottom: 0, left: 0 }

const card: NetworkCustomLayout = () => ({
  sceneNodes: [
    {
      type: "rect",
      x: 20,
      y: 20,
      w: 100,
      h: 60,
      style: { fill: "transparent" },
      datum: { id: "card" }
    }
  ],
  sceneEdges: [],
  edgeHitTesting: false
})

interface Family {
  name: string
  tooltip: string
  mount: (scheduler: Scheduler) => {
    element: React.ReactElement
    point: () => { x: number; y: number }
  }
}

const geoRef = React.createRef<StreamGeoFrameHandle>()
const families: Family[] = [
  {
    name: "xy",
    tooltip: ".stream-frame-tooltip",
    mount: (scheduler) => ({
      element: (
        <StreamXYFrame
          chartType="scatter"
          data={[{ x: 5, y: 5 }]}
          xAccessor="x"
          yAccessor="y"
          xExtent={[0, 10]}
          yExtent={[0, 10]}
          size={[100, 100]}
          margin={margin}
          showAxes={false}
          enableHover
          animate={false}
          frameScheduler={scheduler.scheduler}
        />
      ),
      point: () => ({ x: 50, y: 50 })
    })
  },
  {
    name: "ordinal",
    tooltip: ".stream-ordinal-tooltip",
    mount: (scheduler) => ({
      element: (
        <StreamOrdinalFrame
          chartType="bar"
          data={[{ category: "a", value: 10 }]}
          oAccessor="category"
          rAccessor="value"
          rExtent={[0, 10]}
          size={[100, 100]}
          margin={margin}
          showAxes={false}
          enableHover
          animate={false}
          frameScheduler={scheduler.scheduler}
        />
      ),
      point: () => ({ x: 50, y: 60 })
    })
  },
  {
    name: "network",
    tooltip: ".stream-network-tooltip",
    mount: (scheduler) => ({
      element: (
        <StreamNetworkFrame
          chartType="force"
          size={[240, 180]}
          margin={margin}
          nodes={[{ id: "card" }]}
          edges={[]}
          customNetworkLayout={card}
          enableHover
          animate={false}
          accessibleTable={false}
          frameScheduler={scheduler.scheduler}
          tooltipContent={(hover) => String(hover.data?.id)}
        />
      ),
      point: () => ({ x: 40, y: 40 })
    })
  },
  {
    name: "geo",
    tooltip: ".stream-frame-tooltip",
    mount: (scheduler) => ({
      element: (
        <StreamGeoFrame
          ref={geoRef}
          projection="mercator"
          xAccessor="lon"
          yAccessor="lat"
          points={[
            { lon: 0, lat: 0 },
            { lon: 20, lat: 10 }
          ]}
          pointStyle={() => ({ r: 8 })}
          enableHover
          animate={false}
          size={[300, 200]}
          margin={margin}
          frameScheduler={scheduler.scheduler}
        />
      ),
      point: () => {
        const [x, y] = geoRef.current!.getProjection()!([0, 0])!
        return { x, y }
      }
    })
  }
]

describe("Escape dismisses pointer tooltips (WCAG 1.4.13)", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    cleanup()
    restoreCanvas()
  })

  it.each(families)("$name hides its tooltip on Escape and shows it on the next move", async ({ tooltip, mount }) => {
    const scheduler = createFrameScheduler(0)
    const { element, point } = mount(scheduler)
    const { container } = render(element)
    await act(async () => scheduler.flush())
    const target = container.querySelector("canvas")!
    const move = async (dx: number) => {
      const { x, y } = point()
      fireEvent.mouseMove(target, { clientX: x + dx, clientY: y })
      fireEvent.pointerMove(target, { clientX: x + dx, clientY: y })
      await act(async () => scheduler.flush())
    }
    await move(0)
    expect(container.querySelector(tooltip)).not.toBeNull()
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" })
    })
    await act(async () => scheduler.flush())
    expect(container.querySelector(tooltip)).toBeNull()
    await move(1)
    expect(container.querySelector(tooltip)).not.toBeNull()
  })

  it("ignores Escape when the pointer is outside every frame", async () => {
    const scheduler = createFrameScheduler(0)
    const { element } = families[0].mount(scheduler)
    const { container } = render(element)
    await act(async () => scheduler.flush())
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" })
    })
    expect(container.querySelector(".stream-frame-tooltip")).toBeNull()
  })
})
