import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { clearCrosshairPosition, setCrosshairPosition } from "../store/LinkedCrosshairStore"
import {
  heatmapBandScale,
  invertHeatmapBandValue,
  projectHeatmapBandValue,
} from "./heatmapBandTicks"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamXYFrame from "./StreamXYFrame"

let restore: () => void
beforeEach(() => {
  restore = setupCanvasMock()
})
afterEach(() => restore())

const data = [
  { x: 10, y: "a", value: 1 },
  { x: 20, y: "a", value: 2 },
  { x: 30, y: "a", value: 3 },
]

it("emits heatmap data keys for pointer, click, and a linked crosshair", async () => {
  const onHover = vi.fn()
  const onClick = vi.fn()
  const { container } = render(
    <>
      <StreamXYFrame
        chartType="heatmap"
        data={data}
        xAccessor="x"
        yAccessor="y"
        valueAccessor="value"
        size={[300, 200]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        showAxes={false}
        enableHover
        customHoverBehavior={(hover) => {
          onHover(hover)
          if (typeof hover?.xValue === "number") setCrosshairPosition("heat-link", hover.xValue, "source")
        }}
        customClickBehavior={onClick}
        linkedCrosshairName="heat-link"
        linkedCrosshairSourceId="source"
      />
      <StreamXYFrame
        chartType="heatmap"
        data={data}
        xAccessor="x"
        yAccessor="y"
        valueAccessor="value"
        size={[300, 200]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        showAxes={false}
        linkedCrosshairName="heat-link"
        linkedCrosshairSourceId="follower"
      />
    </>
  )
  await act(async () => {
    await Promise.resolve()
  })
  const target = container.querySelector(".stream-xy-frame > div[role='img']")!
  fireEvent.mouseMove(target, { clientX: 150, clientY: 100 })
  expect(onHover.mock.lastCall?.[0]).toMatchObject({ xValue: 20 })
  fireEvent.click(target, { clientX: 150, clientY: 100 })
  expect(onClick.mock.lastCall?.[0]).toMatchObject({ xValue: 20 })
  const follower = container.querySelectorAll(".stream-xy-frame")[1]
  const line = follower.querySelector("[data-semiotic-crosshair]")
  expect(line).toBeTruthy()
  expect(Number(line?.getAttribute("x1"))).toBeCloseTo(150)
})

it("places a linked continuous value between heatmap columns", async () => {
  setCrosshairPosition("heat-between", 15, "line")
  const { container } = render(
    <StreamXYFrame
      chartType="heatmap"
      data={data}
      xAccessor="x"
      yAccessor="y"
      valueAccessor="value"
      size={[300, 200]}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      showAxes={false}
      linkedCrosshairName="heat-between"
      linkedCrosshairSourceId="heatmap"
    />
  )
  await act(async () => {
    await Promise.resolve()
  })
  const line = container.querySelector("[data-semiotic-crosshair]")
  expect(Number(line?.getAttribute("x1"))).toBeCloseTo(100)
  clearCrosshairPosition("heat-between", "line")
})

it("keeps a linked crosshair when a seven-column center does not invert exactly", async () => {
  const columns = [10, 20, 30, 40, 50, 60, 70]
  const width = 101
  const scale = heatmapBandScale(columns, [0, width])
  const pixel = scale(5)
  const xValue = invertHeatmapBandValue(scale, pixel)
  expect(projectHeatmapBandValue(scale, xValue)).toBeNull()
  setCrosshairPosition("heat-roundtrip", xValue, "line")
  const { container } = render(
    <StreamXYFrame
      chartType="heatmap"
      data={columns.map((x) => ({ x, y: "a", value: 1 }))}
      xAccessor="x"
      yAccessor="y"
      valueAccessor="value"
      size={[width, 200]}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      showAxes={false}
      linkedCrosshairName="heat-roundtrip"
      linkedCrosshairSourceId="heatmap"
    />
  )
  await act(async () => {
    await Promise.resolve()
  })
  const line = container.querySelector("[data-semiotic-crosshair]")
  expect(Number(line?.getAttribute("x1"))).toBeCloseTo(pixel, 4)
  clearCrosshairPosition("heat-roundtrip", "line")
})
