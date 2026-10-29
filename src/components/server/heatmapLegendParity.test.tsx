import * as React from "react"
import { renderToString } from "react-dom/server"
import { describe, it, expect } from "vitest"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"
import { Heatmap } from "../charts/xy/Heatmap"
import { RealtimeHeatmap } from "../charts/realtime/RealtimeHeatmap"
import { DARK_THEME } from "../ThemeProvider"

function svgDocument(markup: string): Document {
  return new DOMParser().parseFromString(`<div>${markup}</div>`, "text/html")
}

// Gradient legends list their label, then the two domain ends; the React
// side legend is vertical (high first) and the static one horizontal.
function legendEnds(markup: string, label: string): string[] {
  const doc = svgDocument(markup)
  const labelNode = Array.from(doc.querySelectorAll("text")).find(
    (text) => text.textContent === label
  )
  const siblings = Array.from(labelNode?.parentElement?.children ?? [])
    .filter((node) => node.tagName.toLowerCase() === "text" && node !== labelNode)
    .map((node) => node.textContent ?? "")
  return siblings.sort((a, b) => Number(a) - Number(b))
}

// Raw values span 1000-1199. Two x bins hold three rows and one row.
const staticRows = [
  { x: 1, y: 1, value: 1000 },
  { x: 2, y: 2, value: 1100 },
  { x: 3, y: 3, value: 1150 },
  { x: 9, y: 9, value: 1199 }
]
const staticProps = {
  data: staticRows,
  width: 500,
  height: 300,
  heatmapAggregation: "count" as const,
  heatmapXBins: 2,
  heatmapYBins: 1,
  showLegend: true
}

// One time column, two value rows: counts of three and one.
const realtimeRows = [
  ...Array.from({ length: 3 }, (_, time) => ({ time, value: 1 })),
  { time: 3, value: 9 }
]
const realtimeProps = {
  data: realtimeRows,
  width: 500,
  height: 300,
  valueExtent: [0, 10] as [number, number],
  heatmapXBins: 1,
  heatmapYBins: 2,
  showLegend: true
}

describe("heatmap gradient legends in renderChart", () => {
  it.each(["Heatmap", "RealtimeHeatmap"] as const)("%s filters sparse rows before reading legend values", (component) => {
    const props = component === "Heatmap" ? staticProps : realtimeProps
    const sparseRows = new Array<(typeof props.data)[number] | null | undefined>(8)
    sparseRows[0] = null
    sparseRows[2] = undefined
    props.data.forEach((row, index) => { sparseRows[index + 4] = row })
    for (const valueAccessor of ["value", (row: { value: number }) => row.value]) {
      const { svg, evidence } = renderChartWithEvidence(component, {
        ...props,
        data: sparseRows,
        valueAccessor
      })
      expect(evidence.status).toBe("ok")
      expect(evidence.markCountByType.heatcell).toBe(2)
      expect(legendEnds(svg, component === "Heatmap" ? "value" : "count")).toEqual(["1", "3"])
    }
  })

  it("labels an aggregated Heatmap legend with the cell counts, like React", () => {
    const server = renderChart("Heatmap", staticProps)
    const react = renderToString(<Heatmap {...staticProps} />)
    expect(legendEnds(server, "value")).toEqual(["1", "3"])
    expect(legendEnds(react, "value")).toEqual(["1", "3"])
  })

  it("labels a RealtimeHeatmap legend from the drawn cells, like React", () => {
    const server = renderChart("RealtimeHeatmap", realtimeProps)
    const react = renderToString(<RealtimeHeatmap {...realtimeProps} />)
    expect(legendEnds(server, "count")).toEqual(["1", "3"])
    expect(legendEnds(react, "count")).toEqual(["1", "3"])
  })

  it("omits the gradient legend unless showLegend is set", () => {
    const server = renderChart("Heatmap", { ...staticProps, showLegend: false })
    expect(svgDocument(server).querySelector("linearGradient")).toBeNull()
  })
})

describe("RealtimeHeatmap cell separators", () => {
  function cellStrokes(markup: string): string[] {
    return Array.from(svgDocument(markup).querySelectorAll("rect[fill]"))
      .filter((rect) => rect.getAttribute("stroke-width") === "1")
      .map((rect) => rect.getAttribute("stroke") ?? "")
  }

  it("draws the canvas's 1px surface-coloured separator in server SVG", () => {
    expect(cellStrokes(renderChart("RealtimeHeatmap", realtimeProps))).toEqual([
      "#ffffff",
      "#ffffff"
    ])
    const dark = renderChart("RealtimeHeatmap", { ...realtimeProps, theme: "dark" })
    const surface = DARK_THEME.colors.surface || DARK_THEME.colors.background
    expect(cellStrokes(dark)).toEqual([surface, surface])
  })

  it("draws the same separator in React server rendering", () => {
    const react = renderToString(<RealtimeHeatmap {...realtimeProps} />)
    expect(cellStrokes(react)).toEqual([
      "var(--semiotic-surface, #fff)",
      "var(--semiotic-surface, #fff)"
    ])
  })
})
