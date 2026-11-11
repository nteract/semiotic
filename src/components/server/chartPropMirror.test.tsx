/**
 * Props the React chart components forward to their frame must reach the same
 * frame through `renderChart`. Each case below was honored on the client and
 * silently dropped by the static chart config: the React path changed its
 * frame props while the static SVG came back identical to an unstyled render.
 *
 * Every case asserts both paths, so a prop cannot regress on one alone.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { cleanup, render } from "@testing-library/react"
import type { Datum } from "../charts/shared/datumTypes"
import type { AreasProp } from "../geo/useReferenceAreas"
import { TooltipProvider } from "../store/TooltipStore"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"
import { BarChart } from "../charts/ordinal/BarChart"
import { StackedBarChart } from "../charts/ordinal/StackedBarChart"
import { GroupedBarChart } from "../charts/ordinal/GroupedBarChart"
import { BoxPlot } from "../charts/ordinal/BoxPlot"
import { SwimlaneChart } from "../charts/ordinal/SwimlaneChart"
import { ChordDiagram } from "../charts/network/ChordDiagram"
import { TreeDiagram } from "../charts/network/TreeDiagram"
import { DifferenceChart } from "../charts/xy/DifferenceChart"
import { ChoroplethMap } from "../charts/geo/ChoroplethMap"
import { ProportionalSymbolMap } from "../charts/geo/ProportionalSymbolMap"
import { FlowMap } from "../charts/geo/FlowMap"
import { DistanceCartogram } from "../charts/geo/DistanceCartogram"

const frames = vi.hoisted(() => ({ last: {} as Record<string, unknown> }))

vi.mock("../stream/StreamXYFrame", async () => {
  const R = await import("react")
  return { __esModule: true, default: R.forwardRef((props: Record<string, unknown>, _ref) => { frames.last = props; return R.createElement("div") }) }
})
vi.mock("../stream/StreamOrdinalFrame", async () => {
  const R = await import("react")
  return { __esModule: true, default: R.forwardRef((props: Record<string, unknown>, _ref) => { frames.last = props; return R.createElement("div") }) }
})
vi.mock("../stream/StreamNetworkFrame", async () => {
  const R = await import("react")
  return { __esModule: true, default: R.forwardRef((props: Record<string, unknown>, _ref) => { frames.last = props; return R.createElement("div") }) }
})
vi.mock("../stream/StreamGeoFrame", async () => {
  const R = await import("react")
  return { __esModule: true, default: R.forwardRef((props: Record<string, unknown>, _ref) => { frames.last = props; return R.createElement("div") }) }
})
vi.mock("../geo/useReferenceAreas", () => ({
  useReferenceAreas: (areas: AreasProp) => areas,
}))

type Props = Record<string, unknown>
/** The chart components are generic over their datum; the cases here pass plain records. */
const asComponent = (component: unknown) => component as React.ComponentType<Props>
type ChartName = Parameters<typeof renderChart>[0]

/** Frame props the React component hands its Stream Frame. */
function clientFrame(Component: React.ComponentType<Props>, props: Props): Props {
  frames.last = {}
  render(
    <TooltipProvider>
      <Component {...props} />
    </TooltipProvider>,
  )
  cleanup()
  return frames.last
}

/** Static SVG with the config-derived element ids removed. */
function serverSVG(chart: string, props: Props): string {
  return renderChart(chart as ChartName, props as never).replace(/semiotic-[a-z0-9]+-/g, "semiotic-")
}

const styleOf = (style: unknown, ...args: unknown[]): Datum =>
  (style as (...styleArgs: unknown[]) => Datum)(...args)

const green = "#00ff00"

const bars = [
  { region: "east", segment: "a", value: 12 },
  { region: "east", segment: "b", value: 7 },
  { region: "west", segment: "a", value: 9 },
  { region: "west", segment: "b", value: 4 },
]
const barProps = { data: bars, categoryAccessor: "region", valueAccessor: "value" }

const distribution = [
  { group: "a", value: 2 }, { group: "a", value: 4 }, { group: "a", value: 5 }, { group: "a", value: 9 },
  { group: "b", value: 3 }, { group: "b", value: 6 }, { group: "b", value: 7 }, { group: "b", value: 8 },
]

const flows = [
  { source: "A", target: "B", value: 5 },
  { source: "B", target: "C", value: 3 },
  { source: "C", target: "A", value: 2 },
]
const renamedFlows = flows.map(({ source, target, value }) => ({ from: source, to: target, value }))

