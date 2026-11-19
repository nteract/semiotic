import React from "react"
import { act, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LineChart } from "./LineChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import {
  ANOMALY_FIELD,
  FORECAST_SEGMENT_FIELD,
  RESOLVED_X_FIELD,
  RESOLVED_Y_FIELD,
} from "../../semiotic-xy"
import type { Datum } from "../shared/datumTypes"

// One spike at x = 17 on a gentle wave. 400px over x ∈ [0, 40]: 10px per x.
const wave: Datum[] = Array.from({ length: 40 }, (_, x) => ({
  x,
  y: 50 + Math.sin(x / 3) * 3 + (x === 17 ? 20 : 0),
}))

const plotProps = {
  width: 400,
  height: 200,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  xExtent: [0, 40] as [number, number],
  yExtent: [0, 100] as [number, number],
  showAxes: false,
  showGrid: false,
  showLegend: false,
}

function renderChart(props: Partial<React.ComponentProps<typeof LineChart>>) {
  const view = render(
    <TooltipProvider>
      <LineChart data={wave} xAccessor="x" yAccessor="y" {...plotProps} {...props} />
    </TooltipProvider>
  )
  const plot = () => view.container.querySelector<HTMLElement>('.stream-xy-frame > div[role="img"]')!
  const hoverAt = async (clientX: number, clientY = 100) => {
    fireEvent.mouseMove(plot(), { clientX, clientY })
    await act(async () => { await Promise.resolve() })
  }
  return { ...view, hoverAt }
}

const boundaryLine = (container: HTMLElement) =>
  [...container.querySelectorAll("line")].find((line) => line.getAttribute("x1") === "200")

describe("LineChart forecast boundary options (browser)", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it("draws today's boundary by default", async () => {
    const { container } = renderChart({ forecast: { trainEnd: 20, steps: 5 } })
    await waitFor(() => expect(boundaryLine(container)).toBeDefined())
    const line = boundaryLine(container)!
    expect(line.getAttribute("stroke")).toBe("#94a3b8")
    expect(line.getAttribute("stroke-dasharray")).toBe("4,2")
    const label = [...container.querySelectorAll("text")].find((text) => text.textContent === "Train / Forecast")!
    expect(label.getAttribute("fill")).toBe("#94a3b8")
    expect(label.parentElement!.querySelector("rect")).toBeNull()
  })

  it("restyles and relabels the boundary", async () => {
    const { container } = renderChart({
      forecast: { trainEnd: 20, steps: 5, boundaryColor: "#123456", boundaryDasharray: "2 6", boundaryLabel: "Fit ends" },
    })
    await waitFor(() => expect(boundaryLine(container)).toBeDefined())
    const line = boundaryLine(container)!
    expect(line.getAttribute("stroke")).toBe("#123456")
    expect(line.getAttribute("stroke-dasharray")).toBe("2 6")
    expect(container.textContent).toContain("Fit ends")
    expect(container.textContent).not.toContain("Train / Forecast")
  })

  it("colors the label and draws its backdrop", async () => {
    const { container } = renderChart({
      forecast: {
        trainEnd: 20,
        steps: 5,
        boundaryColor: "#123456",
        boundaryLabel: "Fit ends",
        boundaryLabelColor: "#202020",
        boundaryLabelBackground: { type: "box", fill: "#fefefe" },
      },
    })
    await waitFor(() => expect(boundaryLine(container)).toBeDefined())
    const label = [...container.querySelectorAll("text")].find((text) => text.textContent === "Fit ends")!
    expect(label.getAttribute("fill")).toBe("#202020")
    expect(label.parentElement!.querySelector('rect[fill="#fefefe"]')).not.toBeNull()
    expect(boundaryLine(container)!.getAttribute("stroke")).toBe("#123456")
  })

  it("hides the label or the whole boundary", async () => {
    const unlabeled = renderChart({ forecast: { trainEnd: 20, steps: 5, boundaryLabel: false } })
    await waitFor(() => expect(boundaryLine(unlabeled.container)).toBeDefined())
    expect(unlabeled.container.textContent).not.toContain("Train / Forecast")
    unlabeled.unmount()

    const hidden = renderChart({ forecast: { trainEnd: 20, steps: 5, showBoundary: false } })
    // The envelope path marks the overlay as applied.
    await waitFor(() => expect(hidden.container.querySelector("path[fill-opacity]")).not.toBeNull())
    expect(boundaryLine(hidden.container)).toBeUndefined()
    expect(hidden.container.textContent).not.toContain("Train / Forecast")
  })
})

