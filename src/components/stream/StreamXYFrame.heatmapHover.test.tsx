import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { setCrosshairPosition } from "../store/LinkedCrosshairStore"
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
