/**
 * SSR feature parity matrix.
 *
 * Each Stream Frame (XY, Ordinal, Network, Geo) supports a set of overlay
 * features beyond chart marks: title/desc, axes, grid lines, legend,
 * annotations, background and foreground graphics. The canvas path renders
 * these client-side; the server path goes through `renderToStaticSVG` →
 * `SVGOverlay` / `OrdinalSVGOverlay` / per-frame helpers.
 *
 * History: the bar `gradientFill` near-miss in 3.4.2 and an earlier
 * `backgroundGraphics` bug both lived through CI because integration tests
 * only exercised one frame. This file enforces the parity contract by
 * running every applicable (feature × frame) combination through SSR and
 * asserting the feature shows up in the output.
 *
 * Tests that fail today are the items the contract surfaces — they're left
 * as `it.todo()` with a comment pointing at the structural gap. When SSR
 * support lands the test moves from `.todo` to a real assertion in the same
 * sweep that wires the feature.
 *
 * Companion: `scripts/check-ssr-alignment.js` enforces scene-node parity at
 * a structural level. This file enforces it at a behavior level — the two
 * complement each other.
 */

// jsdom + react-dom/server polyfill, same shape as serverFeatures.test.tsx
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { describe, expect, it } from "vitest"
import {
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
  renderGeoToStaticSVG,
} from "./renderToStaticSVG"

// ── Fixtures ──────────────────────────────────────────────────────────

const xyData = [{ x: 0, y: 10, s: "a" }, { x: 1, y: 20, s: "a" }, { x: 0, y: 5, s: "b" }, { x: 1, y: 25, s: "b" }]
const ordinalData = [{ c: "A", v: 10 }, { c: "B", v: 20 }, { c: "C", v: 15 }]
const networkEdges = [{ source: "a", target: "b" }, { source: "b", target: "c" }]

// ── Per-frame render helpers — keep the call shape uniform so the matrix
//    body reads as feature-x-frame, not props-shape-x-frame.

const FRAME_RENDERERS = {
  xy: (extra: Record<string, unknown> = {}) => renderXYToStaticSVG({
    chartType: "line", data: xyData, xAccessor: "x", yAccessor: "y", size: [400, 300], ...extra,
  } as any),
  ordinal: (extra: Record<string, unknown> = {}) => renderOrdinalToStaticSVG({
    chartType: "bar", data: ordinalData, oAccessor: "c", rAccessor: "v", size: [400, 300], ...extra,
  } as any),
  network: (extra: Record<string, unknown> = {}) => renderNetworkToStaticSVG({
    chartType: "force", edges: networkEdges, nodeIDAccessor: "id", size: [400, 300], ...extra,
  } as any),
  geo: (extra: Record<string, unknown> = {}) => renderGeoToStaticSVG({
    chartType: "geo", areas: [], size: [400, 300], ...extra,
  } as any),
}

// ── Title / description (accessibility) ───────────────────────────────
//
// Already covered in serverFeatures.test.tsx for XY and Network. This block
// re-asserts across every frame so the matrix is uniform — losing title in
// any frame would be a regression visible from one place.

describe("SSR feature parity: title", () => {
  it.each([
    ["xy"],
    ["ordinal"],
    ["network"],
    ["geo"],
  ] as const)("%s renders <title> when title prop is set", (frame) => {
    const svg = FRAME_RENDERERS[frame]({ title: "Parity Title" })
    expect(svg).toMatch(/<title[^>]*>Parity Title<\/title>/)
  })
})

// ── Axes ───────────────────────────────────────────────────────────────
//
// Network and Geo don't render axes by default (no continuous scale on either
// axis), so they're not in the matrix.

describe("SSR feature parity: axes", () => {
  it("xy renders the axes group when showAxes is true", () => {
    const svg = FRAME_RENDERERS.xy({ showAxes: true })
    expect(svg).toMatch(/class="stream-axes"|id="axes"/)
  })

  it("ordinal renders the axes group when showAxes is true", () => {
    const svg = FRAME_RENDERERS.ordinal({ showAxes: true })
    expect(svg).toMatch(/class="ordinal-axes"|id="axes"/)
  })
})

