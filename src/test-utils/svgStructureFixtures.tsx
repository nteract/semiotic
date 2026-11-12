import * as React from "react"
import mixedArea from "../../consumer-contracts/fixtures/line-mixed-area.json"
import bars from "../../consumer-contracts/fixtures/bar-axis-exact.json"
import type { SvgStructureExpectation } from "./svgStructure"
import type { RenderChartName } from "../components/server/renderToStaticSVG"

interface StructureFixture extends SvgStructureExpectation {
  component: RenderChartName
  props: Record<string, unknown>
}

// Maintainer-derived variants of the consumer seeds and existing network/geo
// regressions. React overlays stay typed; these are not portable JSON fixtures.
export const svgStructureFixtures: StructureFixture[] = [
  {
    family: "xy",
    component: mixedArea.component as RenderChartName,
    props: {
      ...mixedArea.props,
      showAxes: true,
      showGrid: true,
      showLegend: true,
      annotations: [{ type: "y-threshold", value: 500, label: "Capacity" }]
    },
    // The area contributes its filled shape and its top-edge stroke.
    marks: { selector: "g[clip-path] path", count: 3 },
    axes: ["1", "4"],
    legend: ["Volume", "Latency"],
    annotations: ["Capacity"]
  },
  {
    family: "ordinal",
    component: bars.component as RenderChartName,
    props: {
      ...bars.props,
      colorBy: "region",
      showAxes: true,
      showLegend: true,
      annotations: [
        { type: "frame-text", position: "top-left", label: "Regional totals" }
      ]
    },
    marks: { selector: "rect[fill]", count: 3 },
    axes: ["AMER", "EMEA", "APAC", "47"],
    legend: ["AMER", "EMEA", "APAC"],
    annotations: ["Regional totals"]
  },
  {
    family: "network",
    component: "ForceDirectedGraph",
    props: {
      nodes: [
        { id: "A", group: "Input" },
        { id: "B", group: "Output" }
      ],
      edges: [{ source: "A", target: "B" }],
      colorBy: "group",
      showLegend: true,
      annotations: [
        { type: "frame-text", position: "top-left", label: "Flow direction" }
      ]
    },
    marks: { selector: "circle", count: 2 },
    axes: [],
    legend: ["Input", "Output"],
    annotations: ["Flow direction"]
  },
  {
    family: "geo",
    component: "ProportionalSymbolMap",
    props: {
      points: [
        { lon: -8, lat: 0, region: "West" },
        { lon: 8, lat: 0, region: "East" }
      ],
      areas: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-12, -4],
                [-12, 4],
                [12, 4],
                [12, -4],
                [-12, -4]
              ]
            ]
          }
        }
      ],
      colorBy: "region",
      showLegend: true,
      annotations: [
        {
          type: "callout",
          coordinates: [8, 0],
          label: "Eastern site",
          dx: 10,
          dy: -10
        }
      ]
    },
    marks: { selector: "circle[cx][cy]", count: 2 },
    axes: [],
    legend: ["West", "East"],
    annotations: ["Eastern site"]
  }
]

export function structureProps(fixture: StructureFixture, chrome = true) {
  return {
    width: 500,
    height: 320,
    ...fixture.props,
    title: `${fixture.family} composition`,
    description: `Two views of ${fixture.family} data`,
    ...(!chrome
      ? { showAxes: false, showGrid: false, showLegend: false, annotations: [] }
      : {})
  }
}

/** Exercise authored href, ARIA, inline CSS and stylesheet paint references. */
export function referenceOverlay(color: string) {
  return (
    <g xmlnsXlink="http://www.w3.org/1999/xlink">
      <defs>
        <path id="symbol" d="M0,0L8,0L4,8Z" />
        <clipPath id="window">
          <rect width={8} height={8} />
        </clipPath>
        <linearGradient id="paint">
          <stop offset={0} stopColor={color} />
          <stop offset={1} stopColor={color} />
        </linearGradient>
      </defs>
      <style>{"#swatch { stroke: url('#paint') }"}</style>
      <g aria-labelledby="label" aria-describedby="detail">
        <title id="label">Reference symbol</title>
        <desc id="detail">Local decoration</desc>
        <use href="#symbol" fill={color} />
        <use xlinkHref="#symbol" x={10} fill={color} />
        <rect
          id="swatch"
          className="reference-swatch"
          width={8}
          height={8}
          clipPath="url(#window)"
          style={{ fill: "url('#paint')" }}
        />
      </g>
    </g>
  )
}
