import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
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

it("admits push rows incrementally and restores the same store and history", () => {
  const ref = React.createRef<EventDropChartHandle>()
  render(<EventDropChart ref={ref} live arrival="drop" timeUnit="s" paused />)
  const handle = ref.current!
  const store = handle.getStore()!
  act(() => handle.push({ id: "a", time: 2 }))
  expect(handle.getLedger()).toEqual([])
  const admit = () =>
    act(() => {
      store.setPaused(false)
      store.tick(1 / 120)
      store.setPaused(true)
    })
  admit()
  expect(handle.getLedger()).toMatchObject([{ accepted: 1, late: 0 }])
  const saved = handle.snapshot()!
  act(() => handle.push({ id: "b", time: 20 }))
  admit()
  expect(handle.getLedger()).toHaveLength(2)
  act(() => handle.restore(saved))
  expect(handle.getStore()).toBe(store)
  expect(handle.getLedger()).toMatchObject([{ accepted: 1, late: 0 }])
  expect(handle.getData().map((d) => d.id)).toEqual(["a"])
  expect(() => handle.update("a", (d) => ({ ...d, time: 4 }))).toThrow(
    /immutable/
  )
  act(() => handle.clear())
  expect(handle.getLedger()).toEqual([])
  expect(handle.getData()).toEqual([])
})

it("skips live rows without a finite event time instead of breaking the frame loop", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  try {
    const ref = React.createRef<EventDropChartHandle>()
    render(<EventDropChart ref={ref} live arrival="drop" timeUnit="s" paused />)
    const handle = ref.current!
    const store = handle.getStore()!
    act(() =>
      handle.pushMany([{ id: "missing" }, { id: "text", time: "soon" }, { id: "ok", time: 2 }])
    )
    expect(warn).toHaveBeenCalledTimes(2)
    expect(() =>
      act(() => {
        store.setPaused(false)
        store.tick(1 / 120)
        store.setPaused(true)
      })
    ).not.toThrow()
    expect(handle.getData().map((d) => d.id)).toEqual(["ok"])
    expect(handle.getLedger()).toMatchObject([{ accepted: 1, late: 0 }])
  } finally {
    warn.mockRestore()
  }
})

it("keeps supplied data authoritative and replaces it without preserving old admissions", () => {
  const ref = React.createRef<EventDropChartHandle>()
  const { rerender } = render(
    <EventDropChart ref={ref} live data={[{ id: "seed", time: 1 }]} paused />
  )
  act(() => ref.current!.push({ id: "ignored", time: 1 }))
  expect(ref.current!.getData().map((d) => d.id)).toEqual(["seed"])
  rerender(
    <EventDropChart
      ref={ref}
      live
      data={[{ id: "replacement", time: 21 }]}
      paused
    />
  )
  expect(ref.current!.getData().map((d) => d.id)).toEqual(["replacement"])
  expect(ref.current!.getLedger()).toMatchObject([{ start: 20, accepted: 1 }])
})

it("filters malformed replacement rows while preserving input indices and paused admission", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  try {
    const ref = React.createRef<EventDropChartHandle>()
    const timeAccessor = vi.fn((row: { time?: number }) => row.time!)
    const chart = (data: { id?: string; time?: number }[]) => (
      <EventDropChart
        ref={ref}
        live
        data={data}
        timeAccessor={timeAccessor}
        paused
      />
    )
    const { rerender } = render(chart([{ id: "seed", time: 1 }]))
    const store = ref.current!.getStore()
    expect(() =>
      rerender(
        chart([
          { id: "missing" },
          { time: 21 },
          { time: Infinity },
          { time: 22 }
        ])
      )
    ).not.toThrow()
    expect(ref.current!.getStore()).toBe(store)
    expect(ref.current!.getClock().paused).toBe(true)
    expect(ref.current!.getData().map((row) => row.id)).toEqual([
      "event-live-1",
      "event-live-3"
    ])
    expect(ref.current!.getLedger()).toMatchObject([{ start: 20, accepted: 2 }])
    expect(timeAccessor).toHaveBeenCalledWith({ time: 22 }, 3)
    expect(warn).toHaveBeenCalled()
  } finally {
    warn.mockRestore()
  }
})

it("reports the effective live speed once and preserves bodies when speed changes", () => {
  const ref = React.createRef<EventDropChartHandle>()
  render(
    <EventDropChart
      ref={ref}
      live
      timeScale={2}
      frameProps={{ config: { timeScale: 3 } }}
      paused
    />
  )
  expect(ref.current!.getClock().timeScale).toBe(6)
  act(() => ref.current!.setTimeScale(4))
  expect(ref.current!.getClock().timeScale).toBe(4)
})

