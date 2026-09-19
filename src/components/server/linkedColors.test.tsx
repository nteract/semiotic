// @vitest-environment node
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { LineChart } from "../charts/xy/LineChart"
import { CategoryColorProvider } from "../CategoryColors"
import { LinkedCharts } from "../LinkedCharts"
import { renderChartWithEvidence } from "./renderToStaticSVG"

const data = [
  { timestamp: 1, value: 1, series: "consumption" },
  { timestamp: 2, value: 2, series: "consumption" },
  { timestamp: 1, value: 4, series: "production" },
  { timestamp: 2, value: 5, series: "production" }
]
const props = {
  data,
  xAccessor: "timestamp",
  yAccessor: "value",
  lineBy: "series",
  colorBy: "series",
  width: 400,
  height: 300,
  title: "Energy",
  description: "Consumption and production over time",
  summary: "Production exceeds consumption at both timestamps",
  accessibleTable: true
} as const
const schemes = [
  ["#FF0000", "#0000FF"],
  { production: "#0000FF", consumption: "#FF0000" }
]

describe("categorical palette parity across server entry points", () => {
  it.each(schemes)(
    "preserves a child palette in LinkedCharts React SSR: %j",
    (colorScheme) => {
      const svg = renderToStaticMarkup(
        <LinkedCharts>
          <LineChart {...props} colorScheme={colorScheme} />
        </LinkedCharts>
      )
      expect(svg).toContain('stroke="#FF0000"')
      expect(svg).toContain('stroke="#0000FF"')
    }
  )

  it.each(schemes)(
    "preserves partial provider precedence in React SSR: %j",
    (colorScheme) => {
      const svg = renderToStaticMarkup(
        <CategoryColorProvider colors={{ consumption: "#00FF00" }}>
          <LinkedCharts>
            <LineChart {...props} colorScheme={colorScheme} />
          </LinkedCharts>
        </CategoryColorProvider>
      )
      expect(svg).toContain('stroke="#00FF00"')
      expect(svg).toContain('stroke="#0000FF"')
      expect(svg).not.toContain('stroke="#FF0000"')
    }
  )

  it.each(schemes)(
    "renders serialized palettes with two actual lines: %j",
    (colorScheme) => {
      const config = JSON.parse(JSON.stringify({ ...props, colorScheme }))
      const { svg, evidence } = renderChartWithEvidence("LineChart", config)
      expect(evidence.empty).toBe(false)
      expect(evidence.markCountByType.line).toBe(2)
      expect(svg).toContain('stroke="#FF0000"')
      expect(svg).toContain('stroke="#0000FF"')
    }
  )
})
