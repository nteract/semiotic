import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { LineChart } from "./LineChart"
import type { Datum } from "../shared/datumTypes"
import { hasOwnTooltipChrome, markTooltipChrome } from "../../Tooltip/tooltipChrome"

let lastXYFrameProps = {} as CapturedXYFrameProps
vi.mock("../../stream/StreamXYFrame", () => ({
  __esModule: true,
  default: React.forwardRef<Partial<StreamXYFrameHandle>, CapturedXYFrameProps>((props, _ref) => {
    lastXYFrameProps = props
    return <div className="stream-xy-frame" />
  }),
}))

const gapped = [
  { x: 1, y: 10, series: "A" },
  { x: 2, y: null, series: "A" },
  { x: 3, y: 15, series: "A" },
  { x: 1, y: 5, series: "B" },
  { x: 3, y: 8, series: "B" },
]

const forwarded = () => lastXYFrameProps.data as Datum[]
const groupOf = (d: Datum) => (lastXYFrameProps.groupAccessor as (d: Datum) => string)(d)
const keysBySeries = () => {
  const keys: Record<string, string[]> = {}
  for (const d of forwarded()) {
    const key = groupOf(d)
    keys[d.series] = [...new Set([...(keys[d.series] ?? []), key])]
  }
  return keys
}

describe("LineChart gap segments", () => {
  beforeEach(() => {
    lastXYFrameProps = {} as CapturedXYFrameProps
  })

  it("forwards gap-free data untouched and groups by the series field", () => {
    const data = gapped.filter(d => d.y !== null)
    render(<LineChart data={data} lineBy="series" showLegend={false} />)
    expect(forwarded().some(d => "_gapSegment" in d)).toBe(false)
    expect(lastXYFrameProps.groupAccessor).toBe("series")
  })

  it("keys each segment without writing a field onto the data", () => {
    render(<LineChart data={gapped} lineBy="series" showLegend={false} />)
    expect(forwarded().map(d => Object.keys(d).sort())).toEqual(
      Array(4).fill(["series", "x", "y"])
    )
    const keys = keysBySeries()
    expect(keys.A).toHaveLength(2)
    expect(keys.B).toHaveLength(1)
    expect(new Set([...keys.A, ...keys.B]).size).toBe(3)
  })

  it("keeps function lineBy series apart across gaps", () => {
    render(<LineChart data={gapped} lineBy={(d: Datum) => `s-${d.series}`} showLegend={false} />)
    const keys = keysBySeries()
    expect(keys.A.some(key => keys.B.includes(key))).toBe(false)
  })

  it("labels multi tooltip rows with the authored series", () => {
    const content = vi.fn((d: Datum) => d.allSeries.map((s: Datum) => s.group).join(","))
    render(
      <LineChart
        data={gapped}
        lineBy="series"
        showLegend={false}
        tooltip={{ mode: "multi", content: markTooltipChrome(content) }}
      />
    )
    const [a0, , b] = forwarded()
    const tooltip = lastXYFrameProps.tooltipContent
    const hover = {
      data: a0,
      x: 0,
      y: 0,
      __semioticHoverData: true,
      allSeries: [
        { group: groupOf(a0), value: 10, color: "red", datum: a0 },
        { group: groupOf(b), value: 5, color: "blue", datum: b },
      ],
    }
    expect(tooltip(hover)).toBe("A,B")
    expect(hasOwnTooltipChrome(tooltip)).toBe(true)
  })

  it("fills every segment of a fillArea series", () => {
    render(<LineChart data={gapped} lineBy="series" fillArea={["A"]} showLegend={false} />)
    const keys = keysBySeries()
    expect([...(lastXYFrameProps.areaGroups as string[])].sort()).toEqual([...keys.A].sort())
    const [a0, , b] = forwarded()
    expect(lastXYFrameProps.lineStyle(a0, groupOf(a0)).fill).not.toBe("none")
    expect(lastXYFrameProps.lineStyle(b, groupOf(b)).fill).toBeUndefined()
  })
})
