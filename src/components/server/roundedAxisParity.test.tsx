import React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import { LineChart } from "../charts/xy/LineChart"
import { BarChart } from "../charts/ordinal/BarChart"
import {
  RealtimeHistogram,
  TemporalHistogram
} from "../charts/realtime/RealtimeHistogram"
import type { RealtimeFrameHandle } from "../realtime/types"
import StreamXYFrame from "../stream/StreamXYFrame"
import type {
  StreamScales,
  StreamXYFrameHandle,
  StreamXYFrameProps
} from "../stream/types"
import { setupCanvasMock } from "../../test-utils/canvasMock"

const margin = { top: 10, bottom: 40, left: 40, right: 10 }
const histProps = {
  data: [600, 1340, 900].map((value, i) => ({ time: i * 10, value })),
  binSize: 10,
  timeExtent: [0, 30] as [number, number],
  width: 400,
  height: 180,
  margin,
  axisExtent: "rounded" as const,
  tickFormatValue: String
}
const labels = (root: ParentNode) =>
  Array.from(
    root.querySelectorAll(
      '.semiotic-axis-left .semiotic-axis-tick, .stream-axes text[x="-8"], .ordinal-axes text[x="-8"]'
    ),
    (node) => node.textContent
  )
const svgRoot = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml")

