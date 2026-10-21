import * as React from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../../stream/test-utils/frameScheduler"
import { EventDropChart } from "./EventDropChart"
import type { EventDropChartHandle } from "./useEventDropHandle"

let restoreCanvas: () => void
beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
})
afterEach(() => {
  cleanup()
  restoreCanvas()
})
const emitters = { sources: [{ id: "source", ratePerSec: 10 }] }

it.each([false, true])(
  "stops removed producers, including authoritative data=%s",
  (authoritative) => {
    const ref = React.createRef<EventDropChartHandle>()
    const { rerender } = render(
      <EventDropChart ref={ref} live emitters={emitters} paused />
    )
    const store = ref.current!.getStore()!
    act(() => {
      store.setPaused(false)
      for (let i = 0; i < 20; i++) store.tick(0.01)
    })
    expect(store.snapshot().emitters!.progress.emitted).toBeGreaterThan(0)
    rerender(
      <EventDropChart
        ref={ref}
        live
        paused
        data={authoritative ? [{ id: "seed", time: 2 }] : undefined}
      />
    )
    expect(ref.current!.getStore()).toBe(store)
    expect(store.snapshot().emitters).toBeUndefined()
    const ids = ref.current!.getData().map((row) => row.id)
    act(() => {
      store.setPaused(false)
      for (let i = 0; i < 10; i++) store.tick(0.1)
    })
    expect(ref.current!.getData().map((row) => row.id)).toEqual(ids)
    act(() => ref.current!.clear())
    expect(store.snapshot().emitters).toBeUndefined()
  }
)

it("keeps an explicitly supplied frame schedule, then disables it when removed", () => {
  const ref = React.createRef<EventDropChartHandle>()
  const frameProps = {
    config: {
      emitters: {
        ...emitters,
        templates: {
          source: { x: 0, y: 0, shape: { type: "circle" as const, radius: 3 } }
        }
      }
    }
  }
  const { rerender } = render(
    <EventDropChart
      ref={ref}
      live
      paused
      emitters={emitters}
      frameProps={frameProps}
    />
  )
  rerender(<EventDropChart ref={ref} live paused frameProps={frameProps} />)
  expect(ref.current!.snapshot()!.emitters).toBeDefined()
  rerender(<EventDropChart ref={ref} live paused />)
  expect(ref.current!.snapshot()!.emitters).toBeUndefined()
})

it.each([false, true])(
  "allocates distinct ID-less rows after restore into fresh mount=%s",
  (fresh) => {
    const ref = React.createRef<EventDropChartHandle>()
    const first = render(<EventDropChart ref={ref} live paused />)
    act(() => {
      ref.current!.push({ time: 2 })
      ref.current!.getStore()!.materializeDueSpawns()
    })
    const saved = ref.current!.snapshot()!
    if (fresh) {
      first.unmount()
      render(<EventDropChart ref={ref} live paused />)
    } else act(() => ref.current!.clear())
    act(() => {
      ref.current!.restore(saved)
      ref.current!.pushMany([{ time: 3 }, { time: 4 }])
      ref.current!.getStore()!.materializeDueSpawns()
    })
    expect(ref.current!.getData().map((row) => row.id)).toEqual([
      "event-live-0",
      "event-live-1",
      "event-live-2"
    ])
    expect(ref.current!.getLedger()).toMatchObject([{ accepted: 3 }])
  }
)

it("refreshes overlay and accessible table for restores sharing elapsed time and revision", () => {
  const ref = React.createRef<EventDropChartHandle>()
  const scheduler = createFrameScheduler()
  const { container, getByRole } = render(
    <EventDropChart
      ref={ref}
      live
      paused
      accessibleTable
      data={[{ id: "seed", time: 2 }]}
      frameProps={{ frameScheduler: scheduler.scheduler }}
    />
  )
  act(() => scheduler.flush())
  fireEvent.click(getByRole("button", { name: /View data summary/ }))
  const before = ref.current!.snapshot()!
  const saved = structuredClone(before)
  saved.eventDrop!.ledger.windows[0].accepted = 7
  saved.eventDrop!.ledger.windows[0].bySource[""].accepted = 7
  saved.eventDrop!.anchor += 1
  const overlay = () =>
    container.querySelector('[data-testid="event-drop-window-overlay"]')!
  expect(overlay().textContent).toContain("1")
  act(() => ref.current!.restore(saved))
  act(() => scheduler.flush())
  expect(ref.current!.snapshot()!.revision).toBe(before.revision)
  expect(ref.current!.getLedger()[0].accepted).toBe(7)
  expect(overlay().textContent).toContain("7")
  expect(container.querySelector("table")!.textContent).toContain("7 on time")
})

it("does not reuse a generated ID while an older worker response precedes its enqueue acknowledgement", () => {
  const ref = React.createRef<EventDropChartHandle>()
  render(<EventDropChart ref={ref} live paused />)
  const priorFrame = ref.current!.snapshot()!
  act(() => ref.current!.push({ time: 2 }))
  const first = ref.current!.snapshot()!.queue[0].id
  // Model the older worker response landing before the queued enqueue ack.
  act(() => ref.current!.getStore()!.restore(priorFrame))
  act(() => ref.current!.push({ time: 3 }))
  expect(ref.current!.snapshot()!.queue[0].id).not.toBe(first)
})
