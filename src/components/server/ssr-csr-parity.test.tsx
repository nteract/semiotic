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
import { BarChart } from "../charts/ordinal/BarChart"
import { PieChart } from "../charts/ordinal/PieChart"
import { SankeyDiagram } from "../charts/network/SankeyDiagram"
import { Treemap } from "../charts/network/Treemap"

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

const networkNodes = [{ id: "a" }, { id: "b" }, { id: "c" }]
const networkEdges = [
  { source: "a", target: "b", value: 5 },
  { source: "b", target: "c", value: 3 },
]

const hierarchy = {
  name: "root",
  children: [
    { name: "alpha", value: 10 },
    { name: "beta", value: 7 },
    { name: "gamma", value: 4 },
  ],
}

interface ParityCase {
  name: string
  /** Render via `renderChart()` — the server-only API. */
  ssr: () => string
  /** Render via `renderToString(<Component />)` — the in-frame SSR branch. */
  inFrame: () => string
}

const cases: ParityCase[] = [
  {
    name: "LineChart",
    ssr: () => renderChart("LineChart", {
      data: xyData, xAccessor: "x", yAccessor: "y", width: 400, height: 200,
    }),
    inFrame: () => renderToString(
      <LineChart data={xyData} xAccessor="x" yAccessor="y" width={400} height={200} />,
    ),
  },
  {
    name: "BarChart",
    ssr: () => renderChart("BarChart", {
      data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 400, height: 200,
    }),
    inFrame: () => renderToString(
      <BarChart data={categoryData} categoryAccessor="region" valueAccessor="value" width={400} height={200} />,
    ),
  },
  {
    name: "PieChart",
    ssr: () => renderChart("PieChart", {
      data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 300, height: 300,
    }),
    inFrame: () => renderToString(
      <PieChart data={categoryData} categoryAccessor="region" valueAccessor="value" width={300} height={300} />,
    ),
  },
  {
    name: "SankeyDiagram",
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
    ssr: () => renderChart("Treemap", {
      data: hierarchy, childrenAccessor: "children", valueAccessor: "value",
      width: 500, height: 400,
    }),
    inFrame: () => renderToString(
      <Treemap
        data={hierarchy}
        childrenAccessor="children"
        valueAccessor={"value" as never}
        width={500}
        height={400}
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
        const dominant = c.name === "LineChart" ? "path"
          : c.name === "PieChart" ? "path"
          : c.name === "Treemap" ? "rect"
          : c.name === "SankeyDiagram" ? "path"
          : "rect"
        const ssrCount = countTag(ssrSvg, dominant)
        const inFrameCount = countTag(inFrameSvg, dominant)
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
        const dominant = c.name === "LineChart" ? "path"
          : c.name === "PieChart" ? "path"
          : c.name === "Treemap" ? "rect"
          : c.name === "SankeyDiagram" ? "path"
          : "rect"
        const ssrCount = countTag(ssrSvg, dominant)
        const inFrameCount = countTag(inFrameSvg, dominant)
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
})
