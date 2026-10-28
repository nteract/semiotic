import React from "react"
import { act, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import type { StreamOrdinalFrameHandle } from "./ordinalTypes"

describe("ordinal keyboard identity through streaming mutations", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it.each(["bar", "funnel", "bar-funnel"] as const)("keeps an aggregate %s focused when its first source row is evicted", async (chartType) => {
    const ref = React.createRef<StreamOrdinalFrameHandle>()
    const { container } = render(<StreamOrdinalFrame
      ref={ref} chartType={chartType} windowSize={2} dataIdAccessor="id"
      categoryAccessor="category" valueAccessor="value" size={[400, 300]}
      hoverAnnotation
      tooltipContent={(hover) => `${hover.data?.category}: ${hover.data?.__aggregateValue ?? hover.data?.__funnelValue ?? hover.data?.__barFunnelValue}`}
    />)
    act(() => {
      ref.current!.pushMany([
        { id: "a", category: "Alpha", value: 10 },
        { id: "b", category: "Alpha", value: 20 }
      ])
      ref.current!.getData()
    })
    const frame = container.querySelector<HTMLElement>(".stream-ordinal-frame")!
    const tooltip = () => frame.querySelector(".stream-ordinal-tooltip")
    fireEvent.keyDown(frame, { key: "Home" })
    await waitFor(() => expect(tooltip()).toHaveTextContent("Alpha: 30"))
    act(() => {
      ref.current!.push({ id: "c", category: "Alpha", value: 30 })
      ref.current!.getData()
    })
    await waitFor(() => expect(tooltip()).toHaveTextContent("Alpha: 50"))
    const ring = frame.querySelector('[stroke-dasharray="4,2"]')
    expect(Number(ring?.getAttribute("width"))).toBeGreaterThan(6)
    expect(Number(ring?.getAttribute("height"))).toBeGreaterThan(6)
  })

  it.each(["boxplot", "violin", "ridgeline", "pie", "donut"] as const)(
    "keeps the %s category focused when its first source row disappears", async (chartType) => {
      const ref = React.createRef<StreamOrdinalFrameHandle>()
      const radial = chartType === "pie" || chartType === "donut"
      const { container } = render(<StreamOrdinalFrame
        ref={ref} chartType={chartType} dataIdAccessor="id" categoryAccessor="category"
        valueAccessor="value" projection={radial ? "radial" : "vertical"}
        size={[400, 300]} hoverAnnotation
        data={[10, 20, 30].map((value, i) => ({ id: String(i), category: "Alpha", value }))}
        tooltipContent={(hover) => `${hover.category}: ${Array.isArray(hover.data) ? hover.data.length : hover.stats?.median}`}
      />)
      const frame = container.querySelector<HTMLElement>(".stream-ordinal-frame")!
      const tooltip = () => frame.querySelector(".stream-ordinal-tooltip")
      fireEvent.keyDown(frame, { key: "Home" })
      await waitFor(() => expect(tooltip()).toHaveTextContent(`Alpha: ${radial ? 3 : 20}`))
      act(() => { ref.current!.remove("0") })
      await waitFor(() => expect(tooltip()).toHaveTextContent(`Alpha: ${radial ? 2 : 25}`))
    }
  )

  it("keeps a histogram bin focused when its source rows change", async () => {
    const ref = React.createRef<StreamOrdinalFrameHandle>()
    const { container } = render(<StreamOrdinalFrame
      ref={ref} chartType="histogram" dataIdAccessor="id" categoryAccessor="category"
      valueAccessor="value" bins={2} rExtent={[10, 30]} size={[400, 300]} hoverAnnotation
      data={[20, 10, 30, 15].map((value, i) => ({ id: String(i), category: "Alpha", value }))}
      tooltipContent={(hover) => `${hover.data?.range.join("–")}: ${hover.data?.count}`}
    />)
    const frame = container.querySelector<HTMLElement>(".stream-ordinal-frame")!
    const tooltip = () => frame.querySelector(".stream-ordinal-tooltip")
    fireEvent.keyDown(frame, { key: "End" })
    await waitFor(() => expect(tooltip()).toHaveTextContent("20–30: 2"))
    act(() => { ref.current!.remove("0") })
    await waitFor(() => expect(tooltip()).toHaveTextContent("20–30: 1"))
  })

  it("keeps the same value axis focused after earlier rows disappear and the row is edited", async () => {
    const ref = React.createRef<StreamOrdinalFrameHandle>()
    const { container } = render(<StreamOrdinalFrame
      ref={ref} chartType="point" dataIdAccessor="id" categoryAccessor="category"
      valueAccessor={["low", "high"]} oExtent={["Alpha", "Beta"]} multiAxis size={[400, 300]} hoverAnnotation
      data={[
        { id: "a", category: "Alpha", low: 1, high: 100 },
        { id: "b", category: "Beta", low: 2, high: 200 }
      ]}
      tooltipContent={(hover) => `${hover.data?.category}: ${hover.data?.__rIndex}: ${hover.data?.__rValue}`}
    />)
    const frame = container.querySelector<HTMLElement>(".stream-ordinal-frame")!
    const tooltip = () => frame.querySelector(".stream-ordinal-tooltip")
    fireEvent.keyDown(frame, { key: "End" })
    await waitFor(() => expect(tooltip()).toHaveTextContent("Beta: 1: 200"))
    act(() => { ref.current!.remove("a") })
    await waitFor(() => expect(tooltip()).toHaveTextContent("Beta: 1: 200"))
    act(() => { ref.current!.update("b", (d) => ({ ...d, high: 250 })) })
    await waitFor(() => expect(tooltip()).toHaveTextContent("Beta: 1: 250"))
  })
})