// ── Grid lines ─────────────────────────────────────────────────────────
//
// XY supports `showGrid`. Ordinal supports it for vertical/horizontal
// projections (radial pie/donut intentionally don't). Network and Geo: n/a.

describe("SSR feature parity: grid", () => {
  it("xy renders grid lines when showGrid is true", () => {
    const svg = FRAME_RENDERERS.xy({ showGrid: true })
    expect(svg).toContain("semiotic-grid")
  })

  it("ordinal vertical renders grid lines when showGrid is true", () => {
    const svg = FRAME_RENDERERS.ordinal({ showGrid: true, projection: "vertical" })
    expect(svg).toContain("semiotic-grid")
  })

  it("ordinal radial does NOT render grid (intentional — no orthogonal axes)", () => {
    const svg = FRAME_RENDERERS.ordinal({ showGrid: true, chartType: "donut", projection: "radial" })
    expect(svg).not.toContain("semiotic-grid")
  })
})

// ── Annotations ────────────────────────────────────────────────────────
//
// This matrix verifies SSR annotation overlays across frame types.
// XY and Ordinal render threshold-style annotations; Network renders
// pixel-coordinate annotations; Geo renders projected `[lon, lat]`
// annotations when a fitted geography is available.

describe("SSR feature parity: annotations", () => {
  it("xy renders annotation overlay group", () => {
    const svg = FRAME_RENDERERS.xy({ annotations: [{ type: "y-threshold", value: 15, label: "Goal" }] })
    expect(svg).toContain("semiotic-annotations")
    expect(svg).toContain("Goal")
  })

  it("ordinal renders annotation overlay group", () => {
    const svg = FRAME_RENDERERS.ordinal({ annotations: [{ type: "y-threshold", value: 15, label: "Goal" }] })
    expect(svg).toContain("semiotic-annotations")
    expect(svg).toContain("Goal")
  })

  it("network renders annotation overlay group with pixel-coord annotations", () => {
    // Network has no continuous x/y scale — annotations use raw pixel
    // coordinates which staticAnnotations passes through when no scales
    // are supplied.
    const svg = FRAME_RENDERERS.network({
      annotations: [{ type: "label", x: 50, y: 50, label: "PROBE" }],
    })
    expect(svg).toContain("semiotic-annotations")
    expect(svg).toContain("PROBE")
  })

  it("geo renders annotation overlay group with [lon, lat] coordinates", () => {
    // Geo annotations use `coordinates: [lon, lat]`; the resolved
    // projection from GeoPipelineStore.scales projects them to pixel space.
    // Need at least one area for the projection to fit; an empty fixture
    // hits the early-return path that doesn't render annotations.
    const svg = renderGeoToStaticSVG({
      chartType: "geo",
      areas: [{
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
        properties: {},
      }],
      size: [400, 300],
      annotations: [{ type: "label", coordinates: [5, 5], label: "PROBE" }],
    } as any)
    expect(svg).toContain("semiotic-annotations")
    expect(svg).toContain("PROBE")
  })
})

// ── Legend ─────────────────────────────────────────────────────────────
//
// All four frames now auto-build a categorical legend from a color-by
// accessor + `showLegend`. Each also honors a caller-supplied pre-rendered
// ReactNode passed via `props.legend` (the legend from a config object form
// like `{legendGroups}` is not yet wired through SSR — see OUTSTANDING_WORK).
// The "explicit ReactNode wins over auto-build" tests below assert that
// contract by using a marker only the explicit ReactNode would produce.

const EXPLICIT_LEGEND_MARKER = "data-explicit-legend-marker"
const explicitReactNodeLegend = (<g data-explicit-legend-marker="yes"><text>Custom</text></g>)

