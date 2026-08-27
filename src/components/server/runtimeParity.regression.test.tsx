import { TextDecoder, TextEncoder } from "util"
import * as React from "react"
import { describe, expect, it } from "vitest"
import {
  renderChart,
  renderChartWithEvidence,
  renderNetworkToStaticSVG,
  renderOrdinalToStaticSVG,
  renderXYToStaticSVG,
} from "./renderToStaticSVG"
import { buildRealtimeEdges } from "./staticNetwork"
import { getSequentialInterpolator } from "../charts/shared/colorPalettes"

Object.assign(globalThis, { TextEncoder, TextDecoder })

describe("static/runtime parity regressions", () => {
  it("honors custom x/y accessors in streaming XY mode", () => {
    const svg = renderXYToStaticSVG({
      chartType: "scatter",
      runtimeMode: "streaming",
      data: [{ a: 2, b: 3 }],
      xAccessor: "a",
      yAccessor: "b",
      size: [300, 200],
    })
    expect(svg).toContain("<circle")
  })

  it("normalizes grouped lineDataAccessor input for static and direct SSR ingestion", () => {
    const svg = renderXYToStaticSVG({
      chartType: "line",
      data: [
        {
          label: "alpha",
          coordinates: [{ t: 0, v: 1 }, { t: 1, v: 3 }],
        },
        {
          label: "beta",
          coordinates: [{ t: 0, v: 3 }, { t: 1, v: 1 }],
        },
      ],
      lineDataAccessor: "coordinates",
      xAccessor: "t",
      yAccessor: "v",
      size: [300, 200],
    })
    expect(svg.match(/<path d=/g)).toHaveLength(2)
  })

  it("forwards streaming heatmap binning and aggregation", () => {
    const svg = renderXYToStaticSVG({
      chartType: "heatmap",
      runtimeMode: "streaming",
      data: [
        { x: 0, y: 0 },
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
        { x: 0.3, y: 0.3 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      heatmapAggregation: "count",
      heatmapXBins: 1,
      heatmapYBins: 1,
      showValues: true,
      size: [240, 180],
    })
    expect(svg).toContain(">4</text>")
    expect(svg).toContain(
      `fill="${getSequentialInterpolator("blues")(128 / 255)}"`
    )
  })

  it("forwards FlowMap flowStyle to the static geo pipeline", () => {
    const props = {
      nodes: [
        { id: "A", lon: -80, lat: 20 },
        { id: "B", lon: 80, lat: 40 },
      ],
      flows: [{ source: "A", target: "B", value: 1 }],
      nodeIdAccessor: "id",
      xAccessor: "lon",
      yAccessor: "lat",
      width: 400,
      height: 260,
    }
    const basic = renderChart("FlowMap", { ...props, flowStyle: "basic" })
    const arc = renderChart("FlowMap", { ...props, flowStyle: "arc" })
    expect(arc).not.toBe(basic)
  })

  it("preserves a numeric zero network edge value", () => {
    const [edge] = buildRealtimeEdges(
      [{ source: "a", target: "b", weight: 0 }],
      { chartType: "sankey", valueAccessor: "weight" }
    )
    expect(edge.value).toBe(0)
  })

  it("renders OrbitDiagram through the static chart registry", () => {
    const { svg, evidence } = renderChartWithEvidence("OrbitDiagram", {
      data: {
        name: "root",
        children: [{ name: "a" }, { name: "b" }],
      },
      animated: false,
      width: 320,
      height: 320,
    })
    expect(svg).toContain("<circle")
    expect(evidence.nodeCount).toBeGreaterThan(0)
  })

  it("renders a normal empty OrbitDiagram result when hierarchy data is missing", () => {
    const { svg, evidence } = renderChartWithEvidence("OrbitDiagram", {})
    expect(svg).toContain("<svg")
    expect(evidence.empty).toBe(true)
    expect(evidence.nodeCount).toBe(0)
  })

  it("keeps frame graphics and custom annotations when static scenes are empty", () => {
    const graphics = {
      backgroundGraphics: <g id="empty-background" />,
      foregroundGraphics: <g id="empty-foreground" />,
      annotations: [{ x: 10, y: 10 }],
      svgAnnotationRules: () => <text>empty-annotation</text>,
    }
    const svgs = [
      renderXYToStaticSVG({ chartType: "scatter", data: [], ...graphics }),
      renderOrdinalToStaticSVG({ chartType: "bar", data: [], ...graphics }),
      renderNetworkToStaticSVG({ chartType: "force", nodes: [], edges: [], ...graphics }),
    ]
    for (const svg of svgs) {
      expect(svg).toContain('id="empty-background"')
      expect(svg).toContain('id="empty-foreground"')
      expect(svg).toContain("empty-annotation")
    }
  })

  it("keeps axes when an empty XY scene has explicit domains", () => {
    const svg = renderXYToStaticSVG({
      chartType: "scatter",
      data: [],
      xExtent: [0, 10],
      yExtent: [0, 100],
      showAxes: true,
      size: [300, 200],
    })

    expect(svg).toContain('id="axes"')
    expect(svg).toContain(">100</text>")
  })

  it("keeps radial ordinal background graphics at the plot origin", () => {
    const svg = renderOrdinalToStaticSVG({
      chartType: "donut",
      projection: "radial",
      data: [{ category: "A", value: 1 }],
      oAccessor: "category",
      rAccessor: "value",
      backgroundGraphics: <rect id="radial-background" x={0} y={0} width={20} height={20} />,
      size: [300, 240],
    })
    // Direct static frames now share the live ordinal chrome-safe margin, so
    // the absolute radial center and counter-transform use that same plot.
    expect(svg).toContain('transform="translate(165,115)"')
    expect(svg).toContain(
      '<g transform="translate(-95,-65)"><rect id="radial-background"'
    )
  })

  it("inserts gauge overlays before the outer SVG close when center content contains SVG", () => {
    const svg = renderChart("GaugeChart", {
      value: 50,
      centerContent: (
        <svg data-testid="nested-center-svg">
          <circle cx={1} cy={1} r={1} />
        </svg>
      ),
      width: 300,
      height: 250,
    })
    const nestedClose = svg.indexOf("</svg>")
    const needle = svg.lastIndexOf('stroke-linecap="round"')
    const outerClose = svg.lastIndexOf("</svg>")
    expect(nestedClose).toBeGreaterThan(-1)
    expect(needle).toBeGreaterThan(nestedClose)
    expect(outerClose).toBeGreaterThan(needle)
  })

  it("keeps SVG Gauge center text out of foreignObject", () => {
    const svg = renderChart("GaugeChart", {
      value: 50,
      centerContent: <text fill="#124">50%</text>,
      width: 300,
      height: 250,
    })

    expect(svg).toContain('class="semiotic-radial-center-content"')
    expect(svg).toContain('<text fill="#124" x="0" y="0"')
    expect(svg).not.toContain("<foreignObject")
  })
})
