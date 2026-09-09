import * as React from "react"
import { act, render } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import {
  PhysicsPipelineStore,
  type PhysicsPipelineSnapshot
} from "../../stream/physics/PhysicsPipelineStore"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { EventDropChart } from "./EventDropChart"
import {
  buildEventDropPhysics,
  type EventDropProjectionMetadata
} from "./eventDropPhysics"
import type { PhysicsFrameHandle } from "./physicsHocHandle"

const ordered = [0, 10, 20].map((time) => ({
  id: String(time),
  time,
  arrivalTime: time
}))
const size: [number, number] = [440, 280]

function projectionLabels(root: ParentNode) {
  return Array.from(root.querySelectorAll("g text"), (node) => node.textContent)
}

describe("EventDrop admission across rendering and source edits", () => {
  let cleanupCanvas: () => void
  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => cleanupCanvas())

  it("keeps accepted historical events inside their own windows after closure", () => {
    const layout = buildEventDropPhysics({
      data: ordered,
      timeAccessor: "time",
      arrivalAccessor: "arrivalTime",
      windows: { size: 10 },
      watermark: { delay: 5 },
      ballRadius: 7,
      seed: 1,
      size,
      timeScale: 10
    })
    expect(layout.projectionRows).toEqual([
      { label: "0-10", value: 1, secondary: 0 },
      { label: "10-20", value: 1, secondary: 0 },
      { label: "20-30", value: 1, secondary: 0 }
    ])
    const metadata = layout.metadata as unknown as EventDropProjectionMetadata
    expect(metadata.closedWindowCount).toBe(1)
    const store = new PhysicsPipelineStore(layout.config)
    store.enqueue(layout.initialSpawns, layout.initialSpawnPacing)
    store.settle()
    expect(store.snapshot().queue).toEqual([])
    expect(store.readBodies()).toHaveLength(3)
    for (const body of store.readBodies()) {
      const windowIndex = Number(body.id) / 10
      const laneWidth = metadata.windowPlot.width / metadata.windowCount
      expect(body.x).toBeGreaterThan(
        metadata.windowPlot.x + windowIndex * laneWidth
      )
      expect(body.x).toBeLessThan(
        metadata.windowPlot.x + (windowIndex + 1) * laneWidth
      )
      expect(body.y).toBeGreaterThan(
        metadata.windowPlot.y + metadata.windowPlot.height * 0.8
      )
    }
  })

  it("rebuilds admission and projections on push, correction, removal, and data replacement", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const props = { size, windows: { size: 10 }, watermark: { delay: 5 } }
    const { rerender, getByTestId } = render(
      <EventDropChart {...props} ref={ref} />
    )
    const bodies = () => {
      const snapshot = ref.current!
        .getCustomLayout!() as PhysicsPipelineSnapshot
      return [...snapshot.world.bodies, ...snapshot.queue]
    }
    act(() => ref.current!.pushMany(ordered))
    expect(bodies().map((body) => body.datum)).toEqual(
      ordered.map((row, windowIndex) => ({
        ...row,
        eventTime: row.time,
        windowIndex,
        watermarkAtArrival: row.time - 5,
        late: false
      }))
    )
    expect(projectionLabels(getByTestId("event-drop-window-overlay"))).toEqual([
      "gutter",
      "1",
      "0-10",
      "1",
      "10-20",
      "1",
      "20-30"
    ])

    act(() => ref.current!.push({ id: "late", time: 1, arrivalTime: 30 }))
    expect(bodies().find((body) => body.id === "late")?.datum).toMatchObject({
      late: true,
      watermarkAtArrival: 15
    })
    expect(projectionLabels(getByTestId("event-drop-window-overlay"))).toEqual([
      "gutter",
      "1 / 1 late",
      "0-10",
      "1",
      "10-20",
      "1",
      "20-30"
    ])
    act(() => {
      ref.current!.update("late", (row) => ({ ...row, arrivalTime: 1 }))
    })
    expect(bodies().find((body) => body.id === "late")?.datum).toMatchObject({
      late: false
    })
    expect(projectionLabels(getByTestId("event-drop-window-overlay"))).toEqual([
      "gutter",
      "2",
      "0-10",
      "1",
      "10-20",
      "1",
      "20-30"
    ])
    act(() => {
      ref.current!.remove("late")
    })
    expect(ref.current!.getData()).toEqual(ordered)

    rerender(
      <EventDropChart
        {...props}
        ref={ref}
        data={[{ id: "replacement", time: 100 }]}
      />
    )
    expect(bodies().map((body) => body.id)).toEqual(["replacement"])
    expect(getByTestId("event-drop-window-overlay").textContent).toContain(
      "100-110"
    )
    rerender(<EventDropChart {...props} ref={ref} data={[]} />)
    act(() => ref.current!.push({ id: "blocked", time: 100 }))
    expect(ref.current!.getData()).toEqual([])
    expect(ref.current!.getCustomLayout!()).toBeNull()
  })

  it("preserves recorded decisions when only current closure changes", () => {
    const ref = React.createRef<PhysicsFrameHandle>()
    const data = [{ id: "accepted", time: 0, arrivalTime: 1, admission: -4 }]
    const chart = (value: number) => (
      <EventDropChart
        ref={ref}
        data={data}
        watermark={{ value }}
        watermarkAtArrivalAccessor="admission"
      />
    )
    const { rerender } = render(chart(5))
    rerender(chart(100))
    const snapshot = ref.current!.getCustomLayout!() as PhysicsPipelineSnapshot
    expect(snapshot.world.bodies[0].datum).toMatchObject({
      late: false,
      watermarkAtArrival: -4
    })
  })

  it("preserves the same recorded reading in React SSR and serialized server rendering", () => {
    const props = {
      data: [{ id: "accepted", time: 1, arrivalTime: 2, admission: -3 }],
      watermark: { value: 100 },
      watermarkAtArrivalAccessor: "admission",
      size
    }
    const react = renderToString(<EventDropChart {...props} />)
    const serialized = renderChartWithEvidence("EventDropChart", props)
    for (const markup of [react, serialized.svg]) {
      const document = new DOMParser().parseFromString(markup, "text/html")
      expect(projectionLabels(document)).toEqual([
        "gutter",
        "1",
        "0-10",
        "0",
        "10-20"
      ])
    }
    expect(serialized.evidence.markCount).toBe(1)
    expect(serialized.evidence.empty).toBe(false)
  })
})