describe("LineChart computed anomalies on the hover datum (browser)", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock() })
  afterEach(() => restore())

  it.each(["field", "callback"])("marks zero-filled gaps using %s accessors", async (accessors) => {
    const data = [10, 10, 10, 10, null].map((y, x) => ({ x, y }))
    const tooltip = vi.fn(() => <span>gap</span>)
    const { container, hoverAt } = renderChart({
      data,
      xAccessor: accessors === "callback" ? (d: Datum) => d.x : "x",
      yAccessor: accessors === "callback" ? (d: Datum) => d.y : "y",
      xExtent: [0, 5],
      yExtent: [-5, 15],
      gapStrategy: "zero",
      anomaly: { threshold: 1.5 },
      showPoints: true,
      tooltip,
    })
    await waitFor(() => expect(container.querySelectorAll("circle")).toHaveLength(1))
    await hoverAt(320, 150)
    expect(tooltip).toHaveBeenLastCalledWith(expect.objectContaining({ x: 4, [ANOMALY_FIELD]: true }))
    expect(data[4].y).toBeNull()
    expect(data.some((row) => ANOMALY_FIELD in row)).toBe(false)
  })

  it.each(["break", "interpolate"] as const)("marks the final rows after %s removes a missing x", async (gapStrategy) => {
    const data = [0, 0, 0, 0, 10].map((y, x) => ({ x, y }))
    const tooltip = vi.fn(() => <span>spike</span>)
    const { container, hoverAt } = renderChart({
      data: [...data, { x: null, y: 1000 }],
      xExtent: [0, 5], yExtent: [0, 20], gapStrategy,
      anomaly: { threshold: 1.5 }, showPoints: true, tooltip,
    })
    await waitFor(() => expect(container.querySelectorAll("circle")).toHaveLength(1))
    await hoverAt(320, 100)
    expect(tooltip).toHaveBeenLastCalledWith(expect.objectContaining({ x: 4, [ANOMALY_FIELD]: true }))
  })

  it.each(["coordinates", "points"])("marks nested %s and preserves parent/group metadata", async (lineDataAccessor) => {
    const parent = { label: "Measurements", [lineDataAccessor]: wave }
    const content = vi.fn((hover: Datum) => <span>{hover.allSeries?.length}</span>)
    const { container, hoverAt } = renderChart({
      data: [parent], lineDataAccessor,
      lineBy: (d: Datum) => d.label,
      xAccessor: (d: Datum) => d.x,
      yAccessor: (d: Datum) => d.y,
      anomaly: { threshold: 2 },
      tooltip: { mode: "multi", content },
    })
    await waitFor(() => expect(container.querySelectorAll("circle")).toHaveLength(1))
    await hoverAt(170)
    const [entry] = content.mock.lastCall![0].allSeries
    expect(entry.group).toBe("Measurements")
    expect(entry.datum).toMatchObject({ x: 17, [ANOMALY_FIELD]: true })
    expect(entry.datum.parentLine).toBe(parent)
    expect(wave.some((row) => ANOMALY_FIELD in row)).toBe(false)
  })

  it.each([false, true])("keeps forecast anomaly bands per series after zero filling (nested: %s)", async (nested) => {
    const parents = [10, 100].map((level) => ({
      series: String(level),
      coordinates: [level, level, level, level, null].map((y, x) => ({ x, y, future: false })),
    }))
    const data = nested ? parents : parents.flatMap((p) => p.coordinates.map((d) => ({ ...d, series: p.series })))
    const content = vi.fn((hover: Datum) => <span>{hover.allSeries?.length}</span>)
    const { container, hoverAt } = renderChart({
      data, lineBy: "series", gapStrategy: "zero",
      xExtent: [0, 5], yExtent: [-10, 110],
      forecast: { isForecast: "future" }, anomaly: { threshold: 1.5 },
      tooltip: { mode: "multi", content },
    })
    await waitFor(() => expect(container.querySelectorAll("circle")).toHaveLength(2))
    await hoverAt(320)
    const flagged = content.mock.lastCall![0].allSeries.map((entry: Datum) => entry.datum)
    expect(flagged).toHaveLength(2)
    expect(flagged.every((row: Datum) => row[ANOMALY_FIELD] === true && row.y === 0)).toBe(true)
  })

  it("marks the flagged row in a multi tooltip's allSeries", async () => {
    const content = vi.fn((hover: Datum) => <span>{hover.allSeries?.length}</span>)
    const { container, hoverAt } = renderChart({
      anomaly: { threshold: 2 },
      tooltip: { mode: "multi", content },
    })
    await waitFor(() => expect(container.querySelectorAll("circle")).toHaveLength(1))

    await hoverAt(170)
    const flagged = content.mock.lastCall![0].allSeries[0].datum as Datum
    expect(flagged).toMatchObject({ x: 17, [ANOMALY_FIELD]: true })

    await hoverAt(120)
    const plain = content.mock.lastCall![0].allSeries[0].datum as Datum
    expect(plain.x).toBe(12)
    expect(ANOMALY_FIELD in plain).toBe(false)
  })

  it("marks the hovered point's datum in a single tooltip", async () => {
    const tooltip = vi.fn(() => <span>point</span>)
    const { container, hoverAt } = renderChart({ anomaly: { threshold: 2 }, tooltip, showPoints: true })
    await waitFor(() => expect(container.querySelectorAll("circle")).toHaveLength(1))
    const spike = wave[17].y as number
    await hoverAt(170, 200 - spike * 2)
    expect(tooltip).toHaveBeenLastCalledWith(expect.objectContaining({ x: 17, [ANOMALY_FIELD]: true }))
  })

  it("marks computed outliers among forecast rows, with resolved fields for function accessors", async () => {
    const content = vi.fn((hover: Datum) => <span>{hover.allSeries?.length}</span>)
    // 500px over x ∈ [0, 50] keeps 10px per x and shows the forecast past x = 39.
    const { container, hoverAt } = renderChart({
      width: 500,
      xExtent: [0, 50],
      xAccessor: (d: Datum) => d.x as number,
      yAccessor: (d: Datum) => d.y as number,
      forecast: { trainEnd: 30, steps: 5 },
      anomaly: { threshold: 2 },
      tooltip: { mode: "multi", content },
    })
    await waitFor(() => expect(container.querySelectorAll("circle")).toHaveLength(1))

    await hoverAt(170)
    const flagged = content.mock.lastCall![0].allSeries.map((entry: Datum) => entry.datum as Datum)
    expect(flagged.some((row: Datum) => row[ANOMALY_FIELD] === true && row[RESOLVED_X_FIELD] === 17)).toBe(true)

    await hoverAt(420)
    const future = content.mock.lastCall![0].allSeries.map((entry: Datum) => entry.datum as Datum)
    const forecastRow = future.find((row: Datum) => row[FORECAST_SEGMENT_FIELD] === "forecast")!
    expect(typeof forecastRow[RESOLVED_X_FIELD]).toBe("number")
    expect(typeof forecastRow[RESOLVED_Y_FIELD]).toBe("number")
  })
})
