import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { renderChartWithEvidence } from "./renderToStaticSVG"

const radarData = [
  { name: "A", attribute: "speed", value: 80 },
  { name: "A", attribute: "power", value: 40 },
  { name: "A", attribute: "range", value: 60 },
  { name: "B", attribute: "speed", value: 55 },
  { name: "B", attribute: "power", value: 70 },
  { name: "B", attribute: "range", value: 45 },
]

const waterfallData = [
  { step: "Start", value: 100 },
  { step: "Sales", value: 40 },
  { step: "Costs", value: -25 },
  { step: "Tax", value: -10 },
]

const cartogramPoints = [
  { id: "London", lon: -0.1, lat: 51.5, flightHours: 0 },
  { id: "Paris", lon: 2.35, lat: 48.86, flightHours: 1.2 },
  { id: "New York", lon: -74.0, lat: 40.71, flightHours: 7.5 },
]

describe("Wave 1 renderChart registry", () => {
  it("renders RadarChart as a closed radial polygon with vertices", () => {
    const { svg, evidence } = renderChartWithEvidence("RadarChart", {
      data: radarData,
      categoryAccessor: "attribute",
      valueAccessor: "value",
      seriesAccessor: "name",
      colorBy: "name",
      width: 400,
      height: 400,
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain("<circle")
    expect(svg).toMatch(/<(line|polygon)/)
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
    expect(evidence.markCountByType.point).toBe(6)
    expect(evidence.markCountByType.connector).toBeGreaterThanOrEqual(6)
  })

  it("renders WaterfallChart signed-delta bars", () => {
    const { svg, evidence } = renderChartWithEvidence("WaterfallChart", {
      data: waterfallData,
      xAccessor: "step",
      yAccessor: "value",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain("<rect")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCountByType.rect).toBe(4)
    expect(svg).toContain("Start")
  })

  it("honors MultiAxisLineChart per-series colors", () => {
    const { svg } = renderChartWithEvidence("MultiAxisLineChart", {
      data: [
        { x: 0, temp: 20, humidity: 40 },
        { x: 1, temp: 22, humidity: 55 },
        { x: 2, temp: 18, humidity: 60 },
      ],
      xAccessor: "x",
      series: [
        { yAccessor: "temp", label: "Temp", color: "#112233" },
        { yAccessor: "humidity", label: "Humidity", color: "#445566" },
      ],
      width: 400,
      height: 300,
    })
    expect(svg).toContain("#112233")
    expect(svg).toContain("#445566")
  })

  it("connects a one-series RadarChart without seriesAccessor", () => {
    const { evidence } = renderChartWithEvidence("RadarChart", {
      data: [
        { attribute: "speed", value: 80 },
        { attribute: "power", value: 40 },
        { attribute: "range", value: 60 },
      ],
      categoryAccessor: "attribute",
      valueAccessor: "value",
      width: 360,
      height: 360,
    })
    expect(evidence.markCountByType.point).toBe(3)
    expect(evidence.markCountByType.connector).toBeGreaterThanOrEqual(3)
  })

  it("renders MultiAxisLineChart dual series", () => {
    const { svg, evidence } = renderChartWithEvidence("MultiAxisLineChart", {
      data: [
        { x: 0, temp: 20, humidity: 40 },
        { x: 1, temp: 22, humidity: 55 },
        { x: 2, temp: 18, humidity: 60 },
      ],
      xAccessor: "x",
      series: [
        { yAccessor: "temp", label: "Temp" },
        { yAccessor: "humidity", label: "Humidity" },
      ],
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain("<path")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
    expect(svg).toContain("Temp")
    expect(svg).toContain("Humidity")
  })

  it("renders DistanceCartogram projected points", () => {
    const { svg, evidence } = renderChartWithEvidence("DistanceCartogram", {
      points: cartogramPoints,
      center: "London",
      costAccessor: "flightHours",
      width: 400,
      height: 300,
    })
    expect(svg).toContain("<svg")
    expect(svg).toContain("<circle")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
    const circles = [...svg.matchAll(/<circle[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"/g)]
      .map((match) => [Number(match[1]), Number(match[2])] as const)
    expect(circles.length).toBeGreaterThanOrEqual(3)
    const midX = 400 / 2
    const midY = 300 / 2
    const nearestToCenter = Math.min(
      ...circles.map(([x, y]) => Math.hypot(x - midX, y - midY)),
    )
    // Cost layout puts the named center on the plot origin, not its raw lon/lat.
    expect(nearestToCenter).toBeLessThan(40)
  })
})
