/**
 * Phase 2 — hydration parity across the XY HOC catalog.
 *
 * The boundary lives in `StreamXYFrame` (Phase 1), so every HOC that
 * funnels through it should hydrate for free. This file proves that
 * end-to-end against every shipped XY HOC: `renderToString` produces
 * markup, `hydrateRoot` accepts it without React mismatch warnings, and
 * a `<canvas>` is live in the DOM after the post-hydration commit.
 *
 * If you add a new XY HOC, add a row to `cases` below — that's all the
 * setup needed.
 */
import * as React from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { act } from "react"
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"

import { LineChart } from "./LineChart"
import { AreaChart } from "./AreaChart"
import { StackedAreaChart } from "./StackedAreaChart"
import { Scatterplot } from "./Scatterplot"
import { ConnectedScatterplot } from "./ConnectedScatterplot"
import { BubbleChart } from "./BubbleChart"
import { Heatmap } from "./Heatmap"
import { ScatterplotMatrix } from "./ScatterplotMatrix"
import { MinimapChart } from "./MinimapChart"
import { QuadrantChart } from "./QuadrantChart"
import { MultiAxisLineChart } from "./MultiAxisLineChart"
import { CandlestickChart } from "./CandlestickChart"
import { XYCustomChart } from "../custom/XYCustomChart"

const xyTimeSeries = [
  { x: 0, y: 4, z: 1, group: "a", high: 5, low: 3, open: 4, close: 4.5 },
  { x: 1, y: 7, z: 2, group: "a", high: 8, low: 6, open: 7, close: 7.5 },
  { x: 2, y: 3, z: 1, group: "b", high: 4, low: 2, open: 3, close: 2.5 },
  { x: 3, y: 8, z: 3, group: "b", high: 9, low: 7, open: 8, close: 8.5 },
  { x: 4, y: 5, z: 2, group: "a", high: 6, low: 4, open: 5, close: 5.5 },
]

const heatmapData = [
  { row: "A", col: "X", v: 1 },
  { row: "A", col: "Y", v: 5 },
  { row: "B", col: "X", v: 3 },
  { row: "B", col: "Y", v: 8 },
]

const matrixData = [
  { mpg: 30, hp: 100, weight: 2500 },
  { mpg: 18, hp: 200, weight: 4000 },
  { mpg: 24, hp: 150, weight: 3200 },
]

interface HydrationCase {
  name: string
  // `() => ReactElement` so each test gets a fresh element tree without
  // memoization carrying state across tests.
  render: () => React.ReactElement
}

