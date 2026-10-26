import React from "react"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { BoxPlot } from "../charts/ordinal/BoxPlot"
import { BarChart } from "../charts/ordinal/BarChart"
import { ViolinPlot } from "../charts/ordinal/ViolinPlot"
import { RidgelinePlot } from "../charts/ordinal/RidgelinePlot"
import { CandlestickChart } from "../charts/xy/CandlestickChart"
import { FunnelChart } from "../charts/ordinal/FunnelChart"
import { FlowMap } from "../charts/geo/FlowMap"
import { TemporalHistogram } from "../charts/realtime/RealtimeHistogram"
import { LinkedCharts } from "../LinkedCharts"

const data = [10, 20, 30, 40, 50].map(value => ({ category: "Alpha", value }))

describe("public chart keyboard mark access", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => { restore() })

  it("dismisses an ordinal pointer tooltip with Escape before keyboard navigation", async () => {
    const customHoverBehavior = vi.fn()
    const { container } = render(<BarChart
      data={[{ category: "Alpha", value: 50 }]} width={400} height={300}
      margin={{ left: 40, right: 40, top: 40, bottom: 40 }}
      frameProps={{ customHoverBehavior }}
    />)
    const frame = container.querySelector<HTMLElement>(".stream-ordinal-frame")!
    fireEvent.mouseMove(frame.querySelector("canvas")!, { clientX: 200, clientY: 150 })
    await waitFor(() => expect(frame.querySelector(".stream-ordinal-tooltip")).toHaveTextContent("Alpha"))
    fireEvent.keyDown(frame, { key: "Escape" })
    expect(frame.querySelector(".stream-ordinal-tooltip")).toBeNull()
    expect(customHoverBehavior.mock.lastCall?.[0]).toBeNull()
  })

  it("dismisses an XY pointer tooltip with Escape before keyboard navigation", async () => {
    const customHoverBehavior = vi.fn()
    const { container } = render(<CandlestickChart
      data={[{ x: 1, open: 20, close: 30, high: 40, low: 10 }]}
      openAccessor="open" closeAccessor="close" width={400} height={300}
      margin={{ left: 40, right: 40, top: 40, bottom: 40 }}
      frameProps={{ customHoverBehavior }}
    />)
    const frame = container.querySelector<HTMLElement>(".stream-xy-frame")!
    fireEvent.mouseMove(frame.querySelector("canvas")!, { clientX: 200, clientY: 150 })
    await waitFor(() => expect(frame.querySelector(".stream-frame-tooltip")).toHaveTextContent("Open"))
    fireEvent.keyDown(frame, { key: "Escape" })
    expect(frame.querySelector(".stream-frame-tooltip")).toBeNull()
    expect(customHoverBehavior.mock.lastCall?.[0]).toBeNull()
  })

  for (const Component of [BoxPlot, ViolinPlot, RidgelinePlot]) {
    it(`${Component.displayName} exposes category statistics and a focus ring`, async () => {
      const onClick = vi.fn()
      const { container } = render(<Component data={data} width={400} height={300} onClick={onClick} />)
      const frame = container.querySelector<HTMLElement>(".stream-ordinal-frame")!
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      await waitFor(() => expect(frame.querySelector(".stream-ordinal-tooltip")?.textContent).toContain("Median: 30"))
      expect(frame.querySelector('[aria-live="polite"]')?.textContent).toContain("median: 30")
      expect(frame.querySelector('[aria-live="polite"]')?.textContent).toContain("category: Alpha")
      expect(Number(frame.querySelector('svg[aria-hidden="true"] rect[stroke-dasharray]')?.getAttribute("width"))).toBeGreaterThan(6)
      fireEvent.keyDown(frame, { key: "Enter" })
      expect(onClick).toHaveBeenCalledWith(data[0], expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }))
      fireEvent.keyDown(frame, { key: "Escape" })
      expect(frame.querySelector(".stream-ordinal-tooltip")).toBeNull()
      expect(frame.querySelector('[aria-live="polite"]')?.textContent).toBe("")
    })
  }

  it("exposes candlestick OHLC values through keyboard focus", async () => {
    const { container } = render(<CandlestickChart data={[{ x: 1, open: 20, close: 30, high: 40, low: 10 }]}
      openAccessor="open" closeAccessor="close" width={400} height={300} />)
    const frame = container.querySelector<HTMLElement>(".stream-xy-frame")!
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    await waitFor(() => expect(frame.querySelector(".stream-frame-tooltip")?.textContent).toMatch(/Open.*20/))
    expect(frame.querySelector('[aria-live="polite"]')?.textContent).toContain("close: 30")
    expect(Number(frame.querySelector('svg[aria-hidden="true"] rect[stroke-dasharray]')?.getAttribute("width"))).toBeGreaterThan(6)
  })

  for (const chart of ["bar", "box", "candle"] as const) {
    it(`keeps the ${chart} datum focused when a scene is resized without replaying hover callbacks`, async () => {
      const customHoverBehavior = vi.fn()
      const candle = [{ x: 1, open: 20, close: 30, high: 40, low: 10 }]
      const makeChart = (width: number) => {
        const common = { width, height: 300, margin: { left: 60, right: 20, top: 30, bottom: 50 }, frameProps: { customHoverBehavior } }
        return chart === "bar" ? <BarChart data={data} categoryAccessor="category" valueAccessor="value" {...common} />
          : chart === "box" ? <BoxPlot data={data} {...common} /> : <CandlestickChart data={candle} openAccessor="open" closeAccessor="close" {...common} />
      }
      const { container, rerender } = render(makeChart(440))
      const frame = container.querySelector<HTMLElement>(".stream-ordinal-frame, .stream-xy-frame")!
      fireEvent.keyDown(frame, { key: "Home" })
      const center = () => {
        const ring = frame.querySelector('svg[aria-hidden="true"] rect[stroke-dasharray]')!
        return Number(ring?.getAttribute("x")) + Number(ring?.getAttribute("width")) / 2
      }
      await waitFor(() => expect(center()).toBeCloseTo(240))
      const calls = customHoverBehavior.mock.calls.length
      const announcement = frame.querySelector('[aria-live="polite"]')?.textContent
      rerender(makeChart(320))
      await waitFor(() => expect(center()).toBeCloseTo(180))
      expect(customHoverBehavior).toHaveBeenCalledTimes(calls)
      expect(frame.querySelector('[aria-live="polite"]')?.textContent).toBe(announcement)
    })
  }

  // Publishing its own hover updates the linked selection, which restyles the
  // histogram and rebuilds every bin datum. Focus has to follow the bin, not
  // the replaced object, or each press lands back on the first bin.
  it("keeps a histogram bin focused while its linked hover restyles the bars", async () => {
    const rows = [0, 1, 2, 3].map((index) => ({ time: index * 10, value: 5 + index }))
    const { container } = render(
      <LinkedCharts showLegend={false}>
        <TemporalHistogram
          data={rows}
          binSize={10}
          timeAccessor="time"
          valueAccessor="value"
          width={400}
          height={300}
          linkedHover={{ name: "histogram-hover", fields: ["binStart"] }}
          selection={{ name: "line-hover" }}
        />
      </LinkedCharts>
    )
    const frame = container.querySelector<HTMLElement>(".stream-xy-frame")!
    for (const [binStart, total] of [[0, 5], [10, 6], [20, 7]]) {
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      // Let the selection update and the rebuilt scene settle before reading.
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(frame.querySelector('[aria-live="polite"]')?.textContent)
        .toContain(`binStart: ${binStart}, binEnd: ${binStart + 10}, total: ${total}`)
      expect(frame.querySelector(".stream-frame-tooltip")?.textContent).toContain(`count:${total}`)
    }
  })

  it("keeps a histogram bin focused when new data rebuilds the bins", async () => {
    const rows = [0, 1, 2].map((index) => ({ time: index * 10, value: 5 + index }))
    const chart = (data: typeof rows) => (
      <TemporalHistogram data={data} binSize={10} timeAccessor="time" valueAccessor="value"
        width={400} height={300} />
    )
    const { container, rerender } = render(chart(rows))
    const frame = container.querySelector<HTMLElement>(".stream-xy-frame")!
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    await waitFor(() => expect(frame.querySelector('[aria-live="polite"]')?.textContent).toContain("binStart: 10"))
    rerender(chart([...rows, { time: 30, value: 9 }]))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(frame.querySelector('[aria-live="polite"]')?.textContent).toContain("binStart: 10")
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    await waitFor(() => expect(frame.querySelector('[aria-live="polite"]')?.textContent).toContain("binStart: 20"))
  })

  it("reaches funnel trapezoids as outlined targets", async () => {
    const { container } = render(<FunnelChart data={[{ step: "Awareness", value: 100 }, { step: "Purchase", value: 50 }]}
      stepAccessor="step" valueAccessor="value" width={400} height={300} />)
    const frame = container.querySelector<HTMLElement>(".stream-ordinal-frame")!
    // Home/End + flat steps can reach connectors even when graph groups differ.
    fireEvent.keyDown(frame, { key: "Home" })
    for (let i = 0; i < 3 && !frame.querySelector('svg[aria-hidden="true"] path[stroke-dasharray]'); i++) {
      fireEvent.keyDown(frame, { key: "PageDown" })
    }
    await waitFor(() => expect(frame.querySelector('svg[aria-hidden="true"] path[stroke-dasharray]')?.getAttribute("d")).toMatch(/^M[\de+.-]+,[\de+.-]+L/))
    expect(frame.querySelector('[aria-live="polite"]')?.textContent).toMatch(/Awareness|Purchase/)
  })

  it("reaches FlowMap edges and preserves authored flow callbacks", async () => {
    const flow = { source: "A", target: "B", value: 75 }
    const onClick = vi.fn()
    const { container } = render(<FlowMap nodes={[{ id: "A", lon: -20, lat: 0 }, { id: "B", lon: 20, lat: 0 }]}
      flows={[flow]} width={400} height={300} onClick={onClick} lineType="line" />)
    const frame = container.querySelector<HTMLElement>(".stream-geo-frame")!
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    for (let i = 0; i < 3 && !frame.querySelector('svg[aria-hidden="true"] path[stroke-dasharray]'); i++) {
      fireEvent.keyDown(frame, { key: "ArrowRight" })
    }
    await waitFor(() => expect(frame.querySelector('svg[aria-hidden="true"] path[stroke-dasharray]')?.getAttribute("d")).toMatch(/^M[\de+.-]+,[\de+.-]+L/))
    expect(frame.querySelector('[aria-live="polite"]')?.textContent).toContain("value: 75")
    fireEvent.keyDown(frame, { key: "Enter" })
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining(flow), expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }))
  })
})
