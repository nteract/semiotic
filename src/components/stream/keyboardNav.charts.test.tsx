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

const data = [10, 20, 30, 40, 50].map(value => ({ category: "Alpha", value }))

describe("public chart keyboard mark access", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => { restore() })

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
