/**
 * SSR vs CSR-first-render parity.
 *
 * Two SSR code paths exist in v3:
 *
 *   1. **`renderChart`** (`semiotic/server`) — the static-render API.
 *      The manual-placeholder pattern uses this from a Server Component
 *      to pre-generate an SVG string that the client wrapper hands off
 *      to. Goes through `renderToStaticSVG` → frame-specific SVG
 *      converters in `SceneToSVG.tsx`.
 *
 *   2. **In-frame SSR branch** — when a chart component is rendered
 *      directly (e.g. by `renderToString(<LineChart …>)` from a Server
 *      Component, or during the first client render after hydration),
 *      the frame's `if (isServerEnvironment || !hydrated)` branch
 *      produces SVG via the same `SceneToSVG` converters but through
 *      a different orchestration path.
 *
 * Both paths *should* produce equivalent output for the same input.
 * If they diverge, manual-placeholder users see one rendering and
 * auto-hydrating users see another — hydration would produce a visible
 * jump as the canvas takes over. This test gates that regression class.
 *
 * The comparison is structural, not byte-for-byte. SVG attribute
 * ordering and whitespace can differ between the two paths without
 * affecting the visual output; what we care about is the count and
 * kind of scene primitives, the data marks' fill colors, and the
 * presence/absence of legend / axes / annotations.
 */
import { describe, it, expect } from "vitest"
import * as React from "react"
import { renderToString } from "react-dom/server"
import { renderChart } from "./renderToStaticSVG"

import { LineChart } from "../charts/xy/LineChart"
import { AreaChart } from "../charts/xy/AreaChart"
import { BumpChart } from "../charts/xy/BumpChart"
import { Heatmap } from "../charts/xy/Heatmap"
import { MultiAxisLineChart } from "../charts/xy/MultiAxisLineChart"
import { WaterfallChart } from "../charts/xy/WaterfallChart"
import { BarChart } from "../charts/ordinal/BarChart"
import { PieChart } from "../charts/ordinal/PieChart"
import { RadarChart } from "../charts/ordinal/RadarChart"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import { Treemap } from "../charts/network/Treemap"
import { LIGHT_THEME, ThemeProvider } from "../ThemeProvider"

const xyData = [
  { x: 0, y: 1 },
  { x: 1, y: 4 },
  { x: 2, y: 2 },
  { x: 3, y: 5 },
  { x: 4, y: 3 },
]

const categoryData = [
  { region: "AMER", value: 42 },
  { region: "EMEA", value: 33 },
  { region: "APAC", value: 51 },
]

const heatmapData = [
  { xBin: "A", yBin: "Q1", value: 12 },
  { xBin: "B", yBin: "Q1", value: 19 },
  { xBin: "A", yBin: "Q2", value: 22 },
  { xBin: "B", yBin: "Q2", value: 9 },
]

const denseHeatmapData = (() => {
  const rows: Array<{ x: number; y: number; value: number }> = []
  for (let x = 0; x < 70; x++) {
    for (let y = 0; y < 70; y++) {
      rows.push({ x, y, value: (x * 3 + y) % 17 })
    }
  }
  return rows
})()

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

const multiAxisData = [
  { x: 0, temp: 20, humidity: 40 },
  { x: 1, temp: 22, humidity: 55 },
  { x: 2, temp: 18, humidity: 60 },
]

const networkNodes = [{ id: "a" }, { id: "b" }, { id: "c" }]
const networkEdges = [
  { source: "a", target: "b", value: 5 },
  { source: "b", target: "c", value: 3 },
]

/** Hierarchy nodes: intermediate levels may omit `value` (summed from leaves). */
type HierarchyNode = {
  name: string
  value?: number
  children?: HierarchyNode[]
}

const hierarchy: HierarchyNode = {
  name: "root",
  children: [
    { name: "alpha", value: 10 },
    { name: "beta", value: 7 },
    { name: "gamma", value: 4 },
  ],
}

interface ParityCase {
  name: string
  /** Dominant SVG tag used as the data-mark primitive. */
  dominant: "path" | "rect" | "circle"
  /** Render via `renderChart()` — the server-only API. */
  ssr: () => string
  /** Render via `renderToString(<Component />)` — the in-frame SSR branch. */
  inFrame: () => string
}

