import React from "react"
import { act, render } from "@testing-library/react"
import { WaterfallChart } from "./WaterfallChart"
import { RealtimeWaterfallChart } from "../realtime/RealtimeWaterfallChart"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { StreamScales } from "../../stream/types"
import { WaterfallIndex } from "./WaterfallIndex"

let cleanup: () => void
beforeEach(() => {
  cleanup = setupCanvasMock()
})
afterEach(() => cleanup())

it("keeps frozen authored rows intact, preserves updated IDs and restarts categorical positions on clear", () => {
  const ref = React.createRef<RealtimeFrameHandle>()
  const rendered = new Map<string, number>()
  render(
    <WaterfallChart
      ref={ref}
      xAccessor="label"
      yAccessor="delta"
      pointIdAccessor="id"
      frameProps={{
        windowSize: 3,
        areaStyle: (row) => {
          rendered.set(row.id, row.cumEnd)
          return {}
        }
      }}
    />
  )
  const input = Object.freeze({ id: "a", label: "Sales", delta: 10 })
  act(() => ref.current!.push(input))
  expect(Object.keys(input)).toEqual(["id", "label", "delta"])
  act(() => {
    expect(ref.current!.getData()).toEqual([input])
  })
  act(() => ref.current!.update("a", (row) => ({ ...row, delta: 20 })))
  expect(rendered.get("a")).toBe(20)
  act(() =>
    ref.current!.pushMany([
      { id: "b", label: "Costs", delta: -5 },
      { id: "c", label: "Fees", delta: -5 },
      { id: "d", label: "Income", delta: 30 }
    ])
  )
  act(() => {
    ref.current!.getData()
  })
  expect(rendered.get("d")).toBe(40)
  expect(ref.current!.getData().map((row) => row.id)).toEqual(["b", "c", "d"])
  act(() => {
    ref.current!.clear()
    ref.current!.push({ id: "c", label: "Restart", delta: 7 })
  })
  act(() => {
    ref.current!.getData()
  })
  expect(rendered.get("c")).toBe(7)
  expect((ref.current!.getScales!() as StreamScales).x.domain()).toEqual([0, 0])
})

it("forwards the initial balance through the realtime public API", () => {
  const ref = React.createRef<RealtimeFrameHandle>()
  render(
    <RealtimeWaterfallChart
      ref={ref}
      initialValue={100}
      windowSize={3}
      extentPadding={0}
    />
  )
  act(() =>
    ref.current!.pushMany(
      Array.from({ length: 4 }, (_, time) => ({ time, value: 10 }))
    )
  )
  act(() => {
    ref.current!.getData()
  })
  expect((ref.current!.getScales!() as StreamScales).y.domain()).toEqual([
    0, 140
  ])
  act(() => {
    ref.current!.clear()
    ref.current!.push({ time: 0, value: -20 })
  })
  act(() => {
    ref.current!.getData()
  })
  expect((ref.current!.getScales!() as StreamScales).y.domain()).toEqual([
    0, 100
  ])
})

it("bounds categorical sidecars and never resurrects evicted labels while resolving an old row", () => {
  const index = new WaterfallIndex()
  const old = { id: "old" }
  index.index(old, "old", "Old label", 3)
  for (let i = 1; i < 10_000; i++)
    index.index({ id: String(i) }, String(i), `Label ${i}`, 3)
  expect(index.label(0)).toBeUndefined()
  expect(index.label(9996)).toBeUndefined()
  expect(index.label(9997)).toBe("Label 9997")
  expect(index.index(old, "old", "Old label", 3)).toBe(0)
  expect(index.label(9997)).toBe("Label 9997")
  expect(index.index({ id: "old" }, "old", "Reused ID", 3)).toBe(10_000)
})


it("forgets obsolete IDs when a retained row changes identity", () => {
  const index = new WaterfallIndex()
  const row = { id: "first" }
  expect(index.index(row, row.id, "First", 3)).toBe(0)
  row.id = "second"
  expect(index.index(row, row.id, "Second", 3)).toBe(0)
  expect(index.index({ id: "first" }, "first", "New first", 3)).toBe(1)
})
