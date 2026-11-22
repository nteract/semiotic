import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StreamXYFrame from "./StreamXYFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import type { HoverData, StreamXYFrameProps } from "./types"

const series = (name: string, xs: number[], slope: number) =>
  xs.map(x => ({ series: name, x, y: x * slope }))
const upTo = (last: number) => Array.from({ length: last + 1 }, (_, x) => x)

// 200px over an xExtent of [0, 20]: 10px per x unit, zero margins.
const baseProps: StreamXYFrameProps = {
  chartType: "line",
  data: [...series("A", upTo(11), 1), ...series("B", upTo(11), 2)],
  xAccessor: "x",
  yAccessor: "y",
  groupAccessor: "series",
  xExtent: [0, 20],
  yExtent: [0, 30],
  size: [200, 100],
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  showAxes: false,
  enableHover: true,
  tooltipMode: "multi",
}

async function renderFrame(props: Partial<StreamXYFrameProps> = {}) {
  const onHover = vi.fn()
  const view = render(<StreamXYFrame {...baseProps} {...props} customHoverBehavior={onHover} />)
  await act(async () => { await Promise.resolve() })
  const target = view.container.querySelector<HTMLElement>(".stream-xy-frame > div[role='img']")!
  const lastHover = () => onHover.mock.calls.at(-1)?.[0] as HoverData | null | undefined
  const hoverAt = (clientX: number, clientY = 50) => {
    fireEvent.mouseMove(target, { clientX, clientY })
    return lastHover()
  }
  return { ...view, onHover, hoverAt, lastHover }
}

const rows = (hover: HoverData | null | undefined) =>
  (hover?.allSeries ?? []).map(s => [s.group, Math.round(s.value * 10) / 10])