const cases: ParityCase[] = [
  {
    name: "LineChart",
    dominant: "path",
    ssr: () => renderChart("LineChart", {
      data: xyData, xAccessor: "x", yAccessor: "y", width: 400, height: 200,
    }),
    inFrame: () => renderToString(
      <LineChart data={xyData} xAccessor="x" yAccessor="y" width={400} height={200} />,
    ),
  },
  {
    name: "AreaChart semantic line",
    dominant: "path",
    ssr: () => renderChart("AreaChart", {
      data: xyData, xAccessor: "x", yAccessor: "y", width: 400, height: 200,
      yExtent: [0, 6],
      semanticGradient: [
        { at: 50, color: "#e5a800", opacity: 0.2 },
        { at: 75, color: "#ff7077", opacity: 0.4 },
      ],
    }),
    inFrame: () => renderToString(
      <AreaChart
        data={xyData} xAccessor="x" yAccessor="y" width={400} height={200}
        yExtent={[0, 6]}
        semanticGradient={[
          { at: 50, color: "#e5a800", opacity: 0.2 },
          { at: 75, color: "#ff7077", opacity: 0.4 },
        ]}
      />,
    ),
  },
  {
    name: "BumpChart",
    dominant: "path",
    ssr: () => renderChart("BumpChart", {
      data: [
        { year: 2023, series: "A", value: 10 },
        { year: 2023, series: "B", value: 7 },
        { year: 2024, series: "A", value: 6 },
        { year: 2024, series: "B", value: 12 },
      ],
      xAccessor: "year",
      yAccessor: "value",
      lineBy: "series",
      highlightTop: 1,
      ribbon: true,
      showLabels: false,
      width: 400,
      height: 200,
    }),
    inFrame: () => renderToString(
      <BumpChart
        data={[
          { year: 2023, series: "A", value: 10 },
          { year: 2023, series: "B", value: 7 },
          { year: 2024, series: "A", value: 6 },
          { year: 2024, series: "B", value: 12 },
        ]}
        xAccessor="year"
        yAccessor="value"
        lineBy="series"
        highlightTop={1}
        ribbon
        showLabels={false}
        width={400}
        height={200}
      />,
    ),
  },
  {
    name: "BarChart",
    dominant: "rect",
    ssr: () => renderChart("BarChart", {
      data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 400, height: 200,
    }),
    inFrame: () => renderToString(
      <BarChart data={categoryData} categoryAccessor="region" valueAccessor="value" width={400} height={200} />,
    ),
  },
  {
    name: "PieChart",
    dominant: "path",
    ssr: () => renderChart("PieChart", {
      data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 300, height: 300,
    }),
    inFrame: () => renderToString(
      <PieChart data={categoryData} categoryAccessor="region" valueAccessor="value" width={300} height={300} />,
    ),
  },
  {
    name: "SankeyDiagram",
    dominant: "path",
    ssr: () => renderChart("SankeyDiagram", {
      nodes: networkNodes, edges: networkEdges, valueAccessor: "value",
      nodeIdAccessor: "id", sourceAccessor: "source", targetAccessor: "target",
      width: 500, height: 300,
    }),
    inFrame: () => renderToString(
      <SankeyDiagram
        nodes={networkNodes} edges={networkEdges} valueAccessor="value"
        nodeIdAccessor="id" sourceAccessor="source" targetAccessor="target"
        width={500} height={300}
      />,
    ),
  },
  {
    name: "Treemap",
    dominant: "rect",
    ssr: () => renderChart("Treemap", {
      data: hierarchy, childrenAccessor: "children", valueAccessor: "value",
      width: 500, height: 400,
    }),
    inFrame: () => renderToString(
      <Treemap
        data={hierarchy}
        childrenAccessor="children"
        valueAccessor="value"
        width={500}
        height={400}
      />,
    ),
  },
  {
    name: "Heatmap",
    dominant: "rect",
    ssr: () => renderChart("Heatmap", {
      data: heatmapData, xAccessor: "xBin", yAccessor: "yBin", valueAccessor: "value",
      width: 400, height: 240,
    }),
    inFrame: () => renderToString(
      <Heatmap data={heatmapData} xAccessor="xBin" yAccessor="yBin" valueAccessor="value" width={400} height={240} />,
    ),
  },
  {
    name: "Heatmap auto-bin",
    dominant: "rect",
    ssr: () => renderChart("Heatmap", {
      data: denseHeatmapData, xAccessor: "x", yAccessor: "y", valueAccessor: "value",
      heatmapAggregation: "mean",
      width: 400, height: 240,
    }),
    inFrame: () => renderToString(
      <Heatmap
        data={denseHeatmapData}
        xAccessor="x"
        yAccessor="y"
        valueAccessor="value"
        heatmapAggregation="mean"
        width={400}
        height={240}
      />,
    ),
  },
  {
    name: "WaterfallChart",
    dominant: "rect",
    ssr: () => renderChart("WaterfallChart", {
      data: waterfallData, xAccessor: "step", yAccessor: "value",
      width: 400, height: 240,
    }),
    inFrame: () => renderToString(
      <WaterfallChart data={waterfallData} xAccessor="step" yAccessor="value" width={400} height={240} />,
    ),
  },
  {
    name: "MultiAxisLineChart",
    dominant: "path",
    ssr: () => renderChart("MultiAxisLineChart", {
      data: multiAxisData,
      xAccessor: "x",
      series: [
        { yAccessor: "temp", label: "Temp" },
        { yAccessor: "humidity", label: "Humidity" },
      ],
      width: 400, height: 240,
    }),
    inFrame: () => renderToString(
      <MultiAxisLineChart
        data={multiAxisData}
        xAccessor="x"
        series={[
          { yAccessor: "temp", label: "Temp" },
          { yAccessor: "humidity", label: "Humidity" },
        ]}
        width={400}
        height={240}
      />,
    ),
  },
  {
    name: "RadarChart",
    dominant: "circle",
    ssr: () => renderChart("RadarChart", {
      data: radarData,
      categoryAccessor: "attribute",
      valueAccessor: "value",
      seriesAccessor: "name",
      colorBy: "name",
      width: 360, height: 360,
    }),
    inFrame: () => renderToString(
      <RadarChart
        data={radarData}
        categoryAccessor="attribute"
        valueAccessor="value"
        seriesAccessor="name"
        colorBy="name"
        width={360}
        height={360}
      />,
    ),
  },
]

