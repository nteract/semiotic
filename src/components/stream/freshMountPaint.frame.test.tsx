import "../../test-utils/registerBuiltInXYPlugins"
import * as React from "react"
import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import {
  setupCanvasMock,
  type CanvasContextMock,
} from "../../test-utils/canvasMock"

type Scheduler = ReturnType<typeof createFrameScheduler>

const probeRule = (annotation: Record<string, unknown>) =>
  annotation.type === "probe" ? <g className="fresh-mount-annotation" key="probe" /> : null

const frames: ReadonlyArray<{
  name: string
  renderFrame: (scheduler: Scheduler) => React.ReactElement
}> = [
  {
    name: "xy",
    renderFrame: (scheduler) => (
      <StreamXYFrame
        chartType="scatter"
        data={[{ x: 1, y: 2 }, { x: 3, y: 4 }]}
        xAccessor="x"
        yAccessor="y"
        size={[240, 160]}
        showAxes
        annotations={[{ type: "probe" }]}
        svgAnnotationRules={probeRule}
        frameScheduler={scheduler.scheduler}
      />
    ),
  },
  {
    name: "ordinal",
    renderFrame: (scheduler) => (
      <StreamOrdinalFrame
        chartType="bar"
        data={[{ category: "a", value: 2 }, { category: "b", value: 5 }]}
        oAccessor="category"
        rAccessor="value"
        size={[240, 160]}
        showAxes
        annotations={[{ type: "probe" }]}
        svgAnnotationRules={probeRule}
        frameScheduler={scheduler.scheduler}
      />
    ),
  },
  {
    name: "geo",
    renderFrame: (scheduler) => (
      <StreamGeoFrame
        projection="mercator"
        points={[{ id: "point", lon: -122.4, lat: 37.8 }]}
        xAccessor="lon"
        yAccessor="lat"
        size={[240, 160]}
        annotations={[{ type: "probe" }]}
        svgAnnotationRules={probeRule}
        frameScheduler={scheduler.scheduler}
      />
    ),
  },
  {
    name: "network",
    renderFrame: (scheduler) => (
      <StreamNetworkFrame
        animate={false}
        chartType="sankey"
        nodes={[{ id: "source" }, { id: "target" }]}
        edges={[{ source: "source", target: "target", value: 1 }]}
        size={[240, 160]}
        annotations={[{ type: "probe" }]}
        svgAnnotationRules={probeRule}
        frameScheduler={scheduler.scheduler}
      />
    ),
  },
]

describe("fresh client mount paint", () => {
  let restoreCanvas: (() => void) | null = null
  let context: CanvasContextMock

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    context = HTMLCanvasElement.prototype.getContext.call(
      document.createElement("canvas"),
      "2d",
    ) as unknown as CanvasContextMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
    restoreCanvas?.()
    restoreCanvas = null
  })

  it.each(frames)(
    "$name paints its canvas and SVG annotations before the first animation frame",
    ({ renderFrame }) => {
      const scheduler = createFrameScheduler(0)
      ;(context.clearRect as ReturnType<typeof vi.fn>).mockClear()

      const view = render(renderFrame(scheduler))

      expect(context.clearRect).toHaveBeenCalled()
      expect(view.container.querySelectorAll(".fresh-mount-annotation")).toHaveLength(1)
      expect(scheduler.pendingCount).toBe(0)
    },
  )
})
