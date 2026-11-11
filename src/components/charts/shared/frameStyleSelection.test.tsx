/**
 * A style passed through `frameProps` takes the place of the chart's own mark
 * style. These tests pin that it keeps the chart's selection dimming, one chart
 * per family, and that a chart at rest still hands the frame exactly the
 * caller's fields.
 */
import type {
  CapturedGeoFrameProps,
  CapturedNetworkFrameProps,
  CapturedOrdinalFrameProps,
  CapturedXYFrameProps,
} from "../../../test-utils/capturedFrameProps"
import { beforeEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { act, render } from "@testing-library/react"
import type { Datum } from "./datumTypes"
import type { AreasProp } from "../../geo/useReferenceAreas"
import { TooltipProvider } from "../../store/TooltipStore"
import { LinkedCharts, useSelection, type UseSelectionResult } from "../../LinkedCharts"
import { renderChart } from "../../server/renderToStaticSVG"
import { Scatterplot } from "../xy/Scatterplot"
import { LineChart } from "../xy/LineChart"
import { BoxPlot } from "../ordinal/BoxPlot"
import { RadarChart } from "../ordinal/RadarChart"
import { ForceDirectedGraph } from "../network/ForceDirectedGraph"
import { ProportionalSymbolMap } from "../geo/ProportionalSymbolMap"

let xyProps = {} as CapturedXYFrameProps
let ordinalProps = {} as CapturedOrdinalFrameProps
let networkProps = {} as CapturedNetworkFrameProps
let geoProps = {} as CapturedGeoFrameProps

vi.mock("../../stream/StreamXYFrame", () => ({
  __esModule: true,
  default: React.forwardRef<unknown, CapturedXYFrameProps>((props, _ref) => {
    xyProps = props
    return <div className="stream-xy-frame" />
  }),
}))
vi.mock("../../stream/StreamOrdinalFrame", () => ({
  __esModule: true,
  default: React.forwardRef<unknown, CapturedOrdinalFrameProps>((props, _ref) => {
    ordinalProps = props
    return <div className="stream-ordinal-frame" />
  }),
}))
vi.mock("../../stream/StreamNetworkFrame", () => ({
  __esModule: true,
  default: React.forwardRef<unknown, CapturedNetworkFrameProps>((props, _ref) => {
    networkProps = props
    return <div className="stream-network-frame" />
  }),
}))
vi.mock("../../stream/StreamGeoFrame", () => ({
  __esModule: true,
  default: React.forwardRef<unknown, CapturedGeoFrameProps>((props, _ref) => {
    geoProps = props
    return <div className="stream-geo-frame" />
  }),
}))
vi.mock("../../geo/useReferenceAreas", () => ({
  useReferenceAreas: (areas: AreasProp) => areas,
}))

type Emitter = Pick<UseSelectionResult, "selectPoints">

function SelectionEmitter({ emitRef }: { emitRef: React.MutableRefObject<Emitter> }) {
  const { selectPoints } = useSelection({ name: "linked", fields: ["region"] })
  emitRef.current = { selectPoints }
  return null
}

/** Render `chart` inside LinkedCharts and return a way to select `region: east`. */
function renderLinked(chart: React.ReactElement) {
  const emitRef = { current: null as unknown as Emitter }
  render(
    <TooltipProvider>
      <LinkedCharts showLegend={false}>
        <SelectionEmitter emitRef={emitRef} />
        {chart}
      </LinkedCharts>
    </TooltipProvider>,
  )
  return () => act(() => emitRef.current.selectPoints({ region: ["east"] }))
}

const styleOf = (style: unknown, ...args: unknown[]): Datum =>
  (style as (...styleArgs: unknown[]) => Datum)(...args)

const points = [
  { x: 1, y: 10, region: "east" },
  { x: 2, y: 20, region: "west" },
]

beforeEach(() => {
  xyProps = {} as CapturedXYFrameProps
  ordinalProps = {} as CapturedOrdinalFrameProps
  networkProps = {} as CapturedNetworkFrameProps
  geoProps = {} as CapturedGeoFrameProps
})

describe("frameProps styles keep linked selection", () => {
  it("XY — Scatterplot frameProps.pointStyle", () => {
    const selectEast = renderLinked(
      <Scatterplot
        data={points}
        xAccessor="x"
        yAccessor="y"
        selection={{ name: "linked" }}
        frameProps={{ pointStyle: () => ({ fill: "gold", r: 12 }) }}
      />,
    )

    // At rest the frame receives exactly the caller's fields: none of the
    // chart's base fields (fillOpacity, default radius) leak in.
    expect(styleOf(xyProps.pointStyle, points[0])).toEqual({ fill: "gold", r: 12 })
    expect(styleOf(xyProps.pointStyle, points[1])).toEqual({ fill: "gold", r: 12 })

    selectEast()

    expect(styleOf(xyProps.pointStyle, points[0])).toEqual({ fill: "gold", r: 12 })
    const dimmed = styleOf(xyProps.pointStyle, points[1])
    expect(dimmed).toMatchObject({ fill: "gold", r: 12 })
    expect(dimmed.opacity).toBeLessThan(1)
  })

  it("XY — LineChart frameProps.lineStyle keeps the series group argument", () => {
    const selectEast = renderLinked(
      <LineChart
        data={points}
        xAccessor="x"
        yAccessor="y"
        lineBy="region"
        selection={{ name: "linked" }}
        frameProps={{ lineStyle: (_d: Datum, group?: string) => ({ stroke: `series-${group}` }) }}
      />,
    )
    expect(styleOf(xyProps.lineStyle, points[1], "west")).toEqual({ stroke: "series-west" })

    selectEast()

    expect(styleOf(xyProps.lineStyle, points[0], "east")).toEqual({ stroke: "series-east" })
    const dimmed = styleOf(xyProps.lineStyle, points[1], "west")
    expect(dimmed.stroke).toBe("series-west")
    expect(dimmed.opacity).toBeLessThan(1)
  })

  it("XY — an object-form lineStyle reaches the frame unchanged", () => {
    const lineStyle = { stroke: "teal", strokeWidth: 3 }
    renderLinked(
      <LineChart
        data={points}
        xAccessor="x"
        yAccessor="y"
        selection={{ name: "linked" }}
        frameProps={{ lineStyle }}
      />,
    )
    expect(xyProps.lineStyle).toBe(lineStyle)
  })

  it("ordinal — BoxPlot frameProps.summaryStyle", () => {
    const rows = [
      { region: "east", value: 4 },
      { region: "east", value: 9 },
      { region: "west", value: 6 },
      { region: "west", value: 2 },
    ]
    const selectEast = renderLinked(
      <BoxPlot
        data={rows}
        categoryAccessor="region"
        valueAccessor="value"
        selection={{ name: "linked" }}
        frameProps={{ summaryStyle: () => ({ fill: "gold" }) }}
      />,
    )
    expect(styleOf(ordinalProps.summaryStyle, { region: "west" }, "west")).toEqual({ fill: "gold" })

    selectEast()

    expect(styleOf(ordinalProps.summaryStyle, { region: "east" }, "east")).toEqual({ fill: "gold" })
    const dimmed = styleOf(ordinalProps.summaryStyle, { region: "west" }, "west")
    expect(dimmed.fill).toBe("gold")
    expect(dimmed.opacity).toBeLessThan(1)
  })

  it("network — ForceDirectedGraph frameProps.nodeStyle and edgeStyle", () => {
    const nodes = [
      { id: "a", region: "east" },
      { id: "b", region: "west" },
      { id: "c", region: "west" },
    ]
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ]
    const selectEast = renderLinked(
      <ForceDirectedGraph
        nodes={nodes}
        edges={edges}
        selection={{ name: "linked" }}
        frameProps={{
          nodeStyle: () => ({ fill: "gold" }),
          edgeStyle: () => ({ stroke: "gold" }),
        }}
      />,
    )
    const east = { id: "a", data: nodes[0] }
    const west = { id: "b", data: nodes[1] }
    const farWest = { id: "c", data: nodes[2] }
    expect(styleOf(networkProps.nodeStyle, west)).toEqual({ fill: "gold" })
    expect(styleOf(networkProps.edgeStyle, { source: west, target: farWest })).toEqual({ stroke: "gold" })

    selectEast()

    expect(styleOf(networkProps.nodeStyle, east)).toEqual({ fill: "gold" })
    const dimmedNode = styleOf(networkProps.nodeStyle, west)
    expect(dimmedNode.fill).toBe("gold")
    expect(dimmedNode.opacity).toBeLessThan(1)
    // An edge stays emphasized while either endpoint is selected.
    expect(styleOf(networkProps.edgeStyle, { source: east, target: west })).toEqual({ stroke: "gold" })
    const dimmedEdge = styleOf(networkProps.edgeStyle, { source: west, target: farWest })
    expect(dimmedEdge.stroke).toBe("gold")
    expect(dimmedEdge.opacity).toBeLessThan(1)
  })

  it("geo — ProportionalSymbolMap frameProps.pointStyle", () => {
    const cities = [
      { id: "Boston", lon: -71.06, lat: 42.36, population: 650000, region: "east" },
      { id: "Portland", lon: -122.68, lat: 45.52, population: 640000, region: "west" },
    ]
    const selectEast = renderLinked(
      <ProportionalSymbolMap
        points={cities}
        sizeBy="population"
        selection={{ name: "linked" }}
        frameProps={{ pointStyle: () => ({ fill: "gold", r: 7 }) }}
      />,
    )
    expect(styleOf(geoProps.pointStyle, cities[1])).toEqual({ fill: "gold", r: 7 })

    selectEast()

    expect(styleOf(geoProps.pointStyle, cities[0])).toEqual({ fill: "gold", r: 7 })
    const dimmed = styleOf(geoProps.pointStyle, cities[1])
    expect(dimmed).toMatchObject({ fill: "gold", r: 7 })
    expect(dimmed.opacity).toBeLessThan(1)
  })

  it("hands the frame the caller's own function when the chart has no selection", () => {
    const pointStyle = () => ({ fill: "gold", r: 12 })
    render(
      <TooltipProvider>
        <Scatterplot data={points} xAccessor="x" yAccessor="y" frameProps={{ pointStyle }} />
      </TooltipProvider>,
    )
    expect(styleOf(xyProps.pointStyle, points[0])).toEqual({ fill: "gold", r: 12 })
  })
})

