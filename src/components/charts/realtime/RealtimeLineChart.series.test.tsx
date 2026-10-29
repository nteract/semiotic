import * as React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StreamXYFrameProps } from "../../stream/types"
import type { HoverData } from "../../realtime/types"
import type { Datum } from "../shared/datumTypes"
import { CategoryColorProvider } from "../../CategoryColors"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { AGG_SERIES } from "./RealtimeAccumulator"

const capturedFrames: StreamXYFrameProps[] = []

vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedFrames.push(props)
    return <div data-testid="stream-line" />
  })
}))

interface LegendShape {
  legendGroups?: Array<{
    items: Array<{ label: string; color?: string }>
  }>
}

function latestFrame(): StreamXYFrameProps {
  const frame = capturedFrames.at(-1)
  if (!frame) throw new Error("No frame captured")
  return frame
}

function legendColors(frame: StreamXYFrameProps): Record<string, string> {
  const configs = Array.isArray(frame.legend) ? frame.legend : [frame.legend]
  const result: Record<string, string> = {}
  for (const config of configs) {
    for (const group of (config as LegendShape | undefined)?.legendGroups ?? []) {
      for (const item of group.items) {
        if (item.color) result[item.label] = item.color
      }
    }
  }
  return result
}

// The frame resolves each line by calling lineStyle(sampleDatum, groupKey).
function strokeFor(frame: StreamXYFrameProps, datum: Datum, group?: string) {
  const style = frame.lineStyle as
    | ((d: Datum, group?: string) => { stroke?: unknown })
    | undefined
  return style?.(datum, group).stroke
}

const SERIES = ["cpu", "mem", "disk", "net", "io", "gc"]
const rows = SERIES.flatMap((series, i) => [
  { time: 1, value: i, series },
  { time: 2, value: i + 1, series }
])

