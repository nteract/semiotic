import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
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
    const { hoverAt } = await renderFrame()

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

  it("still clears single-mode hover past the data", async () => {
    const { hoverAt, onHover } = await renderFrame({ tooltipMode: undefined })
    const onLine = hoverAt(50, 100 - 5 * (100 / 30))
    expect(onLine?.allSeries).toBeUndefined()
    expect(onLine?.data).toMatchObject({ series: "A", x: 5 })
    hoverAt(180)
    expect(onHover.mock.calls.at(-1)?.[0]).toBeNull()
  })
})
