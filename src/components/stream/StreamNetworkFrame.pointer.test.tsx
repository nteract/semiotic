import * as React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import StreamNetworkFrame from "./StreamNetworkFrame"

let restore: () => void
beforeEach(() => {
  restore = setupCanvasMock({ stubRaf: "noop" })
})
afterEach(() => restore())

it("coalesces native moves while preserving bubbling, current callbacks and cleanup", async () => {
  const scheduler = createFrameScheduler(0)
  const parent = vi.fn(),
    first = vi.fn(),
    next = vi.fn()
  const datum = { id: "card" }
  const layout: NetworkCustomLayout = () => ({
    sceneNodes: [
      {
        type: "rect",
        x: 20,
        y: 20,
        w: 100,
        h: 60,
        style: { fill: "transparent" },
        datum
      }
    ],
    overlays: (
      <g>
        <rect
          data-testid="stopped-overlay"
          onMouseMove={(event) => event.stopPropagation()}
        />
        <rect data-testid="bubbling-overlay" />
      </g>
    ),
    sceneEdges: [],
    edgeHitTesting: false
  })
  const chart = (enabled: boolean, callback: typeof first) => (
    <React.StrictMode>
      <div onMouseMove={parent}>
        <StreamNetworkFrame
          chartType="force"
          size={[240, 180]}
          margin={{ left: 0, top: 0, right: 0, bottom: 0 }}
          nodes={[datum]}
          edges={[]}
          customNetworkLayout={layout}
          enableHover={enabled}
          animate={false}
          accessibleTable={false}
          frameScheduler={scheduler.scheduler}
          customHoverBehavior={callback}
          tooltipContent={(hover) => hover.data?.id}
        />
      </div>
    </React.StrictMode>
  )
  const view = render(chart(true, first))
  await act(async () => scheduler.flush())
  const canvas = view.container.querySelector("canvas")!
  for (const clientX of [30, 31, 32, 33])
    fireEvent.mouseMove(canvas, { clientX, clientY: 30 })
  expect(parent).toHaveBeenCalledTimes(4)
  expect(first).not.toHaveBeenCalled()
  await act(async () => scheduler.flush())
  expect(first).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ data: datum, nodeOrEdge: "node" }),
    undefined
  )
  expect(
    view.container.querySelector(".stream-network-tooltip")
  ).toHaveTextContent("card")

  fireEvent.mouseMove(view.getByTestId("stopped-overlay"), {
    clientX: 35,
    clientY: 30
  })
  await act(async () => scheduler.flush())
  expect(first).toHaveBeenCalledTimes(1)
  expect(parent).toHaveBeenCalledTimes(4)
  fireEvent.mouseMove(view.getByTestId("bubbling-overlay"), {
    clientX: 35,
    clientY: 30
  })
  await act(async () => scheduler.flush())
  expect(first).toHaveBeenCalledTimes(2)
  expect(parent).toHaveBeenCalledTimes(5)

  view.rerender(chart(false, next))
  await act(async () => scheduler.flush())
  fireEvent.mouseMove(canvas, { clientX: 40, clientY: 30 })
  await act(async () => scheduler.flush())
  expect(next).not.toHaveBeenCalled()
  view.rerender(chart(true, next))
  await act(async () => scheduler.flush())
  fireEvent.mouseMove(canvas, { clientX: 50, clientY: 30 })
  await act(async () => scheduler.flush())
  expect(next).toHaveBeenCalledTimes(1)
  expect(first).toHaveBeenCalledTimes(2)
  expect(parent).toHaveBeenCalledTimes(7)

  fireEvent.mouseMove(canvas, { clientX: 60, clientY: 30 })
  view.unmount()
  fireEvent.mouseMove(canvas, { clientX: 70, clientY: 30 })
  await act(async () => scheduler.flush())
  expect(next).toHaveBeenCalledTimes(1)
  expect(scheduler.pendingCount).toBe(0)
})

it("sends nested row hover and clicks before its owner, and the header to its owner", async () => {
  const scheduler = createFrameScheduler(0)
  const click = vi.fn()
  const owner = { id: "owner" },
    row = { id: "row" }
  const view = render(
    <StreamNetworkFrame
      chartType="force"
      size={[240, 180]}
      nodes={[owner]}
      edges={[]}
      margin={{ left: 0, top: 0, right: 0, bottom: 0 }}
      animate={false}
      frameScheduler={scheduler.scheduler}
      customClickBehavior={click}
      tooltipContent={(hover) => hover.data?.id}
      customNetworkLayout={() => ({
        sceneNodes: [
          {
            type: "rect",
            x: 20,
            y: 20,
            w: 100,
            h: 100,
            datum: owner,
            style: {}
          },
          { type: "rect", x: 20, y: 60, w: 100, h: 20, datum: row, style: {} }
        ]
      })}
    />
  )
  await act(async () => scheduler.flush())
  const canvas = view.container.querySelector("canvas")!
  for (const [clientY, datum] of [
    [70, row],
    [30, owner]
  ] as const) {
    fireEvent.mouseMove(canvas, { clientX: 50, clientY })
    await act(async () => scheduler.flush())
    expect(
      view.container.querySelector(".stream-network-tooltip")
    ).toHaveTextContent(datum.id)
    fireEvent.click(canvas, { clientX: 50, clientY })
    expect(click.mock.calls.at(-1)![0].data).toBe(datum)
  }
  fireEvent.mouseLeave(canvas)
  await act(async () => scheduler.flush())
  expect(view.container.querySelector(".stream-network-tooltip")).toBeNull()
})
