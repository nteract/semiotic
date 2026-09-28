import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StreamXYFrameHandle, StreamXYFrameProps } from "../../stream/types"
import { LineChart } from "./LineChart"
import { AreaChart } from "./AreaChart"
import { StackedAreaChart } from "./StackedAreaChart"
import { DifferenceChart } from "./DifferenceChart"
import { Scatterplot } from "./Scatterplot"
import { BubbleChart } from "./BubbleChart"
import { Heatmap } from "./Heatmap"
import { QuadrantChart } from "./QuadrantChart"
import { MultiAxisLineChart } from "./MultiAxisLineChart"
import { WaterfallChart } from "./WaterfallChart"
import { CandlestickChart } from "./CandlestickChart"
import { ConnectedScatterplot } from "./ConnectedScatterplot"
import { MinimapChart } from "./MinimapChart"
import { BumpChart } from "./BumpChart"
import { validateProps } from "../shared/validateProps"

const frames: StreamXYFrameProps[] = []
vi.mock("../../stream/StreamXYFrame", () => ({
  __esModule: true,
  default: React.forwardRef<Partial<StreamXYFrameHandle>, StreamXYFrameProps>((props, _ref) => {
    frames.push(props)
    return <div className="stream-xy-frame" />
  }),
}))

const points = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 2 }]
type Case = [string, React.ComponentType<Record<string, unknown>>, Record<string, unknown>]
const cases: Case[] = [
  ["LineChart", LineChart as never, { data: points }],
  ["AreaChart", AreaChart as never, { data: points }],
  ["StackedAreaChart", StackedAreaChart as never, { data: points.map(p => ({ ...p, group: "A" })), areaBy: "group" }],
  ["DifferenceChart", DifferenceChart as never, { data: points.map(({ x, y }) => ({ x, a: y, b: 2 })) }],
  ["Scatterplot", Scatterplot as never, { data: points }],
  ["BubbleChart", BubbleChart as never, { data: points.map(p => ({ ...p, size: 4 })), sizeBy: "size" }],
  ["Heatmap", Heatmap as never, { data: points.map(p => ({ ...p, value: p.y })) }],
  ["QuadrantChart", QuadrantChart as never, { data: points }],
  ["MultiAxisLineChart", MultiAxisLineChart as never, {
    data: points.map(({ x, y }) => ({ x, left: y, right: y * 10 })),
    series: [{ yAccessor: "left", label: "Left" }, { yAccessor: "right", label: "Right" }],
  }],
  ["WaterfallChart", WaterfallChart as never, { data: points }],
  ["CandlestickChart", CandlestickChart as never, {
    data: points.map(({ x, y }) => ({ x, open: y, high: y + 1, low: y - 1, close: y + 0.5 })),
    openAccessor: "open", highAccessor: "high", lowAccessor: "low", closeAccessor: "close",
  }],
  ["ConnectedScatterplot", ConnectedScatterplot as never, { data: points }],
  ["MinimapChart", MinimapChart as never, { data: points }],
  ["BumpChart", BumpChart as never, {
    data: [0, 1].flatMap(x => [{ x, team: "A", y: x + 1 }, { x, team: "B", y: 2 - x }]),
    lineBy: "team",
  }],
]

// MinimapChart renders its overview too; the detail frame is the full-height one.
const detailFrame = () => frames.filter(frame => frame.size?.[1] === 300).at(-1)!

function renderChart(Component: Case[1], props: Record<string, unknown>) {
  frames.length = 0
  render(<Component width={400} height={300} showLegend={false} {...props} />)
  return detailFrame()
}

describe.each(cases)("%s showAxes", (name, Component, base) => {
  beforeEach(() => { frames.length = 0 })

  it("follows the chart mode and lets an explicit value win", () => {
    expect(renderChart(Component, base).showAxes).toBe(true)
    expect(renderChart(Component, { ...base, showAxes: false }).showAxes).toBe(false)
    if (name === "MinimapChart") return // the browser MinimapChart has no chart modes
    expect(renderChart(Component, { ...base, mode: "sparkline", width: 400, height: 300 }).showAxes).toBe(false)
    expect(renderChart(Component, { ...base, mode: "sparkline", width: 400, height: 300, showAxes: true }).showAxes).toBe(true)
  })

  it("defers to responsive rules and frameProps", () => {
    if (name !== "MinimapChart") {
      const hideAxes = [{ when: { maxWidth: 100000 }, transform: { showAxes: false } }]
      expect(renderChart(Component, { ...base, showAxes: true, responsiveRules: hideAxes }).showAxes).toBe(false)
    }
    expect(renderChart(Component, { ...base, showAxes: false, frameProps: { showAxes: true } }).showAxes).toBe(true)
  })

  it("keeps the margins when the axes are hidden", () => {
    expect(renderChart(Component, { ...base, showAxes: false }).margin).toEqual(renderChart(Component, base).margin)
  })

  it("is a known prop for validation", () => {
    const { errors } = validateProps(name, { ...base, showAxes: false })
    expect(errors.filter(error => error.includes("showAxes"))).toEqual([])
    expect(validateProps(name, { ...base, showAxis: false }).errors.some(error => error.includes('"showAxis"'))).toBe(true)
  })
})