/** Count occurrences of a tag (e.g. `<path` or `<rect`) in an SVG string. */
function countTag(svg: string, tag: string): number {
  const re = new RegExp(`<${tag}[\\s/>]`, "g")
  return (svg.match(re) ?? []).length
}

describe("SSR vs CSR-first-render parity", () => {
  for (const c of cases) {
    describe(c.name, () => {
      it("both paths produce non-empty SVG", () => {
        const ssrSvg = c.ssr()
        const inFrameSvg = c.inFrame()
        expect(ssrSvg).toContain("<svg")
        expect(inFrameSvg).toContain("<svg")
        // Sanity: each path produces a non-trivial document. Empty SVG
        // would pass `.toContain("<svg")` but indicate the renderer
        // bailed before emitting marks.
        expect(ssrSvg.length).toBeGreaterThan(200)
        expect(inFrameSvg.length).toBeGreaterThan(200)
      })

      it("both paths emit the dominant data-mark primitive", () => {
        const ssrSvg = c.ssr()
        const inFrameSvg = c.inFrame()
        // Pick the dominant primitive for each chart family and assert
        // both paths emit at least one of it. We deliberately don't
        // require strict count equality — `renderChart` is a bare
        // static-render path that emits data marks only, while the
        // in-frame SSR branch goes through the full HOC pipeline and
        // includes axis/legend chrome via the SVGOverlay component.
        // That divergence is by design (auto-hydrating users see the
        // chrome, manual-placeholder users opt into it via props if
        // they want it).
        //
        // What this test catches: a regression where one path produces
        // *zero* data marks while the other produces some, indicating
        // a scene-builder defect in one of the two pipelines.
        const ssrCount = countTag(ssrSvg, c.dominant)
        const inFrameCount = countTag(inFrameSvg, c.dominant)
        expect(ssrCount).toBeGreaterThan(0)
        expect(inFrameCount).toBeGreaterThan(0)
      })

      it("both paths produce data-mark counts that scale with the data size", () => {
        const ssrSvg = c.ssr()
        const inFrameSvg = c.inFrame()
        // Stronger gate: when the dominant primitive's count is
        // already > 0 (asserted above), the *order of magnitude*
        // should match between the two paths. Sankey and pie need
        // ~3 data marks each (one per category/edge); a path emitting
        // 30 vs 3 is what we want to catch as divergence.
        const ssrCount = countTag(ssrSvg, c.dominant)
        const inFrameCount = countTag(inFrameSvg, c.dominant)
        // Ratio check: the larger count should be at most 3× the
        // smaller. SVGOverlay can add up to ~4-5 extra path/rect
        // elements for axes/legend chrome on top of N data marks; on
        // small fixtures (3 categories) that ratio cap is generous
        // enough to allow normal chrome variation but tight enough
        // to catch a 10× scene-builder defect.
        const minCount = Math.min(ssrCount, inFrameCount)
        const maxCount = Math.max(ssrCount, inFrameCount)
        expect(maxCount).toBeLessThanOrEqual(minCount * 3 + 5)
      })
    })
  }

  it("Heatmap auto-bin keeps both paths on the aggregated grid, not one cell per x×y", () => {
    const chart = cases.find((c) => c.name === "Heatmap auto-bin")!
    for (const svg of [chart.ssr(), chart.inFrame()]) {
      // 70×70 = 4900 distinct cells; auto-bin default is 20×20 = 400.
      // Axes/legend chrome may add a handful of extra rects.
      expect(countTag(svg, "rect")).toBeLessThanOrEqual(420)
      expect(countTag(svg, "rect")).toBeGreaterThan(0)
    }
  })

  it("preserves solid semantic area-line colors in both rendering paths", () => {
    const area = cases.find((c) => c.name === "AreaChart semantic line")!
    for (const svg of [area.ssr(), area.inFrame()]) {
      expect(svg).toContain('stroke="#e5a800"')
      expect(svg).toContain('stroke="#ff7077"')
      expect(svg).toContain('stop-color="#e5a800"')
      expect(svg).toContain('stop-opacity="0.2"')
    }
  })
})