it("counts queued and evicted travellers as emitted until their handoff", () => {
  const ref = React.createRef<EventDropChartHandle>()
  render(
    <EventDropChart
      ref={ref}
      live
      paused
      timeUnit="s"
      sources={[{ id: "a", label: "A" }]}
      arrival={{ mode: "travel", durationMs: 1000 }}
      frameProps={{ config: { bodyLimit: 0 } }}
    />
  )
  act(() => ref.current!.push({ id: "traveller", time: 2, source: "a" }))
  expect(ref.current!.getSourceStats("a")).toEqual({
    emitted: 1,
    accepted: 0,
    late: 0,
    inFlight: 1
  })
  const store = ref.current!.getStore()!
  act(() => {
    store.setPaused(false)
    store.tick(1 / 60)
  })
  expect(store.liveBodyCount()).toBe(0)
  expect(ref.current!.getSourceStats("a")).toEqual({
    emitted: 1,
    accepted: 0,
    late: 0,
    inFlight: 1
  })
  act(() => {
    for (let i = 0; i < 60; i++) store.tick(1 / 60)
  })
  expect(ref.current!.getSourceStats("a")).toEqual({
    emitted: 1,
    accepted: 1,
    late: 0,
    inFlight: 0
  })
})

it("server-renders an empty live board without running unbounded sources", () => {
  const html = renderToStaticMarkup(
    <EventDropChart
      live
      emitters={{ sources: [{ id: "p", ratePerSec: 10 }] }}
      sources={[{ id: "p", label: "Producer" }]}
      title="Live stream"
    />
  )
  expect(html).toContain("Live stream")
  expect(html).toContain("Producer")
  expect(html).toContain('data-testid="event-drop-window-overlay"')
  const document = new DOMParser().parseFromString(html, "text/html")
  expect(
    document
      .querySelector('[id$="-data-area"]')!
      .querySelectorAll("circle,rect,path")
  ).toHaveLength(0)
})

it("requires live push mode for built-in emitters", () => {
  expect(() =>
    renderToStaticMarkup(<EventDropChart emitters={{ sources: [] }} />)
  ).toThrow(/live mode/)
  expect(() =>
    renderToStaticMarkup(
      <EventDropChart live data={[]} emitters={{ sources: [] }} />
    )
  ).toThrow(/omit data/)
})

it("starts a new run instead of failing when window size or source schedules change", () => {
  const ref = React.createRef<EventDropChartHandle>()
  const chart = (size: number, source: string) => (
    <EventDropChart
      ref={ref}
      live
      windows={{ size }}
      timeUnit="s"
      sources={[{ id: source, label: source }]}
      emitters={{ sources: [{ id: source, interval: 500 }], seed: 3 }}
      paused
    />
  )
  const { rerender } = render(chart(1, "a"))
  const first = ref.current!.getStore()!
  expect(() => rerender(chart(2, "a"))).not.toThrow()
  const second = ref.current!.getStore()!
  expect(second).not.toBe(first)
  expect(() => rerender(chart(2, "b"))).not.toThrow()
  expect(ref.current!.getStore()).not.toBe(second)
  expect(ref.current!.getLedger()).toEqual([])
})

it("starts a new emitter run for a new jitter callback but retains identical callbacks and live controls", () => {
  const ref = React.createRef<EventDropChartHandle>()
  const immediate = vi.fn(() => 0)
  const delayed = vi.fn(() => 1000)
  const chart = (jitter: () => number, rate = 1) => (
    <EventDropChart
      ref={ref}
      live
      emitters={{ sources: [{ id: "a", interval: 100, jitter }], rate }}
      paused
    />
  )
  const { rerender } = render(chart(immediate))
  const first = ref.current!.getStore()!
  rerender(chart(immediate, 2))
  expect(ref.current!.getStore()).toBe(first)
  rerender(chart(delayed))
  const second = ref.current!.getStore()!
  expect(second).not.toBe(first)
  act(() => {
    second.setPaused(false)
    for (let i = 0; i < 20; i++) second.tick(0.01)
  })
  expect(delayed).toHaveBeenCalled()
  expect(second.snapshot().emitters!.options.sources[0].jitter).toBe(delayed)
  const rows = ref.current!.getData()
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows)
    expect(Number(row.arrivalTime) - Number(row.eventTime)).toBeCloseTo(1)
})
