import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StreamXYFrame from "./StreamXYFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { getSourceRows } from "../store/selectionProvenance"
import type { HoverData, StreamXYFrameProps } from "./types"

const data = [
  { time: 2, value: 3, category: "North" },
  { time: 4, value: 1, category: "South" },
  { time: 6, value: 2, category: "North" },
  { time: 24, value: 4, category: "South" },
]

// 300x100 over [0, 30] x [0, 10]: 10px per unit on both axes, bin 10-20 empty.
const props: StreamXYFrameProps = {
  chartType: "bar",
  runtimeMode: "streaming",
  data,
  binSize: 10,
  timeAccessor: "time",
  valueAccessor: "value",
  categoryAccessor: "category",
  barColors: { North: "#f00", South: "#00f" },
  xExtent: [0, 30],
  yExtent: [0, 10],
  size: [300, 100],
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  showAxes: false,
  enableHover: true,
  tooltipMode: "multi",
}

async function renderFrame(overrides: Partial<StreamXYFrameProps> = {}) {
  const onHover = vi.fn()
  const view = render(<StreamXYFrame {...props} {...overrides} customHoverBehavior={onHover} />)
  await act(async () => { await Promise.resolve() })
  const target = view.container.querySelector<HTMLElement>(".stream-xy-frame > div[role='img']")!
  const last = () => onHover.mock.calls.at(-1)?.[0] as HoverData | null | undefined
  const hoverAt = (clientX: number, clientY: number) => {
    fireEvent.mouseMove(target, { clientX, clientY })
    return last()
  }
  return { ...view, onHover, hoverAt, last }
}

const rows = (hover: HoverData | null | undefined) =>
  hover?.allSeries?.map(({ group, value, color }) => [group, value, color])

describe("StreamXYFrame multi hover on histogram columns", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it("lists every stacked category with the hovered segment as the datum", async () => {
    const { hoverAt } = await renderFrame()
    const hover = hoverAt(50, 80)
    expect(hover?.data).toMatchObject({ category: "North", categoryValue: 5 })
    expect(rows(hover)).toEqual([["North", 5, "#f00"], ["South", 1, "#00f"]])
    expect(hover?.xPx).toBe(50)
  })

  it("uses the bin as the datum above the stack", async () => {
    const { hoverAt } = await renderFrame()
    const hover = hoverAt(50, 20)
    expect(hover?.data).toEqual({
      binStart: 0,
      binEnd: 10,
      total: 6,
      categories: [{ category: "North", value: 5 }, { category: "South", value: 1 }],
    })
    expect(rows(hover)).toEqual([["North", 5, "#f00"], ["South", 1, "#00f"]])
    expect(getSourceRows(hover)).toEqual(data.slice(0, 3))
  })

  it("clears over an empty bin", async () => {
    const { hoverAt } = await renderFrame()
    expect(rows(hoverAt(50, 20))).toHaveLength(2)
    expect(hoverAt(150, 20)).toBeNull()
  })

  it("keeps single-mode hover to the bar under the pointer", async () => {
    const { hoverAt, onHover } = await renderFrame({ tooltipMode: undefined })
    hoverAt(50, 20)
    expect(onHover).not.toHaveBeenCalled()
    expect(hoverAt(50, 80)?.allSeries).toBeUndefined()
  })

  it("lists the focused column for keyboard focus", async () => {
    const { container, last } = await renderFrame()
    fireEvent.keyDown(container.querySelector<HTMLElement>(".stream-xy-frame")!, { key: "ArrowRight" })
    expect(rows(last())).toEqual([["North", 5, "#f00"], ["South", 1, "#00f"]])
  })
})
