import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { LineChart } from "../charts/xy/LineChart"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamXYFrame from "./StreamXYFrame"
import type { StreamScales, StreamXYFrameHandle, StreamXYFrameProps } from "./types"
import type { RealtimeFrameHandle } from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"

const data = [{ date: "2024-01-01", value: 1 }, { date: "2024-06-01", value: 1000 }]
const tickLabels = (container: HTMLElement, axis: string) =>
  Array.from(container.querySelectorAll(`.semiotic-axis-${axis} .semiotic-axis-tick`), node => node.textContent)

describe("temporal and nonlinear scale updates in live charts", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => { restore() })

  it("keeps LineChart date labels and domain after a fresh inline accessor", async () => {
    const ref = React.createRef<RealtimeFrameHandle>()
    const chart = () => <LineChart ref={ref} data={data} xAccessor={(row: Datum) => row.date}
      yAccessor="value" width={600} height={300} />
    const { container, rerender } = render(chart())
    await waitFor(() => expect(tickLabels(container, "bottom")).toEqual([
      "Jan 1", "Feb 1", "Mar 1", "Apr 1", "May 1", "Jun 1"
    ]))
    const before = (ref.current!.getScales!() as StreamScales).x.domain().map(Number)
    rerender(chart())
    await waitFor(() => expect((ref.current!.getScales!() as StreamScales).x.domain().map(Number)).toEqual(before))
    expect(tickLabels(container, "bottom")).toEqual(["Jan 1", "Feb 1", "Mar 1", "Apr 1", "May 1", "Jun 1"])
  })

  it("updates SVG ticks when only the scale type changes", async () => {
    const ref = React.createRef<StreamXYFrameHandle>()
    const props: StreamXYFrameProps = {
      chartType: "scatter", data, xAccessor: "date", yAccessor: "value",
      yExtent: [1, 1000], size: [600, 300]
    }
    const { container, rerender } = render(<StreamXYFrame ref={ref} {...props} />)
    await waitFor(() => expect(tickLabels(container, "left")).toContain("200"))
    const linearLabels = tickLabels(container, "left")
    rerender(<StreamXYFrame ref={ref} {...props} yScaleType="log" />)
    await waitFor(() => expect(tickLabels(container, "left")).toContain("1"))
    expect(tickLabels(container, "left")).not.toEqual(linearLabels)
    const scale = ref.current!.getScales()!.y
    expect(scale(10) - scale(100)).toBeCloseTo(scale(100) - scale(1000))
  })

  it("replaces numeric axis labels when pushed Date values establish temporal meaning", async () => {
    const ref = React.createRef<StreamXYFrameHandle>()
    const extent: [number, number] = [Date.UTC(2024, 0, 1), Date.UTC(2024, 5, 1)]
    const { container } = render(<StreamXYFrame ref={ref} chartType="line" runtimeMode="streaming"
      timeAccessor="date" valueAccessor="value" xExtent={extent} size={[600, 300]} />)
    await act(async () => { ref.current!.pushMany(data) })
    await waitFor(() => expect(tickLabels(container, "bottom")).toContain("Feb 1"))
    expect(ref.current!.getScales()!.x.ticks(5)[0]).toBeInstanceOf(Date)
  })

  it("labels pushed epoch-ms numbers as distinct clock times on a streaming axis", async () => {
    const ref = React.createRef<StreamXYFrameHandle>()
    const t0 = Date.UTC(2026, 9, 24, 13, 0, 16, 123)
    const { container } = render(<StreamXYFrame ref={ref} chartType="line" runtimeMode="streaming"
      timeAccessor="time" valueAccessor="value" size={[600, 300]} windowSize={300} />)
    // ~75ms of data at a high arrival rate, as Date.now() timestamps.
    await act(async () => {
      ref.current!.pushMany(Array.from({ length: 300 }, (_, i) => ({ time: t0 + i / 4, value: i % 5 })))
    })
    await waitFor(() => expect(tickLabels(container, "bottom").length).toBeGreaterThan(1))
    const labels = tickLabels(container, "bottom")
    expect(new Set(labels).size).toBe(labels.length)
    for (const label of labels) expect(label).toMatch(/^13:00:16\.\d{3}$/)
  })
})
