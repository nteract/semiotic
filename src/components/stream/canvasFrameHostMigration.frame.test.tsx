import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamPhysicsFrame from "./physics/StreamPhysicsFrame"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import {
  setupCanvasMock,
  type CanvasContextMock,
} from "../../test-utils/canvasMock"

interface CanvasHostFamily {
  name: string
  renderFrame: (
    backgroundGraphics: React.ReactNode | undefined,
    scheduler: ReturnType<typeof createFrameScheduler>,
  ) => React.ReactElement
}

const networkNodes = [{ id: "source" }, { id: "target" }]
const networkEdges = [{ id: "edge", source: "source", target: "target", value: 1 }]

const canvasHostFamilies: readonly CanvasHostFamily[] = [
  {
    name: "network",
    renderFrame: (backgroundGraphics, scheduler) => (
      <StreamNetworkFrame
        chartType="sankey"
        nodes={networkNodes}
        edges={networkEdges}
        background="#ffffff"
        backgroundGraphics={backgroundGraphics}
        margin={{ top: 7, right: 0, bottom: 0, left: 11 }}
        size={[220, 140]}
        frameScheduler={scheduler.scheduler}
      />
    ),
  },
  {
    name: "geo",
    renderFrame: (backgroundGraphics, scheduler) => (
      <StreamGeoFrame
        projection="mercator"
        points={[{ id: "point", lon: -122.4, lat: 37.8 }]}
        xAccessor="lon"
        yAccessor="lat"
        background="#ffffff"
        backgroundGraphics={backgroundGraphics}
        margin={{ top: 7, right: 0, bottom: 0, left: 11 }}
        size={[220, 140]}
        frameScheduler={scheduler.scheduler}
      />
    ),
  },
  {
    name: "physics",
    renderFrame: (backgroundGraphics, scheduler) => (
      <StreamPhysicsFrame
        background="#ffffff"
        backgroundGraphics={backgroundGraphics}
        margin={{ top: 7, right: 0, bottom: 0, left: 11 }}
        size={[220, 140]}
        frameScheduler={scheduler.scheduler}
      />
    ),
  },
]

describe("Canvas frame-host migration", () => {
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

  it.each(canvasHostFamilies)(
    "$name uses the shared SVG background placement and repaints when it changes",
    family => {
      const scheduler = createFrameScheduler(0)
      const view = render(family.renderFrame(undefined, scheduler))
      act(() => scheduler.flush(0))
      ;(context.clearRect as ReturnType<typeof vi.fn>).mockClear()
      const fillStyles: string[] = []
      const fillRect = context.fillRect as ((...args: unknown[]) => unknown)
      context.fillRect = vi.fn((...args: unknown[]) => {
        fillStyles.push(String(context.fillStyle))
        return fillRect(...args)
      })

      view.rerender(
        family.renderFrame(
          <rect
            data-testid="canvas-host-background"
            width={209}
            height={133}
            fill="#dbeafe"
          />,
          scheduler,
        ),
      )
      act(() => scheduler.flush(16))

      const background = view.getByTestId("canvas-host-background")
      expect(background.parentElement?.getAttribute("transform")).toBe("translate(11,7)")
      expect(context.clearRect).toHaveBeenCalled()
      expect(fillStyles).not.toContain("#ffffff")
    },
  )
})
