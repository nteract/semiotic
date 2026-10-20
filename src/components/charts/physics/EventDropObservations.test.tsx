import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { ObservationProvider } from "../../store/ObservationStore"
import { useChartObserver } from "../../store/useObservation"
import { EventDropChart } from "./EventDropChart"
import type { EventDropLedgerRow } from "./eventDropLedger"

describe("EventDrop observation and readout delivery", () => {
  let cleanup: () => void
  beforeEach(() => {
    cleanup = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("publishes successive updates once and immediately delivers changed ledger rows", () => {
    const onObservation = vi.fn()
    const onLedgerChange = vi.fn()
    const props = {
      windows: { size: 10 },
      watermark: { value: 12, allowedLateness: 5 },
      onObservation,
      onLedgerChange,
      paused: true
    }
    const rows = [1, 2, 3].map((time, arrivalTime) => ({
      id: String(time),
      time,
      arrivalTime,
      source: "a"
    }))
    const { rerender } = render(
      <EventDropChart {...props} data={rows.slice(0, 1)} />
    )
    for (const count of [2, 3]) {
      rerender(<EventDropChart {...props} data={rows.slice(0, count)} />)
      expect(onLedgerChange).toHaveBeenCalledTimes(count)
      expect(onLedgerChange.mock.lastCall?.[0][0].accepted).toBe(count)
    }
    rerender(<EventDropChart {...props} data={rows.slice()} />)
    const updates = onObservation.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === "physics-window-update")
    expect(updates).toMatchObject([
      { windowId: "0-10", accepted: 2, retractions: 1 },
      { windowId: "0-10", accepted: 3, retractions: 1 }
    ])
    expect(onLedgerChange).toHaveBeenCalledTimes(3)
  })

  it("keeps repeated idle/held transitions for a source but ignores replayed history", () => {
    const onObservation = vi.fn()
    const props = {
      sources: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ],
      watermark: { delay: 1, perSource: true, idleTimeout: 10 },
      onObservation,
      paused: true
    }
    const rows = [
      { time: 5, arrivalTime: 0, source: "b" },
      { time: 30, arrivalTime: 1, source: "a" },
      { time: 40, arrivalTime: 10, source: "a" },
      { time: 6, arrivalTime: 11, source: "b" },
      { time: 50, arrivalTime: 21, source: "a" }
    ]
    const { rerender } = render(
      <EventDropChart {...props} data={rows.slice(0, 3)} />
    )
    rerender(<EventDropChart {...props} data={rows} />)
    rerender(<EventDropChart {...props} data={rows.slice()} />)
    const transitions = onObservation.mock.calls.map(([event]) => event)
    expect(
      transitions.filter(
        (event) =>
          event.type === "physics-source-idle" && event.sourceId === "b"
      )
    ).toHaveLength(2)
    expect(
      transitions.filter(
        (event) =>
          event.type === "physics-watermark-held" && event.sourceId === "b"
      )
    ).toHaveLength(2)
  })

  it.each([false, true])(
    "shares lifecycle and watermark events with observers (top-level override: %s)",
    (override) => {
      const frameCallback = vi.fn()
      const chartCallback = vi.fn()
      let observed: ReturnType<typeof useChartObserver>["observations"] = []
      function Readout() {
        observed = useChartObserver({
          chartId: "events",
          types: ["physics-window-close", "physics-watermark-advance"]
        }).observations
        return null
      }
      render(
        <ObservationProvider>
          <Readout />
          <EventDropChart
            data={[{ time: 1, arrivalTime: 0 }]}
            watermark={{ value: 12 }}
            frameProps={{ chartId: "events", onObservation: frameCallback }}
            onObservation={override ? chartCallback : undefined}
            paused
          />
        </ObservationProvider>
      )
      expect(observed.map((event) => event.type)).toEqual([
        "physics-window-close",
        "physics-watermark-advance"
      ])
      const callback = override ? chartCallback : frameCallback
      for (const event of observed)
        expect(
          callback.mock.calls.filter(([received]) => received === event)
        ).toHaveLength(1)
      expect(override ? frameCallback : chartCallback).not.toHaveBeenCalled()
    }
  )

  it("does not feed back through inline options and state, but coalesces changed counts", () => {
    vi.useFakeTimers()
    const onLedgerChange = vi.fn()
    const first = [{ time: 1, arrivalTime: 0, source: "a" }]
    function Harness({ data }: { data: typeof first }) {
      const [ledger, setLedger] = React.useState<EventDropLedgerRow[]>([])
      return (
        <>
          <output>{ledger[0]?.accepted ?? 0}</output>
          <EventDropChart
            data={data}
            sources={[{ id: "a", label: "A" }]}
            sourceRail={{ side: "left" }}
            watermark={{ value: 0 }}
            onLedgerChange={(value) => {
              onLedgerChange(value)
              setLedger(value)
            }}
            paused
          />
        </>
      )
    }
    const { rerender, getByRole, unmount } = render(<Harness data={first} />)
    expect(onLedgerChange).toHaveBeenCalledTimes(1)
    for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(500))
    expect(onLedgerChange).toHaveBeenCalledTimes(1)
    rerender(
      <Harness data={[...first, { time: 2, arrivalTime: 1, source: "a" }]} />
    )
    act(() => vi.advanceTimersByTime(499))
    expect(onLedgerChange).toHaveBeenCalledTimes(1)
    rerender(
      <Harness
        data={[
          ...first,
          { time: 2, arrivalTime: 1, source: "a" },
          { time: 3, arrivalTime: 2, source: "a" }
        ]}
      />
    )
    act(() => vi.advanceTimersByTime(1))
    expect(onLedgerChange).toHaveBeenCalledTimes(2)
    expect(getByRole("status").textContent).toBe("3")
    for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(500))
    expect(onLedgerChange).toHaveBeenCalledTimes(2)
    unmount()
    act(() => vi.advanceTimersByTime(500))
    expect(onLedgerChange).toHaveBeenCalledTimes(2)
  })
})