describe("rounded axis renderer parity", () => {
  let restore: () => void
  beforeEach(() => {
    restore = setupCanvasMock()
  })
  afterEach(() => {
    restore()
  })

  it.each(["TemporalHistogram", "RealtimeHistogram"] as const)(
    "rounds %s marks and labels in React and renderChart",
    async (name) => {
      const { svg, evidence } = renderChartWithEvidence(name, histProps)
      expect(evidence.yDomain).toEqual([0, 1500])
      expect(evidence.markCountByType.rect).toBe(3)
      const Chart =
        name === "TemporalHistogram" ? TemporalHistogram : RealtimeHistogram
      const view = render(<Chart {...histProps} />)
      await waitFor(() =>
        expect(labels(view.container)).toEqual(["0", "500", "1000", "1500"])
      )
      expect(labels(svgRoot(svg))).toEqual(labels(view.container))
    }
  )

  it.each([
    [
      [600, 1000, 900],
      [0, 1200]
    ],
    [
      [600, -300, 1300],
      [-500, 1500]
    ],
    [
      [-600, -1340, -900],
      [-1500, 0]
    ]
  ])("renders signed histogram %j in domain %j", (values, expected) => {
    const result = renderChartWithEvidence("TemporalHistogram", {
      ...histProps,
      data: values.map((value, i) => ({ time: i * 10, value }))
    })
    expect(result.evidence.yDomain).toEqual(expected)
    expect(result.evidence.markCountByType.rect).toBe(3)
  })

  it.each(["LineChart", "AreaChart"])(
    "rounds a partially pinned %s at 160px",
    (component) => {
      const result = renderChartWithEvidence(component, {
        data: [
          { x: 0, y: 600 },
          { x: 1, y: 1265 }
        ],
        xAccessor: "x" as const,
        yAccessor: "y" as const,
        width: 400,
        height: 160,
        margin,
        yExtent: [0],
        axisExtent: "rounded",
        yFormat: String
      })
      expect(result.evidence.yDomain).toEqual([0, 1500])
      expect(labels(svgRoot(result.svg))).toEqual(["0", "500", "1000", "1500"])
    }
  )

  it("covers both signs in stacked ordinal bars", () => {
    const result = renderChartWithEvidence("StackedBarChart", {
      data: [
        { category: "A", series: "a", value: 700 },
        { category: "A", series: "b", value: -200 },
        { category: "B", series: "a", value: 300 },
        { category: "B", series: "b", value: 100 }
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      stackBy: "series",
      showLegend: false,
      width: 400,
      height: 180,
      margin,
      axisExtent: "rounded",
      frameProps: { extentPadding: 0.1 }
    })
    expect(result.evidence.yDomain).toEqual([-400, 800])
    expect(result.evidence.markCountByType.rect).toBe(4)
  })

  it.each([1, 3])(
    "rounds LineChart after its %i-row legend reserves space",
    async (rows) => {
      const groups =
        rows === 1
          ? ["A"]
          : [
              "First long series name",
              "Second long series name",
              "Third long series name"
            ]
      const props = {
        data: groups.flatMap((series) => [
          { x: 0, y: 600, series },
          { x: 1, y: 2100, series }
        ]),
        xAccessor: "x" as const,
        yAccessor: "y" as const,
        lineBy: "series" as const,
        colorBy: "series" as const,
        width: 300,
        height: 180,
        margin,
        yExtent: [0] as [number],
        yFormat: String,
        axisExtent: "rounded" as const,
        showLegend: true,
        legendPosition: "bottom" as const
      }
      const ref = React.createRef<RealtimeFrameHandle>()
      const view = render(<LineChart ref={ref} {...props} />)
      const expected = rows === 1 ? [0, 3000] : [0, 4000]
      await waitFor(() =>
        expect((ref.current!.getScales!() as StreamScales).y.domain()).toEqual(
          expected
        )
      )
      const { svg, evidence } = renderChartWithEvidence("LineChart", props)
      expect(evidence.yDomain).toEqual(expected)
      expect(evidence.markCount).toBeGreaterThan(0)
      expect(evidence.plot?.height).toBe(rows === 1 ? 90 : 72)
      expect(labels(svgRoot(svg))).toEqual(labels(view.container))
      expect(labels(view.container)).toEqual(
        rows === 1 ? ["0", "1000", "2000", "3000"] : ["0", "2000", "4000"]
      )
    }
  )

  it("recomputes a pushed histogram without pinning or rerendering its domain", async () => {
    const ref = React.createRef<RealtimeFrameHandle>()
    const { data, ...props } = histProps
    const view = render(<RealtimeHistogram ref={ref} {...props} />)
    await act(async () => {
      ref.current!.pushMany(data)
    })
    await waitFor(() => expect(labels(view.container)).toContain("1500"))
    await act(async () => {
      ref.current!.push({ time: 40, value: 2100 })
    })
    await waitFor(() => expect(labels(view.container)).toContain("2500"))
    expect((ref.current!.getScales!() as StreamScales).y.domain()).toEqual([
      0, 2500
    ])
  })

  it("updates per-axis tickCount and explicit ticks without changing data", async () => {
    const ref = React.createRef<StreamXYFrameHandle>()
    const props: StreamXYFrameProps = {
      chartType: "line",
      data: [
        { x: 0, y: 600 },
        { x: 1, y: 2100 }
      ],
      xAccessor: "x" as const,
      yAccessor: "y" as const,
      size: [400, 180],
      margin,
      yExtent: [0],
      yFormat: String
    }
    const view = render(
      <StreamXYFrame
        ref={ref}
        {...props}
        axes={[{ orient: "left", extent: "rounded", tickCount: 3 }]}
      />
    )
    await waitFor(() =>
      expect(ref.current!.getScales()!.y.domain()).toEqual([0, 3000])
    )
    expect(labels(view.container)).toEqual(["0", "1000", "2000", "3000"])
    view.rerender(
      <StreamXYFrame
        ref={ref}
        {...props}
        axes={[{ orient: "left", extent: "rounded", ticks: 4, tickCount: 3 }]}
      />
    )
    await waitFor(() =>
      expect(ref.current!.getScales()!.y.domain()).toEqual([0, 2500])
    )
    view.rerender(
      <StreamXYFrame
        ref={ref}
        {...props}
        axes={[{ orient: "left", extent: "rounded", tickValues: [0, 2100] }]}
      />
    )
    await waitFor(() =>
      expect(ref.current!.getScales()!.y.domain()).toEqual([0, 2310])
    )
    expect(labels(view.container)).toEqual(["0", "2100"])
  })

  it("shares includeMin with server axes and grids", async () => {
    const props = {
      data: [
        { x: 0, y: -97 },
        { x: 1, y: 90 }
      ],
      xAccessor: "x" as const,
      yAccessor: "y" as const,
      width: 400,
      height: 180,
      margin,
      yExtent: [-103, 100] as [number, number],
      yFormat: String,
      showGrid: true,
      frameProps: {
        axes: [{ orient: "left" as const, includeMin: true, includeMax: true }]
      }
    }
    const view = render(<LineChart {...props} />)
    await waitFor(() =>
      expect(labels(view.container)).toEqual(["-103", "-50", "0", "50", "100"])
    )
    const { svg } = renderChartWithEvidence("LineChart", props)
    const root = svgRoot(svg)
    expect(labels(root)).toEqual(labels(view.container))
    const minGrid = 'line[y1="130"][y2="130"][x1="0"][x2="350"]'
    expect(root.querySelector(minGrid)).not.toBeNull()
    expect(view.container.querySelector(minGrid)).not.toBeNull()
  })

  it("rounds BarChart after layout and preserves explicit ticks", async () => {
    const props = {
      data: [{ category: "A", value: 1340 }],
      width: 400,
      height: 180,
      margin,
      axisExtent: "rounded" as const,
      valueFormat: String
    }
    const view = render(<BarChart {...props} />)
    await waitFor(() => expect(labels(view.container)).toContain("1500"))
    const result = renderChartWithEvidence("BarChart", props)
    expect(result.evidence.yDomain).toEqual([0, 1500])
    expect(labels(svgRoot(result.svg))).toEqual(labels(view.container))
    const explicit = renderChartWithEvidence("BarChart", {
      ...props,
      frameProps: { rTickValues: [0, 1000] }
    })
    expect(explicit.evidence.yDomain).toEqual([0, 1407])
    expect(labels(svgRoot(explicit.svg))).toEqual(["0", "1000"])
  })
})
