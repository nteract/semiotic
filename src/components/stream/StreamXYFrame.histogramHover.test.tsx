import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import StreamXYFrame from "./StreamXYFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"

let restore: () => void
beforeEach(() => {
  restore = setupCanvasMock()
})
afterEach(() => restore())

for (const tooltipMode of ["single", "multi"] as const) {
  it(`keeps authored bin fields from changing ${tooltipMode} line hover and click coordinates`, async () => {
    const data = [0, 10].map((binStart) => ({
      binStart,
      binEnd: binStart + 10,
      total: 4
    }))
    const onHover = vi.fn()
    const onClick = vi.fn()
    const { container } = render(
      <StreamXYFrame
        chartType="line"
        data={data}
        xAccessor="binStart"
        yAccessor="total"
        xExtent={[-5, 15]}
        yExtent={[0, 10]}
        size={[200, 100]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        showAxes={false}
        enableHover
        tooltipMode={tooltipMode}
        customHoverBehavior={onHover}
        customClickBehavior={onClick}
      />
    )
    await act(async () => {
      await Promise.resolve()
    })
    const target = container.querySelector(
      ".stream-xy-frame > div[role='img']"
    )!
    fireEvent.mouseMove(target, { clientX: 50, clientY: 60 })
    expect(onHover.mock.lastCall?.[0]).toMatchObject({
      xValue: 0,
      data: data[0]
    })
    fireEvent.click(target, { clientX: 50, clientY: 60 })
    expect(onClick.mock.lastCall?.[0]).toMatchObject({
      xValue: 0,
      data: data[0]
    })
  })

  for (const binAlign of ["start", "center"] as const) {
    it(`reports exact ${binAlign}-aligned histogram centers for ${tooltipMode} pointer and keyboard interactions`, async () => {
      const onHover = vi.fn()
      const onClick = vi.fn()
      const { container } = render(
        <StreamXYFrame
          chartType="bar"
          runtimeMode="streaming"
          data={[
            { time: 0, value: 4 },
            { time: 10, value: 4 }
          ]}
          timeAccessor="time"
          valueAccessor="value"
          binSize={10}
          binAlign={binAlign}
          // Clip the first centered bin: its visual center no longer equals its timestamp.
          xExtent={[0, 25]}
          yExtent={[0, 10]}
          size={[200, 100]}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          showAxes={false}
          enableHover
          tooltipMode={tooltipMode}
          customHoverBehavior={onHover}
          customClickBehavior={onClick}
        />
      )
      await act(async () => {
        await Promise.resolve()
      })
      const frame = container.querySelector<HTMLElement>(".stream-xy-frame")!
      const target = frame.querySelector("div[role='img']")!
      const center = binAlign === "center" ? 0 : 5
      const datum = { binStart: center - 5, binEnd: center + 5, total: 4 }
      fireEvent.mouseMove(target, { clientX: 20, clientY: 80 })
      expect(onHover.mock.lastCall?.[0]).toMatchObject({
        xValue: center,
        data: datum
      })
      fireEvent.click(target, { clientX: 20, clientY: 80 })
      expect(onClick.mock.lastCall?.[0]).toMatchObject({
        xValue: center,
        data: datum
      })
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      expect(onHover.mock.lastCall).toEqual([
        expect.objectContaining({
          xValue: center,
          data: expect.objectContaining(datum)
        }),
        { type: "focus", inputType: "keyboard" }
      ])
      fireEvent.keyDown(frame, { key: "Enter" })
      expect(onClick.mock.lastCall).toEqual([
        expect.objectContaining({
          xValue: center,
          data: expect.objectContaining(datum)
        }),
        { type: "activate", inputType: "keyboard" }
      ])
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      expect(onHover.mock.lastCall?.[0]).toMatchObject({ xValue: center + 10 })
    })
  }
}
