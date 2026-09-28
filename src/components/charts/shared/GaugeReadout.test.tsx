import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { GaugeReadout, gaugeReadoutFontSize } from "./GaugeReadout"
import { estimateLabelWidth } from "./AnnotationLabel"
import { renderChart } from "../../server/renderToStaticSVG"

describe("long gauge readouts", () => {
  it.each(["A very long primitive center readout that must fit", "123456789012345678901234567890"])("fits %s below the old font floor", (value) => {
    const size = gaugeReadoutFontSize(value, 50, 20)
    expect(size).toBeLessThan(11)
    expect(estimateLabelWidth(value, size)).toBeLessThanOrEqual(32.00000001)
    const markup = renderToStaticMarkup(<GaugeReadout value={value} min={0} max={100} radius={50} innerRadius={20} showScaleLabels={false} />)
    expect(markup).toContain(`font-size="${size}"`)
    expect(markup).toContain(value)
    const svg = renderChart("GaugeChart", { value: 50, width: 100, height: 100, centerContent: value })
    expect(svg).toContain(value)
    const fontSize = svg.match(/font-size="([^"]+)"[^>]*font-weight="700"/)
    expect(fontSize).not.toBeNull()
    expect(Number(fontSize![1])).toBeLessThan(11)
  })
})
