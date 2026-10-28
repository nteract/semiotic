import React from "react"
import { act, render } from "@testing-library/react"
import { RealtimeLineChart } from "./RealtimeLineChart"
import type { RealtimeLineChartHandle } from "./RealtimeLineChart"
import { RealtimeAccumulator } from "./RealtimeAccumulator"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

let cleanup: () => void
beforeEach(() => {
  vi.useFakeTimers()
  cleanup = setupCanvasMock()
  vi.setSystemTime(0)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it("coalesces a long live feed to one emit per frame and retains only the newest default windows", () => {
  const callbacks = new Map<number, FrameRequestCallback>()
  let next = 0
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    callbacks.set(++next, cb)
    return next
  })
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    callbacks.delete(id)
  })
  const ref = React.createRef<RealtimeLineChartHandle>()
  render(<RealtimeLineChart ref={ref} aggregate={{ size: 1000 }} />)
  const emit = vi.spyOn(RealtimeAccumulator.prototype, "emit")
  act(() => {
    for (let i = 0; i < 10_000; i++)
      ref.current!.push({ time: i * 1100, value: i })
  })
  expect(emit).not.toHaveBeenCalled()
  act(() => {
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach((cb) => cb(16))
  })
  expect(emit).toHaveBeenCalledTimes(1)
  const rows = ref.current!.getData()
  expect(rows).toHaveLength(200)
  expect(rows.at(-1)).toMatchObject({ value: 9999, __aggStart: 10_998_000 })
  expect(emit).toHaveBeenCalledTimes(1)
})

it("preserves bounded snapshots, applies live retention on push, and supports explicit unbounded history", () => {
  const data = Array.from({ length: 500 }, (_, time) => ({ time, value: time }))
  const ref = React.createRef<RealtimeLineChartHandle>()
  const result = render(
    <RealtimeLineChart
      ref={ref}
      data={data}
      windowSize={3}
      aggregate={{ size: 1 }}
    />
  )
  expect(ref.current!.getData()).toHaveLength(500)
  act(() => ref.current!.push({ time: 500, value: 500 }))
  expect(ref.current!.getData().map((row) => row.value)).toEqual([
    498, 499, 500
  ])
  result.rerender(
    <RealtimeLineChart
      ref={ref}
      windowSize={3}
      aggregate={{ size: 1, retain: Infinity }}
    />
  )
  act(() => ref.current!.pushMany(data))
  expect(ref.current!.getData()).toHaveLength(500)
})

it("rejects future skew, releases a quiet tail, and finalizes aggregate windows without fabricated events", () => {
  const ref = React.createRef<RealtimeLineChartHandle>()
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {})
  const result = render(
    <RealtimeLineChart
      ref={ref}
      eventTime={{ lateness: 1000, maxFutureSkew: 60_000, idleAdvance: true }}
      aggregate={{ size: 1000, idleAdvance: true }}
    />
  )
  act(() => {
    ref.current!.push({ time: 31_536_000_000, value: 100 })
    ref.current!.push({ time: 0, value: 10 })
  })
  expect(ref.current!.getData()).toEqual([])
  act(() => vi.advanceTimersByTime(1000))
  expect(ref.current!.getData()).toMatchObject([
    { count: 1, value: 10, __aggPartial: true }
  ])
  act(() => vi.advanceTimersByTime(1000))
  expect(ref.current!.getData()).toMatchObject([
    { count: 1, value: 10, __aggPartial: false }
  ])
  expect(warning).toHaveBeenCalledWith(expect.stringContaining("future-dated"))
  act(() => ref.current!.clear())
  act(() => vi.advanceTimersByTime(2000))
  expect(ref.current!.getData()).toEqual([])
  result.unmount()
})

it("advances aggregate-only idle windows and cancels pending publication on unmount", () => {
  const ref = React.createRef<RealtimeLineChartHandle>()
  const result = render(
    <RealtimeLineChart
      ref={ref}
      aggregate={{ size: 1000, idleAdvance: true }}
    />
  )
  act(() => ref.current!.push({ time: 1, value: 10 }))
  act(() => vi.advanceTimersByTime(1250))
  expect(ref.current!.getData()).toMatchObject([
    { count: 1, __aggPartial: false }
  ])
  const emit = vi.spyOn(RealtimeAccumulator.prototype, "emit")
  result.unmount()
  act(() => vi.advanceTimersByTime(5000))
  expect(emit).not.toHaveBeenCalled()
})
