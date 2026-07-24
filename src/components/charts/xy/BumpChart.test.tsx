import * as React from "react"
import { render, screen } from "@testing-library/react"
import { scaleLinear } from "d3-scale"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { XYCustomChartProps } from "../custom/XYCustomChart"
import type { Datum } from "../shared/datumTypes"
import { BumpChart, rankBumpData } from "./BumpChart"
import { LIGHT_THEME, ThemeProvider } from "../../ThemeProvider"

let capturedProps: XYCustomChartProps | null = null

vi.mock("../custom/XYCustomChart", () => ({
  XYCustomChart: React.forwardRef((props: XYCustomChartProps, _ref) => {
    capturedProps = props
    return <div data-testid="xy-custom-chart" />
  }),
}))

const data = [
  { year: 2022, team: "Alpha", score: 90 },
  { year: 2022, team: "Bravo", score: 70 },
  { year: 2022, team: "Cinder", score: 50 },
  { year: 2023, team: "Alpha", score: 40 },
  { year: 2023, team: "Bravo", score: 95 },
  { year: 2023, team: "Cinder", score: 60 },
]

describe("rankBumpData", () => {
  it("ranks each x-column and retains first-seen column order", () => {
    const ranked = rankBumpData(data, {
      xAccessor: "year",
      yAccessor: "score",
      lineBy: "team",
    })

    expect(ranked.xValues).toEqual([2022, 2023])
    expect(ranked.data.filter(d => d.x === 0).map(d => [d.__bumpSeries, d.y])).toEqual([
      ["Alpha", 1],
      ["Bravo", 2],
      ["Cinder", 3],
    ])
    expect(ranked.data.filter(d => d.x === 1).map(d => [d.__bumpSeries, d.y])).toEqual([
      ["Bravo", 1],
      ["Cinder", 2],
      ["Alpha", 3],
    ])
  })

  it("supports ascending ranks and one neutral color group", () => {
    const ranked = rankBumpData(data, {
      xAccessor: "year",
      yAccessor: "score",
      lineBy: "team",
      rankDirection: "ascending",
      highlightTop: 1,
    })

    expect(ranked.data.filter(d => d.x === 0).map(d => d.__bumpSeries)).toEqual([
      "Cinder", "Bravo", "Alpha",
    ])
    expect(new Set(
      ranked.data.filter(d => !d.__bumpHighlighted).map(d => d.__bumpColorGroup),
    )).toEqual(new Set(["Other"]))
  })
})

