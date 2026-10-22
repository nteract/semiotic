import "../../test-utils/registerBuiltInXYPlugins"
import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import type { AnnotationContext } from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import { setupCanvasMock } from "../../test-utils/canvasMock"

type Scheduler = ReturnType<typeof createFrameScheduler>

const reactGlobals = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }

/** Run a browser animation frame the way the browser does: outside act(), so
 * React work it schedules asynchronously has not committed when it returns. */
function browserFrame(scheduler: Scheduler) {
  const previous = reactGlobals.IS_REACT_ACT_ENVIRONMENT
  reactGlobals.IS_REACT_ACT_ENVIRONMENT = false
  try {
    scheduler.flush()
  } finally {
    reactGlobals.IS_REACT_ACT_ENVIRONMENT = previous
  }
}

const domainProbe = (axis: "x" | "value") =>
  (annotation: Datum, _index: number, context: AnnotationContext) =>
    annotation.type === "probe" ? (
      <text key="probe" className="domain-probe">
        {String(context.scales?.[axis]?.domain?.()[1])}
      </text>
    ) : null

const probeText = (container: HTMLElement) =>
  container.querySelector(".domain-probe")?.textContent

const networkNodes = [{ id: "a" }]
const networkEdges: never[] = []

const cardLayout: NetworkCustomLayout = (ctx) => ({
  sceneNodes: [],
  sceneEdges: [],
  htmlMarks: [
    {
      id: "card",
      x: Number((ctx.config as { x?: number }).x),
      y: 10,
      width: 40,
      height: 20,
      content: null
    }
  ]
})

describe("overlay state commits with its canvas paint", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    restoreCanvas()
  })

  it.each([
    {
      name: "xy",
      frame: (scheduler: Scheduler, max: number) => (
        <StreamXYFrame
          chartType="scatter"
          data={[{ x: 0, y: 1 }, { x: max, y: 2 }]}
          xAccessor="x"
          yAccessor="y"
          size={[300, 200]}
          animate={false}
          annotations={[{ type: "probe" }]}
          svgAnnotationRules={domainProbe("x")}
          frameScheduler={scheduler.scheduler}
        />
      )
    },
    {
      name: "ordinal",
      frame: (scheduler: Scheduler, max: number) => (
        <StreamOrdinalFrame
          chartType="bar"
          data={[{ category: "a", value: max }]}
          oAccessor="category"
          rAccessor="value"
          size={[300, 200]}
          animate={false}
          annotations={[{ type: "probe" }]}
          svgAnnotationRules={domainProbe("value")}
          frameScheduler={scheduler.scheduler}
        />
      )
    }
  ])("$name overlays show the new scales when the repainting frame returns", ({ frame }) => {
    const scheduler = createFrameScheduler()
    const view = render(frame(scheduler, 10))
    act(() => scheduler.flush())
    const before = probeText(view.container)

    act(() => view.rerender(frame(scheduler, 40)))
    expect(probeText(view.container)).toBe(before)
    browserFrame(scheduler)
    const painted = probeText(view.container)
    expect(painted).not.toBe(before)

    act(() => scheduler.flush())
    expect(probeText(view.container)).toBe(painted)
  })

  it("network HTML marks follow a layout rebuilt in the frame without waiting for the overlay throttle", () => {
    const scheduler = createFrameScheduler()
    const chart = (x: number) => (
      <StreamNetworkFrame
        chartType="force"
        nodes={networkNodes}
        edges={networkEdges}
        customNetworkLayout={cardLayout}
        layoutConfig={{ x }}
        size={[300, 200]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        animate={false}
        clock={() => 0}
        frameScheduler={scheduler.scheduler}
      />
    )
    const view = render(chart(20))
    act(() => scheduler.flush())
    const card = () =>
      view.container.querySelector<HTMLElement>('[data-mark-id="card"]')?.style.transform
    expect(card()).toBe("translate(20px, 10px)")

    for (const x of [60, 90]) {
      act(() => view.rerender(chart(x)))
      browserFrame(scheduler)
      expect(card()).toBe(`translate(${x}px, 10px)`)
    }
  })
})
