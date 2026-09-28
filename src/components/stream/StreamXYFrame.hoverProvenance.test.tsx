import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import StreamXYFrame from "./StreamXYFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { getSelectionProvenance, getSourceRows } from "../store/selectionProvenance"

let restore: () => void
beforeEach(() => {
  restore = setupCanvasMock()
})
afterEach(() => restore())

it("adds aggregate source fields when hover behavior is enabled on a mounted frame", async () => {
  const data = [
    { time: 2, value: 3, category: "North" },
    { time: 5, value: 4, category: "South" }
  ]
  const props = {
    chartType: "bar" as const,
    runtimeMode: "streaming" as const,
    data,
    binSize: 10,
    timeAccessor: "time",
    valueAccessor: "value",
    xExtent: [0, 10] as [number, number],
    yExtent: [0, 10] as [number, number],
    size: [200, 100] as [number, number],
    showAxes: false,
    enableHover: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  }
  const { container, rerender } = render(<StreamXYFrame {...props} />)
  await act(async () => {
    await Promise.resolve()
  })
  const onHover = vi.fn()
  rerender(<StreamXYFrame {...props} customHoverBehavior={onHover} />)
  await act(async () => {
    await Promise.resolve()
  })
  const target = container.querySelector(".stream-xy-frame > div[role='img']")!
  fireEvent.mouseMove(target, { clientX: 100, clientY: 60 })
  expect(onHover).toHaveBeenCalled()
  expect(getSelectionProvenance(onHover.mock.calls.at(-1)![0].data)).toEqual(
    data
  )
})

it("gives a hovered stacked segment its bin's ordered category breakdown", async () => {
  const data = [
    { time: 2, value: 3, category: "North" },
    { time: 4, value: 1, category: "South" },
    { time: 6, value: 2, category: "North" }
  ]
  const onHover = vi.fn()
  const { container } = render(
    <StreamXYFrame
      chartType="bar"
      runtimeMode="streaming"
      data={data}
      binSize={10}
      timeAccessor="time"
      valueAccessor="value"
      categoryAccessor="category"
      barColors={{ North: "#f00", South: "#00f" }}
      xExtent={[0, 10]}
      yExtent={[0, 10]}
      size={[200, 100]}
      showAxes={false}
      enableHover
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      customHoverBehavior={onHover}
    />
  )
  await act(async () => {
    await Promise.resolve()
  })
  const target = container.querySelector(".stream-xy-frame > div[role='img']")!
  // North stacks at the bottom: values 0..5 of the 0..10 y extent.
  fireEvent.mouseMove(target, { clientX: 100, clientY: 80 })
  const hover = onHover.mock.calls.at(-1)![0]
  expect(hover.data).toMatchObject({ category: "North", categoryValue: 5, total: 6 })
  expect(hover.data.categories).toEqual([
    { category: "North", value: 5 },
    { category: "South", value: 1 }
  ])
  expect(getSourceRows(hover)).toEqual([data[0], data[2]])
  expect(hover.data.categories.map(getSourceRows)).toEqual([[data[0], data[2]], [data[1]]])
  expect(getSourceRows(hover.data.categories)).toEqual(data)
})