const cases: HydrationCase[] = [
  { name: "LineChart", render: () => (
    <LineChart data={xyTimeSeries} xAccessor="x" yAccessor="y" width={400} height={200} />
  ) },
  { name: "AreaChart", render: () => (
    <AreaChart data={xyTimeSeries} xAccessor="x" yAccessor="y" width={400} height={200} />
  ) },
  { name: "StackedAreaChart", render: () => (
    <StackedAreaChart data={xyTimeSeries} xAccessor="x" yAccessor="y" areaBy="group" width={400} height={200} />
  ) },
  { name: "Scatterplot", render: () => (
    <Scatterplot data={xyTimeSeries} xAccessor="x" yAccessor="y" width={400} height={200} />
  ) },
  { name: "ConnectedScatterplot", render: () => (
    <ConnectedScatterplot data={xyTimeSeries} xAccessor="x" yAccessor="y" orderAccessor="x" width={400} height={200} />
  ) },
  { name: "BubbleChart", render: () => (
    <BubbleChart data={xyTimeSeries} xAccessor="x" yAccessor="y" sizeBy="z" width={400} height={200} />
  ) },
  { name: "Heatmap", render: () => (
    <Heatmap data={heatmapData} xAccessor="col" yAccessor="row" valueAccessor="v" width={400} height={200} />
  ) },
  { name: "ScatterplotMatrix", render: () => (
    <ScatterplotMatrix data={matrixData} fields={["mpg", "hp", "weight"]} width={500} height={500} />
  ) },
  { name: "QuadrantChart", render: () => (
    <QuadrantChart
      data={xyTimeSeries}
      xAccessor="x"
      yAccessor="y"
      quadrants={{
        topRight: { label: "TR", color: "#22c55e" },
        topLeft: { label: "TL", color: "#3b82f6" },
        bottomLeft: { label: "BL", color: "#ef4444" },
        bottomRight: { label: "BR", color: "#f59e0b" },
      }}
      width={400}
      height={300}
    />
  ) },
  { name: "MultiAxisLineChart", render: () => (
    <MultiAxisLineChart
      data={xyTimeSeries}
      xAccessor="x"
      series={[
        { yAccessor: "y", label: "Y" },
        { yAccessor: "z", label: "Z" },
      ]}
      width={400}
      height={300}
    />
  ) },
  { name: "CandlestickChart", render: () => (
    <CandlestickChart
      data={xyTimeSeries}
      xAccessor="x"
      highAccessor="high"
      lowAccessor="low"
      openAccessor="open"
      closeAccessor="close"
      width={400}
      height={300}
    />
  ) },
  { name: "MinimapChart", render: () => (
    <MinimapChart
      data={xyTimeSeries}
      xAccessor="x"
      yAccessor="y"
      width={500}
      height={300}
    />
  ) },
  { name: "XYCustomChart", render: () => (
    <XYCustomChart
      data={xyTimeSeries}
      layout={(ctx) => ({
        nodes: [{
          type: "rect",
          x: 0,
          y: 0,
          w: ctx.dimensions.plot.width,
          h: ctx.dimensions.plot.height,
          style: { fill: ctx.resolveColor("__test__") },
          datum: null,
        }],
      })}
      width={400}
      height={200}
    />
  ) },
]

describe("XY HOC catalog — hydration parity", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  for (const c of cases) {
    describe(c.name, () => {
      it("renderToString produces SVG markup, no <canvas>", () => {
        const html = renderToString(c.render())
        // Server pass should never emit canvas — that's the whole point
        // of the SVG branch. A canvas in server output means the SSR
        // gate broke.
        expect(html).not.toContain("<canvas")
        // And we should have at least one SVG in the output. The chart
        // wrappers always emit at least the SVG overlay (axes/legend),
        // even if the data scene happened to be empty.
        expect(html).toContain("<svg")
      })

      it("hydrates from server-rendered HTML without React mismatch warnings", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

        const html = renderToString(c.render())
        container.innerHTML = html

        const rootBox: { current: ReturnType<typeof hydrateRoot> | null } = { current: null }
        act(() => {
          rootBox.current = hydrateRoot(container, c.render())
        })

        // React logs hydration mismatches via console.error. Filter for
        // the messages React uses so we don't flag unrelated dev-mode
        // warnings (e.g. validateProps runtime warnings) as failures.
        const mismatchWarnings = errorSpy.mock.calls.filter((call) => {
          const msg = String(call[0] ?? "")
          return /did not match|hydration failed|hydration error/i.test(msg)
        })
        expect(mismatchWarnings).toEqual([])

        rootBox.current?.unmount()
        errorSpy.mockRestore()
      })

      it("upgrades to interactive canvas after hydration", () => {
        const html = renderToString(c.render())
        container.innerHTML = html

        const rootBox: { current: ReturnType<typeof hydrateRoot> | null } = { current: null }
        act(() => {
          rootBox.current = hydrateRoot(container, c.render())
        })

        // After useLayoutEffect fires, hydrated flips and the canvas
        // branch is live. At least one canvas should exist for the
        // data-mark surface. Multi-frame charts (ScatterplotMatrix,
        // MinimapChart) emit several — `>= 1` is the universal floor.
        const canvases = container.querySelectorAll("canvas")
        expect(canvases.length).toBeGreaterThanOrEqual(1)

        rootBox.current?.unmount()
      })
    })
  }
})
