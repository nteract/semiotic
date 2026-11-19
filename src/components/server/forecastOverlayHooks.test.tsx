/**
 * The forecast boundary options and the computed-anomaly row mark reach the
 * static renderers the same way they reach the live charts.
 */
import { describe, expect, it } from "vitest"
import * as server from "../semiotic-server"
import * as edge from "../semiotic-server-edge"
import { prepareLineSeriesForSsr } from "../charts/shared/lineSeriesSsr"
import { ANOMALY_FIELD } from "../semiotic-xy"
import type { Datum } from "../charts/shared/datumTypes"

const wave: Datum[] = Array.from({ length: 30 }, (_, x) => ({
  x,
  y: 10 + x + (x % 3) + (x === 12 ? 25 : 0),
}))
// A flat series with one spike at x = 12, for the anomaly band.
const flat: Datum[] = Array.from({ length: 30 }, (_, x) => ({
  x,
  y: 40 + (x % 3) + (x === 12 ? 25 : 0),
}))
const size = { width: 400, height: 240 }

const lines = (svg: string) => svg.match(/<line\b[^>]*>/g) ?? []
const linesStroked = (svg: string, color: string) =>
  lines(svg).filter((line) => line.includes(`stroke="${color}"`))
const dotsFilled = (svg: string, color: string) =>
  (svg.match(/<circle\b[^>]*>/g) ?? []).filter((circle) => circle.includes(`fill="${color}"`))

for (const [entry, renderer] of [
  ["semiotic/server", server],
  ["semiotic/server/edge", edge],
] as const) {
  describe(`${entry} forecast boundary options`, () => {
    const render = (forecast: Record<string, unknown>) =>
      renderer.renderChart("LineChart", { data: wave, xAccessor: "x", yAccessor: "y", ...size, forecast })

    it("keeps today's boundary by default", () => {
      const svg = render({ trainEnd: 20, steps: 5 })
      const [boundary] = linesStroked(svg, "#94a3b8")
      expect(boundary).toContain('stroke-dasharray="4,2"')
      expect(svg).toMatch(/<text\b[^>]*fill="#94a3b8"[^>]*>Train \/ Forecast<\/text>/)
    })

    it("restyles and relabels the boundary", () => {
      const svg = render({
        trainEnd: 20,
        steps: 5,
        color: "#6047FF",
        boundaryColor: "#123456",
        boundaryDasharray: "2 6",
        boundaryLabel: "Fit ends",
      })
      const [boundary] = linesStroked(svg, "#123456")
      expect(boundary).toContain('stroke-dasharray="2 6"')
      expect(svg).toContain("Fit ends")
      expect(svg).not.toContain("#94a3b8")
      expect(svg).not.toContain("Train / Forecast")
    })

    it("colors the label and draws its backdrop", () => {
      const svg = render({
        trainEnd: 20,
        steps: 5,
        boundaryColor: "#123456",
        boundaryLabel: "Fit ends",
        boundaryLabelColor: "#202020",
        boundaryLabelBackground: { type: "box", fill: "#fefefe" },
      })
      expect(svg).toMatch(/<rect\b[^>]*fill="#fefefe"[^>]*>(?:(?!<\/g>)[\s\S])*<text\b[^>]*fill="#202020"[^>]*>Fit ends<\/text>/)
    })

    it("hides the label or the whole boundary", () => {
      const unlabeled = render({ trainEnd: 20, steps: 5, boundaryLabel: false })
      expect(linesStroked(unlabeled, "#94a3b8")).toHaveLength(1)
      expect(unlabeled).not.toContain("Train / Forecast")

      const hidden = render({ trainEnd: 20, steps: 5, showBoundary: false })
      expect(linesStroked(hidden, "#94a3b8")).toHaveLength(0)
      expect(hidden).not.toContain("Train / Forecast")
    })
  })

  describe(`${entry} computed anomaly marks`, () => {
    it.each([
      ["LineChart", {}],
      ["LineChart", { forecast: { trainEnd: 20, steps: 5 } }],
      ["LineChart", { lineBy: "series", forecast: { trainEnd: 20, steps: 3 } }],
      ["AreaChart", {}],
      ["Scatterplot", {}],
    ] as const)("draws a dot for each row %s marks (%j)", (component, extra) => {
      const data = "lineBy" in extra
        ? [...flat.map((row) => ({ ...row, series: "A" })), ...flat.map((row) => ({ ...row, y: 80 - (row.y as number), series: "B" }))]
        : flat
      const anomaly = { threshold: 2, anomalyColor: "#AA0011" }
      const svg = renderer.renderChart(component, { data, xAccessor: "x", yAccessor: "y", ...size, ...extra, anomaly })
      const marked = prepareLineSeriesForSsr({ data, ...extra, anomaly }).data
        .filter((row) => row[ANOMALY_FIELD] === true)
      expect(marked.length).toBeGreaterThan(0)
      expect(dotsFilled(svg, "#AA0011")).toHaveLength(marked.length)
    })
  })
}
