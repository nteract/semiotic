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
  describe(`${entry} nested series and default gaps`, () => {
    it.each(["coordinates", "points"])("renders nested %s without statistical overlays", (lineDataAccessor) => {
      const data = ["A", "B"].map((label, i) => ({
        label, [lineDataAccessor]: [{ x: 0, y: 10 + i }, { x: 1, y: 20 + i }],
      }))
      const { svg, evidence } = renderer.renderChartWithEvidence("LineChart", {
        data, lineDataAccessor, lineBy: (d: Datum) => d.label,
        colorScheme: { A: "#123456", B: "#654321" }, ...size,
      })
      expect(evidence.status).toBe("ok")
      expect(evidence.markCountByType.line).toBe(2)
      expect(svg).toContain('stroke="#123456"')
      expect(svg).toContain('stroke="#654321"')
    })

    it("breaks missing values by default without a baseline dip", () => {
      const { evidence } = renderer.renderChartWithEvidence("LineChart", {
        data: [10, 11, null, 12, 13].map((y, x) => ({ x, y })), ...size,
      })
      expect(evidence.markCountByType.line).toBe(2)
      expect(evidence.yDomain![0]).toBeGreaterThan(0)
    })

    it.each(["LineChart", "AreaChart"])("forecasts nested %s coordinates through callback accessors", (component) => {
      const { svg, evidence } = renderer.renderChartWithEvidence(component, {
        data: [{ label: "A", points: Array.from({ length: 5 }, (_, t) => ({ t, value: 10 + 5 * t })) }],
        lineDataAccessor: "points", lineBy: "label", areaBy: "label",
        xAccessor: (d: Datum) => d.t, yAccessor: (d: Datum) => d.value,
        forecast: { trainEnd: 3, steps: 2 }, ...size,
      })
      expect(evidence.status).toBe("ok")
      expect(evidence.xDomain![1]).toBeGreaterThanOrEqual(6)
      expect(evidence.yDomain![1]).toBeGreaterThanOrEqual(40)
      expect(svg).not.toContain("NaN")
    })
  })

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
    it("marks nested area coordinates before building the overlay", () => {
      const svg = renderer.renderChart("AreaChart", {
        data: [{ label: "Measurements", coordinates: flat }], areaBy: "label",
        xAccessor: (d: Datum) => d.x, yAccessor: (d: Datum) => d.y,
        anomaly: { threshold: 2, anomalyColor: "#AA0011" }, ...size,
      })
      expect(dotsFilled(svg, "#AA0011")).toHaveLength(1)
    })

    it.each(["coordinates", "points"])("marks nested %s after zero filling", (lineDataAccessor) => {
      const coordinates = [10, 10, 10, 10, null].map((y, x) => ({ x, y }))
      const parent = { label: "Measurements", [lineDataAccessor]: coordinates }
      const props = {
        data: [parent], lineDataAccessor, lineBy: (d: Datum) => d.label,
        xAccessor: (d: Datum) => d.x, yAccessor: (d: Datum) => d.y,
        gapStrategy: "zero" as const, anomaly: { threshold: 1.5, anomalyColor: "#AA0011" },
      }
      const rows = prepareLineSeriesForSsr(props).data
      const marked = rows.filter((row) => row[ANOMALY_FIELD])
      expect(marked).toHaveLength(1)
      expect(marked[0]).toMatchObject({ x: 4, __semiotic_resolvedY: 0 })
      expect(marked[0].parentLine).toBe(parent)
      const svg = renderer.renderChart("LineChart", { ...props, ...size })
      expect(dotsFilled(svg, "#AA0011")).toHaveLength(1)
      expect(coordinates[4].y).toBeNull()
    })

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
