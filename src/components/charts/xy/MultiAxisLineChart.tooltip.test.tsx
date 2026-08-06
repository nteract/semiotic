import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { HoverData, StreamXYFrameProps } from "../../stream/types"
import type { Datum } from "../shared/datumTypes"
import { MultiAxisLineChart } from "./MultiAxisLineChart"

let capturedProps: StreamXYFrameProps | null = null

vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedProps = props
    return <div data-testid="stream-xy-frame" />
  }),
}))

const data = [
  { time: 0, temperature: 60, humidity: 0.3 },
  { time: 1, temperature: 72, humidity: 0.45 },
]

const series = [
  { yAccessor: "temperature" as const, label: "Temperature", extent: [0, 100] as [number, number] },
  { yAccessor: "humidity" as const, label: "Humidity", extent: [0, 1] as [number, number] },
]

function multiHover(): HoverData {
  const transformed = capturedProps?.data as Datum[]
  const temperature = transformed.find(row => row.time === 1 && row.__ma_series === "Temperature")!
  const humidity = transformed.find(row => row.time === 1 && row.__ma_series === "Humidity")!
  return {
    __semioticHoverData: true as const,
    data: temperature,
    x: 120,
    y: 80,
    xValue: 1,
    allSeries: [
      { group: "Temperature", value: 0.72, color: "#f00", datum: temperature },
      { group: "Humidity", value: 0.45, color: "#00f", datum: humidity },
    ],
  }
}

describe("MultiAxisLineChart tooltips", () => {
  beforeEach(() => {
    capturedProps = null
  })

  it("enables multi mode and displays every series in original units", () => {
    render(
      <MultiAxisLineChart
        data={data}
        xAccessor="time"
        series={series}
        tooltip={{ mode: "multi" }}
      />,
    )

    expect(capturedProps?.tooltipMode).toBe("multi")
    const content = capturedProps?.tooltipContent?.(multiHover())
    const rendered = render(<>{content}</>)
    expect(rendered.container.textContent).toContain("Temperature")
    expect(rendered.container.textContent).toContain("72")
    expect(rendered.container.textContent).toContain("Humidity")
    expect(rendered.container.textContent).toContain("0.45")
  })

  it("passes original units and source-shaped rows to custom multi content", () => {
    const content = vi.fn((_datum: Datum) => <div>custom multi-axis</div>)
    render(
      <MultiAxisLineChart
        data={data}
        xAccessor="time"
        series={series}
        tooltip={{ mode: "multi", content }}
      />,
    )

    render(<>{capturedProps?.tooltipContent?.(multiHover())}</>)
    const received = content.mock.calls[0]?.[0]
    expect(received).toBeDefined()
    expect(received).toMatchObject({ time: 1, temperature: 72, humidity: 0.45, xValue: 1 })
    expect(received).not.toHaveProperty("__ma_unitized")
    expect(received).not.toHaveProperty("__ma_series")
    expect(received?.allSeries).toMatchObject([
      { group: "Temperature", value: 72, datum: data[1] },
      { group: "Humidity", value: 0.45, datum: data[1] },
    ])
  })
})