const square = (id: string, x: number, value: number) => ({
  type: "Feature" as const,
  id,
  properties: { name: id, value },
  geometry: {
    type: "Polygon" as const,
    coordinates: [[[x, 0], [x + 10, 0], [x + 10, 10], [x, 10], [x, 0]]],
  },
})
const areas = [square("west", -20, 3), square("east", 5, 9)]
const cities = [
  { city: "Alpha", lon: -15, lat: 5, magnitude: 4 },
  { city: "Beta", lon: 10, lat: 5, magnitude: 9 },
  { city: "Gamma", lon: 0, lat: 8, magnitude: 6 },
]
const routes = [
  { source: "Alpha", target: "Beta", value: 5 },
  { source: "Beta", target: "Gamma", value: 2 },
]

beforeEach(() => {
  frames.last = {}
})

describe("ordinal props reach the static frame", () => {
  it.each([
    ["BarChart", BarChart, barProps],
    ["StackedBarChart", StackedBarChart, { ...barProps, stackBy: "segment" }],
    ["GroupedBarChart", GroupedBarChart, { ...barProps, groupBy: "segment" }],
  ] as unknown as Array<[string, React.ComponentType<Props>, Props]>)("%s baselinePadding", (chart, Component, props) => {
    expect(clientFrame(Component, { ...props, baselinePadding: true }).baselinePadding).toBe(true)
    expect(serverSVG(chart, { ...props, baselinePadding: true })).not.toBe(serverSVG(chart, props))
  })

  it("BoxPlot categoryPadding", () => {
    const props = { data: distribution, categoryAccessor: "group", valueAccessor: "value" }
    expect(clientFrame(asComponent(BoxPlot), { ...props, categoryPadding: 60 }).barPadding).toBe(60)
    expect(serverSVG("BoxPlot", { ...props, categoryPadding: 60 })).not.toBe(serverSVG("BoxPlot", props))
    // The unset default is untouched on the static path.
    expect(serverSVG("BoxPlot", { ...props, categoryPadding: undefined })).toBe(serverSVG("BoxPlot", props))
  })

  it("BoxPlot outlierRadius", () => {
    const data = [...distribution, { group: "a", value: 60 }, { group: "b", value: -40 }]
    const props = { data, categoryAccessor: "group", valueAccessor: "value" }
    expect(clientFrame(asComponent(BoxPlot), { ...props, outlierRadius: 7 }).outlierRadius).toBe(7)
    // Unset, the component adds no key and the scene keeps its 3px default.
    expect("outlierRadius" in clientFrame(asComponent(BoxPlot), props)).toBe(false)
    const styled = serverSVG("BoxPlot", { ...props, outlierRadius: 7 })
    expect(styled).not.toBe(serverSVG("BoxPlot", props))
    expect(styled).toContain('r="7"')
    expect(serverSVG("BoxPlot", { ...props, outlierRadius: 3 })).toBe(serverSVG("BoxPlot", props))
  })

  it("SwimlaneChart rTickValues", () => {
    const props = {
      data: [
        { lane: "plan", phase: "draft", value: 4 },
        { lane: "plan", phase: "review", value: 3 },
        { lane: "build", phase: "draft", value: 6 },
      ],
      categoryAccessor: "lane",
      subcategoryAccessor: "phase",
      valueAccessor: "value",
    }
    const ticks = [0, 7]
    expect(clientFrame(asComponent(SwimlaneChart), { ...props, rTickValues: ticks }).rTickValues).toEqual(ticks)
    expect(serverSVG("SwimlaneChart", { ...props, rTickValues: ticks })).not.toBe(serverSVG("SwimlaneChart", props))
  })
})