describe("RealtimeLineChart series colour and legend", () => {
  beforeEach(() => {
    capturedFrames.length = 0
  })

  it("colours each series from the categorical palette and lists them in an automatic legend", () => {
    render(<RealtimeLineChart data={rows} seriesAccessor="series" />)
    const frame = latestFrame()
    const strokes = SERIES.map((series) =>
      strokeFor(frame, { series }, series)
    )
    expect(new Set(strokes).size).toBe(SERIES.length)
    expect(strokes).not.toContain("#007bff")
    // Without a group argument the sample row still resolves its series.
    expect(strokeFor(frame, { series: "mem" })).toBe(strokes[1])
    expect(legendColors(frame)).toEqual(
      Object.fromEntries(SERIES.map((series, i) => [series, strokes[i]]))
    )
  })

  it("keeps the legend opt-out and an explicit stroke override", () => {
    render(
      <>
        <RealtimeLineChart data={rows} seriesAccessor="series" showLegend={false} />
        <RealtimeLineChart data={rows} seriesAccessor="series" stroke="#123456" />
      </>
    )
    const [hidden, stroked] = capturedFrames.slice(-2)
    expect(hidden.legend).toBeUndefined()
    expect(strokeFor(hidden, { series: "cpu" }, "cpu")).not.toBe(
      strokeFor(hidden, { series: "mem" }, "mem")
    )
    for (const series of SERIES) {
      expect(strokeFor(stroked, { series }, series)).toBe("#123456")
    }
    expect(new Set(Object.values(legendColors(stroked)))).toEqual(
      new Set(["#123456"])
    )
  })

  it("lets style rules and providers override palette colours per series", () => {
    render(
      <CategoryColorProvider colors={{ cpu: "#aa0000" }}>
        <RealtimeLineChart
          data={rows}
          seriesAccessor="series"
          styleRules={[
            {
              when: (_d, ctx) => ctx.category === "mem",
              style: { stroke: "#00bb00" }
            }
          ]}
        />
      </CategoryColorProvider>
    )
    const frame = latestFrame()
    expect(strokeFor(frame, { series: "cpu" }, "cpu")).toBe("#aa0000")
    expect(strokeFor(frame, { series: "mem" }, "mem")).toBe("#00bb00")
    expect(legendColors(frame).cpu).toBe("#aa0000")
  })

  it("preserves single-series defaults", () => {
    render(
      <>
        <RealtimeLineChart data={rows} />
        <RealtimeLineChart data={rows} showLegend />
      </>
    )
    const [plain, withLegend] = capturedFrames.slice(-2)
    expect(plain.legend).toBeUndefined()
    expect(plain.onCategoriesChange).toBeUndefined()
    expect(strokeFor(plain, rows[0], "cpu")).toBe("#007bff")
    expect(legendColors(withLegend)).toEqual({ Value: "#007bff" })
  })

  it("builds the push-mode legend from the frame's discovered series", async () => {
    render(<RealtimeLineChart seriesAccessor="series" />)
    const frame = latestFrame()
    expect(frame.legend).toBeUndefined()
    expect(frame.legendCategoryAccessor).toBe("series")
    act(() => frame.onCategoriesChange?.(["a", "b"]))
    await waitFor(() =>
      expect(Object.keys(legendColors(latestFrame()))).toEqual(["a", "b"])
    )
    const next = latestFrame()
    expect(legendColors(next).a).toBe(strokeFor(next, { series: "a" }, "a"))
    expect(legendColors(next).a).not.toBe(legendColors(next).b)
  })

  it("colours and lists aggregate-mode series from the synthetic series key", async () => {
    render(
      <RealtimeLineChart
        data={rows}
        seriesAccessor="series"
        aggregate={{ size: 10 }}
      />
    )
    await waitFor(() =>
      expect(Object.keys(legendColors(latestFrame()))).toEqual(SERIES)
    )
    const frame = latestFrame()
    expect(frame.groupAccessor).toBe(AGG_SERIES)
    const strokes = SERIES.map((series) =>
      strokeFor(frame, { [AGG_SERIES]: series }, series)
    )
    expect(new Set(strokes).size).toBe(SERIES.length)
    expect(legendColors(frame).cpu).toBe(strokes[0])
  })

  it("names the hovered series in the default tooltip", () => {
    render(
      <RealtimeLineChart
        data={rows}
        seriesAccessor="series"
        timeAccessor="time"
        valueAccessor="value"
      />
    )
    const content = latestFrame().tooltipContent?.({
      data: { time: 2, value: 4, series: "mem" }
    } as unknown as HoverData)
    const { container } = render(<>{content}</>)
    expect(container.textContent).toContain("series:mem")
    expect(container.textContent).toContain("y:4")
  })

  it("reads aggregate window rows, not the raw accessors, in the default tooltip", () => {
    render(
      <RealtimeLineChart
        data={rows.map((row) => ({ ts: row.time, amount: row.value, series: row.series }))}
        timeAccessor="ts"
        valueAccessor="amount"
        seriesAccessor="series"
        aggregate={{ size: 10 }}
      />
    )
    const content = latestFrame().tooltipContent?.({
      data: { time: 5, value: 3, count: 2, [AGG_SERIES]: "disk" }
    } as unknown as HoverData)
    const { container } = render(<>{content}</>)
    expect(container.textContent).toContain("series:disk")
    expect(container.textContent).toContain("x:5")
    expect(container.textContent).toContain("y:3")
  })

  it("dims the other series while a legend item is highlighted", async () => {
    render(
      <RealtimeLineChart
        data={rows}
        seriesAccessor="series"
        legendInteraction="highlight"
      />
    )
    act(() =>
      latestFrame().legendHoverBehavior?.({
        label: "mem",
        __semioticCategory: true
      } as never)
    )
    await waitFor(() =>
      expect(latestFrame().legendHighlightedCategory).toBe("mem")
    )
    const style = latestFrame().lineStyle as (
      d: Datum,
      group?: string
    ) => { opacity?: number }
    expect(style({ series: "mem" }, "mem").opacity ?? 1).toBe(1)
    expect(style({ series: "cpu" }, "cpu").opacity ?? 1).toBeLessThan(1)
  })
})