describe("BumpChart shared styling in static SVG", () => {
  it("uses theme colors and top-level primitive overrides", () => {
    const svg = renderChart("BumpChart", {
      data: [
        { year: 2023, series: "A", value: 10 },
        { year: 2023, series: "B", value: 7 },
        { year: 2024, series: "A", value: 6 },
        { year: 2024, series: "B", value: 12 },
      ],
      xAccessor: "year",
      yAccessor: "value",
      lineBy: "series",
      highlightTop: 1,
      showLabels: false,
      stroke: "#101010",
      strokeWidth: 2,
      opacity: 0.4,
      theme: {
        ...LIGHT_THEME,
        colors: {
          ...LIGHT_THEME.colors,
          categorical: ["#123456"],
          textSecondary: "#778899",
        },
      },
    })

    expect(svg).toContain('fill="#123456"')
    expect(svg).toContain('fill="#778899"')
    expect(svg).toContain('stroke="#101010"')
    expect(svg).toContain('stroke-width="2"')
    expect(svg).toContain('opacity="0.4"')
  })

  it("keeps the best series on the first highlight color regardless of category order", () => {
    const data = [
      { year: 2023, series: "Alpha", value: 1 },
      { year: 2023, series: "Zulu", value: 10 },
      { year: 2024, series: "Alpha", value: 2 },
      { year: 2024, series: "Zulu", value: 11 }
    ]
    const theme = {
      ...LIGHT_THEME,
      colors: {
        ...LIGHT_THEME.colors,
        categorical: ["#123456", "#abcdef"],
        textSecondary: "#778899"
      }
    }
    const chartProps = {
      data,
      xAccessor: "year" as const,
      yAccessor: "value" as const,
      lineBy: "series" as const,
      highlightTop: 1,
      showLabels: false,
      width: 400,
      height: 200
    }

    const staticApi = renderChart("BumpChart", { ...chartProps, theme })
    const inFrame = renderToString(
      <ThemeProvider theme={theme}>
        <BumpChart {...chartProps} />
      </ThemeProvider>
    )

    for (const svg of [staticApi, inFrame]) {
      expect(svg).toContain('fill="#123456"')
      expect(svg).toContain('fill="#778899"')
      expect(svg).not.toContain('fill="#abcdef"')
    }
  })

  it("honors automatic label priority and caps in static SVG", () => {
    const props = {
      data: [
        { year: 2023, series: "A", value: 10, priority: 1 },
        { year: 2023, series: "B", value: 8, priority: 3 },
        { year: 2023, series: "C", value: 6, priority: 2 },
        { year: 2024, series: "A", value: 8, priority: 1 },
        { year: 2024, series: "B", value: 10, priority: 3 },
        { year: 2024, series: "C", value: 6, priority: 2 },
      ],
      xAccessor: "year",
      yAccessor: "value",
      lineBy: "series",
      showLabels: "auto" as const,
      labelPriorityAccessor: "priority",
      maxLabels: 1,
      width: 400,
      height: 220,
    }
    const svg = renderChart("BumpChart", props)
    const cappedAtZero = renderChart("BumpChart", { ...props, maxLabels: 0 })

    expect(svg).toContain(">B<")
    expect(svg).not.toContain(">A<")
    expect(svg).not.toContain(">C<")
    expect(cappedAtZero).not.toContain(">A<")
    expect(cappedAtZero).not.toContain(">B<")
    expect(cappedAtZero).not.toContain(">C<")
  })
})