describe("SSR feature parity: legend", () => {
  it("xy: explicit ReactNode `legend` prop wins over auto-build", () => {
    // If SSR ignored `props.legend` and only used auto-build, the marker
    // wouldn't appear in the output. Asserting the marker locks down the
    // passthrough contract.
    const svg = FRAME_RENDERERS.xy({
      colorAccessor: "s",
      showLegend: true,
      legend: explicitReactNodeLegend,
    })
    expect(svg).toContain("semiotic-legend")
    expect(svg).toContain(EXPLICIT_LEGEND_MARKER)
  })

  it("xy: auto-build includes the legend group element when no explicit legend", () => {
    const svg = FRAME_RENDERERS.xy({ colorAccessor: "s", showLegend: true })
    expect(svg).toContain("semiotic-legend")
    // Marker absent → confirms this came from the auto-build, not a leaked
    // explicit legend from a previous test.
    expect(svg).not.toContain(EXPLICIT_LEGEND_MARKER)
  })

  it("xy auto-constructs legend from colorAccessor + showLegend (no explicit legend prop)", () => {
    // renderXYFrame falls back to `colorAccessor || groupAccessor` and runs
    // `extractCategories(data, accessor)` → `renderStaticLegend`. Asserting
    // the parity with Ordinal's auto-build path.
    const svg = FRAME_RENDERERS.xy({ colorAccessor: "s", showLegend: true })
    expect(svg).toContain("semiotic-legend")
  })

  it("ordinal renders legend when colorAccessor + showLegend are set", () => {
    const svg = FRAME_RENDERERS.ordinal({ colorAccessor: "c", showLegend: true })
    expect(svg).toContain("semiotic-legend")
  })

  it("network auto-constructs legend from colorBy/nodeIDAccessor + showLegend", () => {
    // Categories sourced from the node list (or derived from edges when
    // nodes aren't provided directly). `renderNetworkFrame` runs them
    // through `renderStaticLegend` and reserves margin for it.
    const svg = FRAME_RENDERERS.network({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
      colorBy: "id",
      showLegend: true,
    })
    expect(svg).toContain("semiotic-legend")
  })

  it("geo auto-constructs legend from colorBy on points (proportional symbol map)", () => {
    const svg = renderGeoToStaticSVG({
      chartType: "geo",
      points: [{ id: "p1", lon: 0, lat: 0, status: "high" }, { id: "p2", lon: 5, lat: 5, status: "low" }],
      xAccessor: "lon",
      yAccessor: "lat",
      colorBy: "status",
      showLegend: true,
      size: [400, 300],
    } as any)
    expect(svg).toContain("semiotic-legend")
  })

  it("geo auto-constructs legend from colorBy on area features (choropleth)", () => {
    // Areas are GeoJSON features; properties carry the colorBy field.
    const svg = renderGeoToStaticSVG({
      chartType: "geo",
      areas: [
        { type: "Feature", geometry: { type: "Polygon", coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] }, properties: { region: "north" } },
        { type: "Feature", geometry: { type: "Polygon", coordinates: [[[10,0],[20,0],[20,10],[10,10],[10,0]]] }, properties: { region: "south" } },
      ],
      colorBy: "region",
      showLegend: true,
      size: [400, 300],
    } as any)
    expect(svg).toContain("semiotic-legend")
  })
})

// ── Background and foreground graphics ────────────────────────────────
//
// `backgroundGraphics` and `foregroundGraphics` are ReactNodes the user
// places below/above chart marks. Each frame's render pipes both through
// the inner-translated `<g>` group, matching the layering of SVGOverlay /
// OrdinalSVGOverlay on the live path. The SVG-element marker is the React
// node itself — assert by injecting an identifiable element and checking
// for it in the rendered output.

const BG_MARKER = "data-bg-marker"
const FG_MARKER = "data-fg-marker"
const bgNode = (<rect width="10" height="10" data-bg-marker="bg" />)
const fgNode = (<rect width="10" height="10" data-fg-marker="fg" />)

describe("SSR feature parity: backgroundGraphics", () => {
  it.each([
    ["xy"],
    ["ordinal"],
    ["network"],
    ["geo"],
  ] as const)("%s emits backgroundGraphics under chart marks in SSR", (frame) => {
    const svg = FRAME_RENDERERS[frame]({ backgroundGraphics: bgNode })
    expect(svg).toContain(BG_MARKER)
  })
})

describe("SSR feature parity: foregroundGraphics", () => {
  it.each([
    ["xy"],
    ["ordinal"],
    ["network"],
    ["geo"],
  ] as const)("%s emits foregroundGraphics over chart marks in SSR", (frame) => {
    const svg = FRAME_RENDERERS[frame]({ foregroundGraphics: fgNode })
    expect(svg).toContain(FG_MARKER)
  })
})