describe("network props reach the static frame", () => {
  it("ChordDiagram sourceAccessor and targetAccessor", () => {
    const renamed = { edges: renamedFlows, sourceAccessor: "from", targetAccessor: "to", valueAccessor: "value" }
    const frame = clientFrame(asComponent(ChordDiagram), renamed)
    expect(frame.sourceAccessor).toBe("from")
    expect(frame.targetAccessor).toBe("to")

    // Renamed endpoint fields used to render an empty chord on the static path.
    expect(renderChartWithEvidence("ChordDiagram", renamed as never).evidence.empty).toBe(false)
    expect(serverSVG("ChordDiagram", renamed)).toBe(
      serverSVG("ChordDiagram", { edges: flows, valueAccessor: "value" }),
    )
  })

  it("ChordDiagram sortGroups and nodeLabel", () => {
    const props = { edges: flows, valueAccessor: "value" }
    const sortGroups = (a: number, b: number) => a - b
    expect(clientFrame(asComponent(ChordDiagram), { ...props, sortGroups }).sortGroups).toBe(sortGroups)
    expect(serverSVG("ChordDiagram", { ...props, sortGroups })).not.toBe(serverSVG("ChordDiagram", props))

    const nodeLabel = (d: Datum) => `group ${d.id}`
    const labelled = { ...props, showLabels: true, nodeLabel }
    expect(clientFrame(asComponent(ChordDiagram), labelled).nodeLabel).toBe(nodeLabel)
    expect(serverSVG("ChordDiagram", labelled)).toContain("group A")
  })

  it("TreeDiagram nodeSize", () => {
    const props = { data: { name: "root", children: [{ name: "a" }, { name: "b" }] } }
    expect(clientFrame(asComponent(TreeDiagram), { ...props, nodeSize: 14 }).nodeSize).toBe(14)
    const plain = serverSVG("TreeDiagram", props)
    const sized = serverSVG("TreeDiagram", { ...props, nodeSize: 14 })
    expect(plain).not.toContain('r="14"')
    expect(sized).toContain('r="14"')
  })
})

describe("XY props reach the static frame", () => {
  it("DifferenceChart showPoints and pointRadius", () => {
    const props = {
      data: [
        { x: 0, actual: 12, target: 10 },
        { x: 1, actual: 14, target: 16 },
        { x: 2, actual: 19, target: 15 },
      ],
      xAccessor: "x",
      seriesAAccessor: "actual",
      seriesBAccessor: "target",
    }
    const frame = clientFrame(asComponent(DifferenceChart), { ...props, showPoints: true, pointRadius: 9 })
    expect(styleOf(frame.pointStyle, { __diffWinner: "A" }).r).toBe(9)

    const plain = serverSVG("DifferenceChart", props)
    const dotted = serverSVG("DifferenceChart", { ...props, showPoints: true, pointRadius: 9 })
    expect(plain).not.toContain('r="9"')
    expect(dotted).toContain('r="9"')
    // Default radius matches the HOC's 3.
    expect(serverSVG("DifferenceChart", { ...props, showPoints: true })).toContain('r="3"')
  })
})

describe("geo charts honor top-level primitive styling on the static path", () => {
  const primitives = { stroke: green, strokeWidth: 6, opacity: 0.4 }
  const cases: Array<[string, React.ComponentType<Props>, Props, string]> = [
    ["ChoroplethMap", asComponent(ChoroplethMap), { areas, valueAccessor: (d: Datum) => d.properties.value }, "areaStyle"],
    ["ProportionalSymbolMap", asComponent(ProportionalSymbolMap), { points: cities, xAccessor: "lon", yAccessor: "lat", sizeBy: "magnitude" }, "pointStyle"],
    ["FlowMap", asComponent(FlowMap), { nodes: cities, flows: routes, nodeIdAccessor: "city", xAccessor: "lon", yAccessor: "lat", valueAccessor: "value" }, "lineStyle"],
    ["DistanceCartogram", asComponent(DistanceCartogram), { points: cities, nodeIdAccessor: "city", xAccessor: "lon", yAccessor: "lat", center: "Alpha", costAccessor: "magnitude" }, "pointStyle"],
  ]

  it.each(cases)("%s stroke, strokeWidth, and opacity", (chart, Component, props, styleKey) => {
    const sample = chart === "ChoroplethMap" ? areas[0] : chart === "FlowMap" ? routes[0] : cities[1]
    const frame = clientFrame(Component, { ...props, ...primitives })
    expect(styleOf(frame[styleKey], sample)).toMatchObject(primitives)

    expect(renderChartWithEvidence(chart as ChartName, props as never).evidence.empty).toBe(false)
    const plain = serverSVG(chart, props)
    const styled = serverSVG(chart, { ...props, ...primitives })
    expect(plain).not.toContain(green)
    expect(styled).toContain(green)
    expect(styled).toContain('stroke-width="6"')
  })

  it("FlowMap pointRadius", () => {
    const props = { nodes: cities, flows: routes, nodeIdAccessor: "city", xAccessor: "lon", yAccessor: "lat", valueAccessor: "value" }
    const frame = clientFrame(asComponent(FlowMap), { ...props, pointRadius: 11 })
    expect(styleOf(frame.pointStyle, cities[0]).r).toBe(11)
    const plain = serverSVG("FlowMap", props)
    const sized = serverSVG("FlowMap", { ...props, pointRadius: 11 })
    expect(plain).not.toContain('r="11"')
    expect(sized).toContain('r="11"')
  })
})
