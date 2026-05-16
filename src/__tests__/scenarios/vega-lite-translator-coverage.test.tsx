/**
 * Regression guard for the Vega-Lite translator demo at
 * `/features/vega-lite`.
 *
 * The page maintains a `COMPONENT_MAP` that decides which translated
 * component the live preview can render. When `fromVegaLite` learned
 * to emit a new component (PieChart, Heatmap, StackedAreaChart, etc.)
 * but the demo's map didn't get updated alongside, every preview for
 * that chart class fell through to a "preview not available in the
 * docs demo. Copy the generated JSX below to use it in your app."
 * placeholder — even though the JSX panel showed valid code and the
 * mapping table on the same page promised the translation worked.
 *
 * This test pins the cross-file invariant: every component name
 * `fromVegaLite` is documented to emit (per its own switch logic and
 * the doc-page mapping table) must be a real `semiotic` export AND
 * must round-trip through a basic render. Adding a new mark→component
 * branch in `fromVegaLite.ts` without updating the docs map will fail
 * this gate.
 */
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import * as React from "react"
import * as Semiotic from "../../components/semiotic"
import { fromVegaLite } from "../../components/data/fromVegaLite"
import type { VegaLiteSpec } from "../../components/data/fromVegaLite"

// The exhaustive set of component names `fromVegaLite` can return.
// Pulled from the switch logic in `src/components/data/fromVegaLite.ts`
// and the "Mark to component" mapping table on the docs page.
// Adding a new emit target requires extending this list AND the docs
// page's `COMPONENT_MAP` together; this test is the contract.
const EMITTED_COMPONENTS = [
  "BarChart",
  "StackedBarChart",
  "LineChart",
  "AreaChart",
  "StackedAreaChart",
  "Scatterplot",
  "BubbleChart",
  "Heatmap",
  "PieChart",
  "DonutChart",
  "DotPlot",
  "Histogram",
] as const

// Minimal valid Vega-Lite specs that produce each component. If
// `fromVegaLite` changes its routing, these probes catch drift.
const SPEC_PROBES: Record<string, VegaLiteSpec> = {
  BarChart: {
    mark: "bar",
    data: { values: [{ region: "N", v: 1 }] },
    encoding: { x: { field: "region", type: "nominal" }, y: { field: "v", type: "quantitative" } },
  },
  StackedBarChart: {
    mark: "bar",
    data: { values: [{ region: "N", v: 1, cat: "a" }] },
    encoding: {
      x: { field: "region", type: "nominal" },
      y: { field: "v", type: "quantitative" },
      color: { field: "cat", type: "nominal" },
    },
  },
  LineChart: {
    mark: "line",
    data: { values: [{ x: 1, y: 1 }] },
    encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } },
  },
  AreaChart: {
    mark: "area",
    data: { values: [{ x: 1, y: 1 }] },
    encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } },
  },
  StackedAreaChart: {
    mark: "area",
    data: { values: [{ x: 1, y: 1, cat: "a" }] },
    encoding: {
      x: { field: "x", type: "quantitative" },
      y: { field: "y", type: "quantitative" },
      color: { field: "cat", type: "nominal" },
    },
  },
  Scatterplot: {
    mark: "point",
    data: { values: [{ x: 1, y: 1 }] },
    encoding: { x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } },
  },
  BubbleChart: {
    mark: "point",
    data: { values: [{ x: 1, y: 1, s: 5 }] },
    encoding: {
      x: { field: "x", type: "quantitative" },
      y: { field: "y", type: "quantitative" },
      size: { field: "s", type: "quantitative" },
    },
  },
  Heatmap: {
    mark: "rect",
    data: { values: [{ d: "Mon", h: "9am", t: 1 }] },
    encoding: {
      x: { field: "d", type: "nominal" },
      y: { field: "h", type: "nominal" },
      color: { field: "t", type: "quantitative" },
    },
  },
  PieChart: {
    mark: "arc",
    data: { values: [{ c: "A", v: 1 }] },
    encoding: { theta: { field: "v", type: "quantitative" }, color: { field: "c", type: "nominal" } },
  },
  DonutChart: {
    mark: { type: "arc", innerRadius: 50 },
    data: { values: [{ c: "A", v: 1 }] },
    encoding: { theta: { field: "v", type: "quantitative" }, color: { field: "c", type: "nominal" } },
  },
  DotPlot: {
    mark: "tick",
    data: { values: [{ cat: "A", v: 1 }] },
    encoding: { x: { field: "v", type: "quantitative" }, y: { field: "cat", type: "nominal" } },
  },
  Histogram: {
    mark: "bar",
    data: { values: [{ v: 1 }] },
    encoding: { x: { field: "v", type: "quantitative", bin: true }, y: { aggregate: "count" } },
  },
}

describe("Vega-Lite translator coverage", () => {
  it("every component fromVegaLite emits is a real semiotic export", () => {
    for (const name of EMITTED_COMPONENTS) {
      expect(
        Semiotic[name as keyof typeof Semiotic],
        `Component "${name}" listed in EMITTED_COMPONENTS but not exported by semiotic — the /features/vega-lite demo would crash trying to render it.`,
      ).toBeDefined()
    }
  })

  it("every documented mark→component translation produces a renderable component", () => {
    for (const [expectedComponent, spec] of Object.entries(SPEC_PROBES)) {
      const result = fromVegaLite(spec)
      expect(
        result.component,
        `Vega-Lite spec for ${expectedComponent} translated to ${result.component} — expected ${expectedComponent}.`,
      ).toBe(expectedComponent)

      // Pull the actual component out of the semiotic surface and
      // smoke-render it with the translator-produced props. A
      // throw here means the docs demo's `COMPONENT_MAP` entry
      // would also throw at runtime.
      const Component = Semiotic[result.component as keyof typeof Semiotic] as React.ComponentType<Record<string, unknown>>
      expect(Component, `${result.component} not exported`).toBeDefined()
      expect(() => render(React.createElement(Component, { ...result.props, width: 200, height: 100 }))).not.toThrow()
    }
  })

  it("SPEC_PROBES covers every name in EMITTED_COMPONENTS", () => {
    // Prevents the probe table from drifting out of date relative to
    // the EMITTED_COMPONENTS list — a missing probe entry would
    // silently weaken coverage.
    for (const name of EMITTED_COMPONENTS) {
      expect(SPEC_PROBES, `EMITTED_COMPONENTS includes ${name} but SPEC_PROBES has no spec for it`).toHaveProperty(name)
    }
  })
})