describe("RadarChart frameProps.connectorStyle", () => {
  const radar = [
    { name: "A", attribute: "speed", value: 80 },
    { name: "A", attribute: "power", value: 40 },
    { name: "A", attribute: "range", value: 60 },
    { name: "B", attribute: "speed", value: 55 },
    { name: "B", attribute: "power", value: 70 },
    { name: "B", attribute: "range", value: 45 },
  ]
  const radarProps = {
    data: radar,
    categoryAccessor: "attribute",
    valueAccessor: "value",
    seriesAccessor: "name",
    colorBy: "name",
    width: 400,
    height: 400,
  } as const

  it("layers over the series outline instead of being dropped", () => {
    render(
      <TooltipProvider>
        <RadarChart {...radarProps} />
      </TooltipProvider>,
    )
    const outline = styleOf(ordinalProps.connectorStyle, radar[0])
    expect(outline).toMatchObject({ fillOpacity: 0.15, strokeWidth: 2, opacity: 0.7 })
    expect(typeof outline.stroke).toBe("string")

    render(
      <TooltipProvider>
        <RadarChart
          {...radarProps}
          frameProps={{ connectorStyle: { strokeWidth: 5, strokeDasharray: "4 2" } }}
        />
      </TooltipProvider>,
    )
    expect(styleOf(ordinalProps.connectorStyle, radar[0])).toEqual({
      ...outline,
      strokeWidth: 5,
      strokeDasharray: "4 2",
    })
  })

  it("accepts the function form", () => {
    render(
      <TooltipProvider>
        <RadarChart
          {...radarProps}
          frameProps={{ connectorStyle: (d: Datum) => ({ strokeWidth: d.name === "A" ? 6 : 1 }) }}
        />
      </TooltipProvider>,
    )
    expect(styleOf(ordinalProps.connectorStyle, radar[0]).strokeWidth).toBe(6)
    expect(styleOf(ordinalProps.connectorStyle, radar[3]).strokeWidth).toBe(1)
    expect(styleOf(ordinalProps.connectorStyle, radar[3]).fillOpacity).toBe(0.15)
  })

  it("renders the same layering through renderChart", () => {
    const plain = renderChart("RadarChart", radarProps)
    const styled = renderChart("RadarChart", {
      ...radarProps,
      frameProps: { connectorStyle: { strokeWidth: 5 } },
    })
    expect(plain).toContain('stroke-width="2"')
    expect(styled).toContain('stroke-width="5"')
    // The outline keeps its series fill wash; only the layered field changed.
    // Element ids are derived from the config, so compare with them removed.
    const withoutIds = (svg: string) => svg.replace(/semiotic-[a-z0-9]+-/g, "semiotic-")
    expect(styled).toContain('fill-opacity="0.15"')
    expect(withoutIds(styled.replaceAll('stroke-width="5"', 'stroke-width="2"'))).toBe(withoutIds(plain))
  })
})