describe("StreamXYFrame multi hover at the data edges", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it("interpolates inside the data and snaps to the last sample in the padding", async () => {
    const { hoverAt } = await renderFrame({ tooltipSampling: "interpolate" })

    const inside = hoverAt(55)
    expect(rows(inside)).toEqual([["A", 5.5], ["B", 11]])
    expect(inside?.xValue).toBeCloseTo(5.5)
    expect(inside?.xPx).toBeCloseTo(55)

    const justPast = hoverAt(112)
    expect(rows(justPast)).toEqual([["A", 11], ["B", 22]])
    expect(justPast?.xValue).toBeCloseTo(11)
    expect(justPast?.xPx).toBeCloseTo(110)
    expect(justPast?.x).toBe(112)

    const padding = hoverAt(180)
    expect(rows(padding)).toEqual([["A", 11], ["B", 22]])
    expect(padding?.xPx).toBeCloseTo(110)
    expect(padding?.x).toBe(180)
    expect(padding?.data).toEqual({ xValue: padding?.xValue, x: padding?.xValue })
    expect(padding?.xValue).toBeCloseTo(11)
  })

  it.each(["line", "area"] as const)("aligns sparse %s rows, values and crosshair at one sample", async chartType => {
    const data = [...series("A", [0, 10], 10), ...series("B", [0, 5, 10], 8)]
    const { hoverAt } = await renderFrame({ chartType, data, curve: "basis", yExtent: [0, 100] })
    for (const [px, x] of [[24.5, 0], [25, 0], [35.8, 5], [41.5, 5], [92, 10]]) {
      const hover = hoverAt(px)
      expect(hover?.xValue).toBe(x)
      expect(hover?.xPx).toBe(x * 10)
      const observed = data.filter(row => row.x === x)
      expect(hover?.allSeries?.map(({ group, value, datum }) => [group, value, datum])).toEqual(
        observed.map(row => [row.series, row.y, row])
      )
    }
  })

  it("reads the exact source values for a singleton with callback accessors", async () => {
    const data = [{ t: 0.1, v: 0.013 }]
    const { hoverAt } = await renderFrame({ data, xAccessor: d => d.t, yAccessor: d => d.v, xExtent: [0, 3] })
    const hover = hoverAt(120)
    expect(hover?.xValue).toBe(data[0].t)
    expect(hover?.allSeries).toMatchObject([{ value: data[0].v, datum: data[0] }])
  })

  it("preserves time-scale dates and enriches each row once for an interactive band", async () => {
    const time = new Date("2026-03-17T10:00:00.001Z")
    const later = new Date(+time + 100)
    const data = [time, later].map((t, i) => ({ t, y: 10 + i, lo: 4, hi: 20 }))
    const { hoverAt } = await renderFrame({ data, xAccessor: "t", xScaleType: "time",
      xExtent: [+time, +later], band: { y0Accessor: "lo", y1Accessor: "hi", interactive: true } })
    const hover = hoverAt(84)
    expect(hover?.xValue).toEqual(time)
    expect(hover?.allSeries).toHaveLength(1)
    expect(hover?.allSeries?.[0]).toMatchObject({ value: 10, datum: { ...data[0], band: { y0: 4, y1: 20 } } })
  })

  it("keeps normalized stack contributions at the selected sample", async () => {
    const { hoverAt } = await renderFrame({ chartType: "stackedarea", normalize: true, yExtent: [0, 1],
      data: [...series("A", [1, 5], 1), ...series("B", [1, 5], 3)] })
    const hover = hoverAt(42)
    expect(hover?.xValue).toBe(5)
    expect(hover?.allSeries?.map(d => d.value)).toEqual([0.25, 0.75])
  })

  it("snaps to the first sample before the data", async () => {
    const { hoverAt } = await renderFrame({ xExtent: [-10, 20] })
    const hover = hoverAt(10)
    expect(rows(hover)).toEqual([["A", 0], ["B", 0]])
    expect(hover?.xValue).toBeCloseTo(0)
  })

  it("lists only the series whose data reaches the hovered x", async () => {
    const { hoverAt } = await renderFrame({
      data: [...series("A", upTo(11), 1), ...series("B", upTo(5), 2)],
    })
    expect(rows(hoverAt(30))).toEqual([["A", 3], ["B", 6]])
    expect(rows(hoverAt(80))).toEqual([["A", 8]])
    expect(rows(hoverAt(180))).toEqual([["A", 11]])
  })

  it("labels an ungrouped series with an empty group", async () => {
    const { hoverAt } = await renderFrame({ data: series("A", upTo(11), 1), groupAccessor: undefined })
    expect(rows(hoverAt(40))).toEqual([["", 4]])
  })

  it("attaches every series to keyboard focus", async () => {
    const { container, lastHover } = await renderFrame()
    fireEvent.keyDown(container.querySelector<HTMLElement>(".stream-xy-frame")!, { key: "ArrowRight" })
    const focused = lastHover()
    expect(rows(focused)).toEqual([["A", 0], ["B", 0]])
    expect(focused?.xValue).toBe(0)
  })

  it("refreshes hover-anywhere series after replacement without replaying pointer callbacks", async () => {
    const tooltipContent = (hover: HoverData) => JSON.stringify(rows(hover))
    const { container, rerender, hoverAt, onHover } = await renderFrame({ tooltipContent })
    hoverAt(180)
    const tooltip = () => container.querySelector(".stream-frame-tooltip")
    expect(tooltip()).toHaveTextContent('[["A",11],["B",22]]')
    rerender(<StreamXYFrame {...baseProps} customHoverBehavior={onHover}
      tooltipContent={tooltipContent}
      data={[...series("A", upTo(11), 1), ...series("B", upTo(11), 3)]} />)
    await waitFor(() => expect(tooltip()).toHaveTextContent('[["A",11],["B",33]]'))
    expect(onHover).toHaveBeenCalledTimes(1)
    rerender(<StreamXYFrame {...baseProps} customHoverBehavior={onHover}
      tooltipContent={tooltipContent} data={[]} />)
    await waitFor(() => expect(tooltip()).toBeNull())
    expect(onHover).toHaveBeenCalledTimes(2)
    expect(onHover.mock.lastCall?.[0]).toBeNull()
  })

  it("still clears single-mode hover past the data", async () => {
    const { hoverAt, onHover } = await renderFrame({ tooltipMode: undefined })
    const onLine = hoverAt(50, 100 - 5 * (100 / 30))
    expect(onLine?.allSeries).toBeUndefined()
    expect(onLine?.data).toMatchObject({ series: "A", x: 5 })
    hoverAt(180)
    expect(onHover.mock.calls.at(-1)?.[0]).toBeNull()
  })
})