describe("BumpChart", () => {
  beforeEach(() => {
    capturedProps = null
  })

  it("configures a custom XY layout with reversed rank extent and animation", () => {
    render(
      <BumpChart
        data={data}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        ribbon
        highlightTop={2}
        animate={{ duration: 700 }}
      />,
    )

    expect(capturedProps).not.toBeNull()
    expect(capturedProps?.xExtent).toEqual([0, 1])
    expect(capturedProps?.yExtent).toEqual([3.5, 0.5])
    expect(capturedProps?.animate).toEqual({ duration: 700 })
    expect(capturedProps?.colorBy).toBe("__bumpSeries")
    expect(capturedProps?.hoverHighlight).toBe(true)
    expect(capturedProps?.layoutConfig).toMatchObject({
      ribbon: true,
      seriesOrder: ["Alpha", "Bravo", "Cinder"],
    })
  })

  it("emits magnitude areas with stable per-series transition groups", () => {
    render(
      <BumpChart
        data={data}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        ribbon
        showLabels={false}
      />,
    )

    const layout = capturedProps?.layout
    expect(layout).toBeTypeOf("function")
    const result = layout?.({
      data: capturedProps?.data as Datum[],
      scales: {
        x: scaleLinear().domain([0, 1]).range([0, 300]),
        y: scaleLinear().domain([3.5, 0.5]).range([240, 0]),
      },
      dimensions: {
        width: 300,
        height: 240,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        plot: { x: 0, y: 0, width: 300, height: 240 },
      },
      theme: { semantic: {}, categorical: [] },
      resolveColor: series => series === "Alpha" ? "#f00" : "#00f",
      config: capturedProps?.layoutConfig ?? {},
    })

    const areas = result?.nodes?.filter(node => node.type === "area") ?? []
    expect(areas).toHaveLength(3)
    expect(areas.map(area => area.group)).toEqual(["Alpha", "Bravo", "Cinder"])
    expect(areas.every(area => area.topPath.length === area.bottomPath.length)).toBe(true)
    expect(areas.every(area => area.topPath.length === 13)).toBe(true)
  })

  it("uses stable area geometry for a principled line-to-ribbon morph", () => {
    const { rerender } = render(
      <BumpChart
        data={data}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        ribbon={false}
        lineWidth={4}
        showLabels={false}
      />,
    )

    const layoutContext = () => ({
      data: capturedProps?.data as Datum[],
      scales: {
        x: scaleLinear().domain([0, 1]).range([0, 300]),
        y: scaleLinear().domain([3.5, 0.5]).range([240, 0]),
      },
      dimensions: {
        width: 300,
        height: 240,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        plot: { x: 0, y: 0, width: 300, height: 240 },
      },
      theme: { semantic: {}, categorical: [] },
      resolveColor: () => "#f00",
      config: capturedProps?.layoutConfig ?? {},
    })
    const lineResult = capturedProps?.layout(layoutContext())
    const lineAreas = lineResult?.nodes?.filter(node => node.type === "area") ?? []
    const lineWidthAtStart = Math.hypot(
      lineAreas[0].topPath[0][0] - lineAreas[0].bottomPath[0][0],
      lineAreas[0].topPath[0][1] - lineAreas[0].bottomPath[0][1],
    )

    rerender(
      <BumpChart
        data={data}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        ribbon
        lineWidth={4}
        showLabels={false}
      />,
    )
    const ribbonResult = capturedProps?.layout(layoutContext())
    const ribbonAreas = ribbonResult?.nodes?.filter(node => node.type === "area") ?? []
    const ribbonWidthAtStart = Math.hypot(
      ribbonAreas[0].topPath[0][0] - ribbonAreas[0].bottomPath[0][0],
      ribbonAreas[0].topPath[0][1] - ribbonAreas[0].bottomPath[0][1],
    )

    expect(lineAreas.map(node => node.group)).toEqual(ribbonAreas.map(node => node.group))
    expect(lineAreas.map(node => node.topPath.length)).toEqual(
      ribbonAreas.map(node => node.topPath.length),
    )
    expect(lineWidthAtStart).toBeCloseTo(4)
    expect(ribbonWidthAtStart).toBeGreaterThan(lineWidthAtStart)
  })

  it("dims non-hovered trajectories through the custom-layout restyle channel", () => {
    render(
      <BumpChart
        data={data}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        ribbon
        showLabels={false}
      />,
    )

    const result = capturedProps?.layout({
      data: capturedProps?.data as Datum[],
      scales: {
        x: scaleLinear().domain([0, 1]).range([0, 300]),
        y: scaleLinear().domain([3.5, 0.5]).range([240, 0]),
      },
      dimensions: {
        width: 300,
        height: 240,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        plot: { x: 0, y: 0, width: 300, height: 240 },
      },
      theme: { semantic: {}, categorical: [] },
      resolveColor: () => "#f00",
      config: capturedProps?.layoutConfig ?? {},
    })
    const areas = result?.nodes?.filter(node => node.type === "area") ?? []
    const selection = {
      isActive: true,
      predicate: (datum: Datum) => datum.__bumpSeries === "Alpha",
    }

    expect(result?.restyle?.(areas.find(node => node.group === "Alpha")!, selection)).toBeUndefined()
    expect(result?.restyle?.(areas.find(node => node.group === "Bravo")!, selection)).toEqual({
      opacity: 0.14,
    })
  })

  it("uses the active theme for highlighted and neutral trajectory colors", () => {
    render(
      <ThemeProvider
        theme={{
          ...LIGHT_THEME,
          colors: {
            ...LIGHT_THEME.colors,
            categorical: ["#123456", "#abcdef"],
            textSecondary: "#778899",
          },
        }}
      >
        <BumpChart
          data={data}
          xAccessor="year"
          yAccessor="score"
          lineBy="team"
          highlightTop={1}
          showLabels={false}
          showLegend
          legendInteraction="highlight"
          legendPosition="bottom"
        />
      </ThemeProvider>,
    )

    expect(capturedProps?.colorScheme).toEqual({
      Alpha: "#778899",
      Bravo: "#123456",
      Cinder: "#778899",
    })
    expect(capturedProps?.legendInteraction).toBe("highlight")
    expect(capturedProps?.legendPosition).toBe("bottom")
  })

  it("applies style rules, frame styles, and primitive overrides in shared precedence order", () => {
    render(
      <BumpChart
        data={data}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        showLabels={false}
        showPoints
        styleRules={[{ style: { fill: "#f90", stroke: "#09f" } }]}
        stroke="#111"
        strokeWidth={4}
        opacity={0.42}
        frameProps={{
          areaStyle: () => ({ fill: "#0a0" }),
          pointStyle: () => ({ fill: "#a0a", r: 6 }),
        }}
      />,
    )

    const result = capturedProps?.layout({
      data: capturedProps?.data as Datum[],
      scales: {
        x: scaleLinear().domain([0, 1]).range([0, 300]),
        y: scaleLinear().domain([3.5, 0.5]).range([240, 0]),
      },
      dimensions: {
        width: 300,
        height: 240,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        plot: { x: 0, y: 0, width: 300, height: 240 },
      },
      theme: { semantic: { textSecondary: "#777" }, categorical: ["#f00"] },
      resolveColor: () => "#f00",
      config: capturedProps?.layoutConfig ?? {},
    })

    const area = result?.nodes?.find(node => node.type === "area")
    const point = result?.nodes?.find(node => node.type === "point")
    expect(area?.style).toMatchObject({
      fill: "#0a0",
      stroke: "#111",
      strokeWidth: 4,
      opacity: 0.42,
    })
    expect(point?.style).toMatchObject({
      fill: "#a0a",
      stroke: "#111",
      strokeWidth: 4,
      opacity: 0.42,
    })
    expect(point?.type === "point" ? point.r : undefined).toBe(6)
  })

  it("formats temporal columns and maps source x values for annotations", () => {
    const first = new Date("2024-01-01T00:00:00.000Z")
    const second = new Date("2025-01-01T00:00:00.000Z")
    const temporalData = [
      { date: first, team: "Alpha", score: 12 },
      { date: second, team: "Alpha", score: 18 },
      { date: first, team: "Bravo", score: 10 },
      { date: second, team: "Bravo", score: 20 },
    ]
    render(
      <BumpChart
        data={temporalData}
        xAccessor="date"
        yAccessor="score"
        lineBy="team"
        xFormat={value => value instanceof Date ? String(value.getUTCFullYear()) : String(value)}
        yFormat={value => `$${value}`}
        annotations={[{ type: "x-threshold", value: second, label: "Next year" }]}
        showLabels={false}
      />,
    )

    const bottomAxis = capturedProps?.frameProps?.axes?.find(axis => axis.orient === "bottom")
    expect(bottomAxis?.tickFormat?.(0, 0, [0, 1])).toBe("2024")
    expect(capturedProps?.annotations?.[0].value).toBe(1)

    const tooltip = capturedProps?.tooltip
    const firstRanked = capturedProps?.data?.[0] as Datum
    if (typeof tooltip === "function") {
      render(<>{tooltip({ data: firstRanked })}</>)
    }
    expect(screen.getByText("2024 · Rank 1")).toBeInTheDocument()
    expect(screen.getByText("Value: $12")).toBeInTheDocument()
  })
})
