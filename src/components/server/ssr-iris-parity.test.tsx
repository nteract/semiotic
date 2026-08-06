/**
 * SSR/CSR parity regressions distilled from a downstream chart library that
 * wraps Semiotic HOCs and renders the SAME resolved Semiotic props two ways:
 * once through `renderChart` (`semiotic/server`) for a static SVG, and once
 * through the live React HOC. When those two paths disagree, a server-rendered
 * chart and its hydrated/canvas twin diverge visibly.
 *
 * Each case here reproduces — with generic data — a class of bug where the
 * `renderChart` prop-mapping SILENTLY DROPPED a prop the live HOC honors, so
 * the static SVG lost a whole visual channel (area fill, a pinned value axis,
 * categorical tile colors + hierarchy labels). The pattern is always the same:
 * a top-level HOC prop that the HOC forwards to its frame, but the matching
 * server `ChartConfig.buildProps` never mapped. These tests assert the static
 * path now emits the channel, and (where meaningful) that it agrees with the
 * in-frame SSR branch of the live HOC.
 *
 * Sibling of `ssr-csr-parity.test.tsx` (which gates the two SSR pipelines
 * against each other for the default prop surface); this file targets the
 * feature-flag props that surfaced the divergences.
 */
import { describe, it, expect } from "vitest"
import * as React from "react"
import { renderToString } from "react-dom/server"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"
import { LineChart, type LineChartProps } from "../charts/xy/LineChart"
import { SwimlaneChart, type SwimlaneChartProps } from "../charts/ordinal/SwimlaneChart"
import { PieChart, type PieChartProps } from "../charts/ordinal/PieChart"
import { DonutChart } from "../charts/ordinal/DonutChart"
import { Treemap, type TreemapProps } from "../charts/network/Treemap"
import { ProportionalSymbolMap } from "../charts/geo/ProportionalSymbolMap"

/** Count `<path>` marks whose fill is a real paint (color or url()) — i.e.
 * filled areas. Lines render with `fill="none"`, so this isolates area fills. */
function filledPathCount(svg: string): number {
  return (svg.match(/<path\b[^>]*\bfill="(?!none)[^"]+"/g) ?? []).length
}

function uniqueFills(svg: string): Set<string> {
  return new Set([...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]))
}

// ── ComposedChart analog: LineChart mixed line + area ─────────────────────
// A wrapper draws an "area" series and a "line" series on one LineChart by
// passing `fillArea` as the array of area-series names plus `gradientFill`
// through `frameProps`. The SSR path used to render every series as a bare
// line, dropping the fill + gradient.

describe("LineChart — mixed line+area SSR parity", () => {
  const data = [
    { step: 1, value: 400, series: "Volume" },
    { step: 1, value: 24, series: "Latency" },
    { step: 2, value: 300, series: "Volume" },
    { step: 2, value: 13, series: "Latency" },
    { step: 3, value: 600, series: "Volume" },
    { step: 3, value: 38, series: "Latency" },
  ]
  const props: LineChartProps<(typeof data)[number]> = {
    data,
    xAccessor: "step",
    yAccessor: "value",
    lineBy: "series",
    colorBy: "series",
    fillArea: ["Volume"],
    areaOpacity: 0.3,
    colorScheme: ["#E04F5F", "#3E8CF9"],
    width: 400,
    height: 250,
    // Wrappers funnel the (undocumented) area gradient through frameProps.
    frameProps: { gradientFill: true },
  }

  it("renderChart emits a filled area for the area-typed series", () => {
    const svg = renderChart("LineChart", props)
    expect(filledPathCount(svg)).toBeGreaterThan(0)
  })

  it("renderChart emits the area gradient definition", () => {
    const svg = renderChart("LineChart", props)
    expect(svg).toContain("<linearGradient")
  })

  it("area-fill count agrees with the live HOC's in-frame SSR", () => {
    const ssr = renderChart("LineChart", props)
    const inFrame = renderToString(<LineChart {...props} />)
    expect(filledPathCount(ssr)).toBeGreaterThan(0)
    expect(filledPathCount(inFrame)).toBeGreaterThan(0)
    // Same number of area series filled on both paths (1 here: "Volume").
    expect(filledPathCount(ssr)).toBe(filledPathCount(inFrame))
  })

  it("a plain (no fillArea) LineChart still emits no area fill", () => {
    const { fillArea, areaOpacity, frameProps, ...plain } = props
    void fillArea; void areaOpacity; void frameProps
    const svg = renderChart("LineChart", plain)
    expect(filledPathCount(svg)).toBe(0)
  })
})

// ── ThresholdBar analog: SwimlaneChart with a pinned value axis ───────────
// A single-lane single-segment bar whose value is a fraction of a fixed max
// (e.g. 40 of 100). Without honoring `valueExtent`, the value axis auto-scales
// to the data max, so the segment fills the whole track instead of 40%.

describe("SwimlaneChart — valueExtent SSR parity", () => {
  const singleData = [{ category: "bar", segment: "Value", value: 40 }]
  const single: SwimlaneChartProps<(typeof singleData)[number]> = {
    data: singleData,
    categoryAccessor: "category",
    subcategoryAccessor: "segment",
    valueAccessor: "value",
    orientation: "horizontal",
    width: 400,
    height: 60,
  }

  it("renderChart pins the value axis to valueExtent, not the data max", () => {
    const { evidence } = renderChartWithEvidence("SwimlaneChart", {
      ...single,
      valueExtent: [0, 100],
    })
    expect(evidence.yDomain).toEqual([0, 100])
  })

  it("without valueExtent the axis falls back to the data max", () => {
    const { evidence } = renderChartWithEvidence("SwimlaneChart", single)
    expect(evidence.yDomain).toEqual([0, 40])
  })

  it("the SSR domain matches the live HOC's in-frame SSR", () => {
    const { evidence } = renderChartWithEvidence("SwimlaneChart", {
      ...single,
      valueExtent: [0, 100],
    })
    const inFrame = renderToString(<SwimlaneChart {...single} valueExtent={[0, 100]} />)
    // The segment width encodes the domain: 40 of 100 ≈ 40% of the plot width.
    const widths = [...inFrame.matchAll(/<rect\b[^>]*\bwidth="([\d.]+)"/g)].map((m) => Number(m[1]))
    const maxWidth = Math.max(0, ...widths)
    // Plot width ≈ 400 − default horizontal margins. 40% of it is well under
    // the full track; the buggy path filled ~100%.
    expect(evidence.yDomain).toEqual([0, 100])
    expect(maxWidth).toBeGreaterThan(0)
    expect(maxWidth).toBeLessThan(220) // < ~60% of the ~360px plot
  })

  it("multi-segment proportions honor a max beyond the segment sum baseline", () => {
    // Used 60 + Available 40 + Unused 100 across a [0,200] extent → 30/20/50%.
    const { svg, evidence } = renderChartWithEvidence("SwimlaneChart", {
      data: [
        { category: "progress", segment: "Used", value: 60 },
        { category: "progress", segment: "Available", value: 40 },
        { category: "progress", segment: "Unused", value: 100 },
      ],
      categoryAccessor: "category",
      subcategoryAccessor: "segment",
      valueAccessor: "value",
      orientation: "horizontal",
      valueExtent: [0, 200],
      barPadding: 0,
      width: 400,
      height: 40,
    })
    expect(evidence.yDomain).toEqual([0, 200])
    // Three segments render (rounded ends become <path>, the middle a <rect>).
    const segmentPaints = (svg.match(/fill="/g) ?? []).length
    expect(segmentPaints).toBeGreaterThanOrEqual(3)
  })
})

// `frameProps.showAxes: false` is the client HOC's escape hatch (frameProps
// spreads last onto the frame, overriding the mode-resolved default) — used
// by e.g. iris's ThresholdBar/QuotaBar to render a slim bar with no axis
// chrome. `renderChart`'s common-prop builder used to reassert
// `showAxes: resolvedMode.showAxes` unconditionally after spreading
// `frameProps`, silently discarding the override and always drawing a full
// axis server-side regardless of what the live HOC rendered.
describe("SwimlaneChart — frameProps.showAxes SSR parity", () => {
  const single = {
    data: [{ category: "bar", segment: "Value", value: 40 }],
    categoryAccessor: "category",
    subcategoryAccessor: "segment",
    valueAccessor: "value",
    orientation: "horizontal" as const,
    valueExtent: [0, 100] as [number, number],
    width: 300,
    height: 40,
  }

  it("renderChart honors frameProps.showAxes: false", () => {
    const svg = renderChart("SwimlaneChart", {
      ...single,
      frameProps: { showAxes: false },
    })
    expect(svg).not.toContain("ordinal-axes")
  })

  it("without the override, renderChart still draws axes (mode default)", () => {
    const svg = renderChart("SwimlaneChart", single)
    expect(svg).toContain("ordinal-axes")
  })
})

// ── TreeMap analog: colorBy tiles + hierarchy labels ──────────────────────
// A wrapper colors leaf tiles by a categorical field and labels every tier.
// The SSR path used to (a) collapse every tile to one fill because the network
// hierarchy scene builder never resolves colorBy itself (that is the HOC
// nodeStyle's job), and (b) drop `labelMode`, so no parent/container label
// appeared.

interface HierarchyTreemapNode {
  name: string
  value?: number
  tier?: string
  children?: HierarchyTreemapNode[]
}

describe("Treemap — colorBy + hierarchy labels SSR parity", () => {
  const hierarchy: HierarchyTreemapNode = {
    name: "All",
    children: [
      {
        name: "Group A",
        children: [
          {
            name: "Zone 1",
            children: [
              { name: "item-a1", value: 142, tier: "primary" },
              { name: "item-a2", value: 12, tier: "backup" },
            ],
          },
        ],
      },
      {
        name: "Group B",
        children: [
          { name: "Zone 2", children: [{ name: "item-b1", value: 96, tier: "primary" }] },
        ],
      },
    ],
  }
  const props: TreemapProps<HierarchyTreemapNode> = {
    data: hierarchy,
    childrenAccessor: "children",
    valueAccessor: "value",
    colorBy: "tier",
    labelMode: "all",
    paddingTop: 18,
    showLabels: true,
    colorScheme: ["#0E9AA7", "#C2185B", "#7CB342"],
    width: 500,
    height: 340,
  }

  it("colorBy paints leaf tiles with distinct categorical fills", () => {
    const svg = renderChart("Treemap", props)
    const fills = uniqueFills(svg)
    // Both leaf tiers must appear — the bug collapsed every tile to scheme[0].
    expect(fills.has("#0E9AA7")).toBe(true) // primary
    expect(fills.has("#C2185B")).toBe(true) // backup
  })

  it("labelMode:'all' renders parent/container labels", () => {
    const svg = renderChart("Treemap", props)
    expect(svg.includes(">Group A<")).toBe(true)
    expect(svg.includes(">Group B<")).toBe(true)
  })

  it("labelMode:'leaf' (default) does not render parent labels", () => {
    const svg = renderChart("Treemap", { ...props, labelMode: "leaf" })
    expect(svg.includes(">Group A<")).toBe(false)
  })

  it("fills + parent labels agree with the live HOC's in-frame SSR", () => {
    const ssr = renderChart("Treemap", props)
    const inFrame = renderToString(<Treemap {...props} />)
    expect([...uniqueFills(ssr)].sort()).toEqual([...uniqueFills(inFrame)].sort())
    expect(inFrame.includes(">Group A<")).toBe(true)
  })

  it("custom nodeStyle (hide-root) still keeps colorBy fills + nested paddingTop bands", () => {
    // Downstream TreeMap hideRoot forces a nodeStyle that only paints the root
    // transparent. SSR used to *replace* the built-in color encoding with that
    // style, so every non-root tile collapsed to the default fill (looked flat).
    const hideRoot = (d: { depth?: number }) =>
      d.depth === 0 ? { fill: "transparent", pointerEvents: "none" as const } : {}
    const withHide = { ...props, nodeStyle: hideRoot }
    const svg = renderChart("Treemap", withHide)
    const fills = uniqueFills(svg)
    expect(fills.has("transparent")).toBe(true)
    expect(fills.has("#0E9AA7")).toBe(true) // primary tier
    expect(fills.has("#C2185B")).toBe(true) // backup tier
    // Nested header-band geometry: parent tiles start below the paddingTop band
    // (y ≈ 18 for depth-1), not a single flat partition of the plot.
    const ys = [...svg.matchAll(/<rect\b[^>]*\by="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(ys.some((y) => y >= 15 && y <= 25)).toBe(true)
    expect(svg.includes(">Group A<")).toBe(true)
  })

  it("serializes per-tile fill opacity so nested branch colors composite like canvas", () => {
    const svg = renderChart("Treemap", {
      ...props,
      nodeStyle: () => ({ fillOpacity: 0.45, strokeOpacity: 0.7 }),
    })

    expect(svg).toContain('fill-opacity="0.45"')
    expect(svg).toContain('stroke-opacity="0.7"')
  })

  it("keeps Treemap's default translucent cell borders in static SVG", () => {
    // The HOC sets this even when callers do not specify tile opacity. Those
    // nested border layers are visible in parent bands, so dropping it makes
    // an SSR band materially flatter/darker than the canvas rendering.
    const svg = renderChart("Treemap", props)
    expect(svg).toContain('stroke-opacity="0.8"')
  })
})

// ── RangeChart middleAccessor via svgAnnotationRules ──────────────────────
// Downstream RangeChart paints high/low as CandlestickChart range mode, then
// overlays a mean/median bulb+pill with custom svgAnnotationRules. The native
// dumbbell path was fixed for SSR; the custom rule path was still dropped.

describe("CandlestickChart — svgAnnotationRules middle overlay SSR parity", () => {
  const data = [
    { t: 1, high: 80, low: 40, middle: 60 },
    { t: 2, high: 90, low: 50, middle: 70 },
    { t: 3, high: 70, low: 30, middle: 50 },
  ]
  const middleAnnotations = data.map((d) => ({
    type: "range-middle",
    x: d.t,
    y: d.middle,
    color: "#DB2777",
  }))
  const middleRules = (
    ann: { type?: string; x?: number; y?: number; color?: string },
    _i: number,
    context: {
      scales?: { x?: (v: number) => number; y?: (v: number) => number } | null
    },
  ) => {
    if (ann.type !== "range-middle") return null
    const sx = context.scales?.x
    const sy = context.scales?.y
    if (!sx || !sy || ann.x == null || ann.y == null) return null
    const cx = sx(ann.x)
    const cy = sy(ann.y)
    return (
      <g key={`mid-${ann.x}`} className="range-middle-overlay" data-testid="range-middle">
        <circle cx={cx} cy={cy} r={5} fill={ann.color || "#DB2777"} />
        <rect x={cx - 10} y={cy - 4} width={20} height={8} rx={4} fill={ann.color || "#DB2777"} opacity={0.85} />
      </g>
    )
  }

  it("renderChart paints custom middle markers via svgAnnotationRules", () => {
    const svg = renderChart("CandlestickChart", {
      data,
      xAccessor: "t",
      highAccessor: "high",
      lowAccessor: "low",
      candlestickStyle: { rangeColor: "#6C4EE8" },
      annotations: middleAnnotations,
      svgAnnotationRules: middleRules,
      width: 440,
      height: 260,
    })
    // Native dumbbell still present.
    expect((svg.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(data.length * 2)
    // Custom middle overlays.
    expect(svg).toContain("range-middle-overlay")
    expect((svg.match(/range-middle-overlay/g) ?? []).length).toBe(data.length)
    expect(svg).toContain("#DB2777")
  })

  it("without svgAnnotationRules, custom middle types emit nothing", () => {
    const svg = renderChart("CandlestickChart", {
      data,
      xAccessor: "t",
      highAccessor: "high",
      lowAccessor: "low",
      annotations: middleAnnotations,
      width: 440,
      height: 260,
    })
    expect(svg).not.toContain("range-middle-overlay")
  })
})

// ── Geo svgAnnotationRules ────────────────────────────────────────────────
// GeoSVGOverlay previously hard-coded `undefined` for the user rule, and
// staticGeo never threaded svgAnnotationRules — so custom pins only appeared
// on CSR (and only if a consumer patched the overlay).

describe("ProportionalSymbolMap — geo svgAnnotationRules SSR parity", () => {
  const areas = [
    {
      type: "Feature" as const,
      properties: { name: "Region A", value: 100 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[-10, 40], [10, 40], [10, 50], [-10, 50], [-10, 40]]],
      },
    },
  ]
  const points = [
    { city: "Alpha", lon: 0, lat: 45, magnitude: 30 },
    { city: "Beta", lon: 5, lat: 48, magnitude: 50 },
  ]
  const pinRules = (
    ann: { type?: string; x?: number; y?: number; color?: string },
    i: number,
    context: { scales?: { x?: (v: number) => number; y?: (v: number) => number } | null },
  ) => {
    if (ann.type !== "geo-pin") return null
    const cx = context.scales?.x?.(ann.x as number)
    const cy = context.scales?.y?.(ann.y as number)
    if (cx == null || cy == null) return null
    return (
      <g key={`geo-pin-${i}`} className="geo-custom-pin">
        <circle cx={cx} cy={cy} r={8} fill={ann.color || "#DB2777"} />
      </g>
    )
  }
  const props = {
    points,
    areas,
    xAccessor: "lon" as const,
    yAccessor: "lat" as const,
    sizeBy: "magnitude" as const,
    annotations: [
      { type: "geo-pin", coordinates: [0, 45] as [number, number], color: "#DB2777" },
      { type: "geo-pin", coordinates: [5, 48] as [number, number], color: "#0E9AA7" },
    ],
    frameProps: { svgAnnotationRules: pinRules },
    width: 400,
    height: 280,
  }

  it("renderChart paints custom geo pins via svgAnnotationRules", () => {
    const svg = renderChart("ProportionalSymbolMap", props)
    expect(svg).toContain("geo-custom-pin")
    expect((svg.match(/geo-custom-pin/g) ?? []).length).toBe(2)
    expect(svg).toContain("#DB2777")
    expect(svg).toContain("#0E9AA7")
  })

  it("without svgAnnotationRules, custom geo-pin types emit nothing", () => {
    const { frameProps, ...plain } = props
    void frameProps
    const svg = renderChart("ProportionalSymbolMap", plain)
    expect(svg).not.toContain("geo-custom-pin")
  })

  it("in-frame HOC SSR also paints the custom pins", () => {
    const html = renderToString(<ProportionalSymbolMap {...props} />)
    expect(html).toContain("geo-custom-pin")
  })
})

// ── AreaChart semanticGradient ────────────────────────────────────────────
describe("AreaChart — semanticGradient SSR parity", () => {
  const props = {
    data: [
      { time: 0, value: 10 }, { time: 1, value: 45 }, { time: 2, value: 62 },
      { time: 3, value: 80 }, { time: 4, value: 99 },
    ],
    xAccessor: "time",
    yAccessor: "value",
    curve: "step" as const,
    semanticGradient: { stops: [
      { offset: 0.5, color: "#E5A800", opacity: 0.18 },
      { offset: 0.75, color: "#FF8000", opacity: 0.28 },
      { offset: 0.95, color: "#FF7077", opacity: 0.4 },
    ] },
    yExtent: [0, 100] as [number, number],
    width: 440,
    height: 260,
  }

  it("renderChart emits gradient stops with the semantic colors", () => {
    const svg = renderChart("AreaChart", props)
    expect(svg).toContain("<linearGradient")
    expect(svg).toContain("#E5A800")
    expect((svg.match(/<stop/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect(svg).toContain('stop-color="#E5A800"')
    expect(svg).toContain('stop-opacity="0.18"')
    expect(svg).toContain('stroke="#E5A800"')
    expect(svg).toContain('stroke="#FF8000"')
    expect(svg).toContain('stroke="#FF7077"')
  })

  it("semanticLine=false keeps the fill gradient but restores the normal top stroke", () => {
    const svg = renderChart("AreaChart", { ...props, semanticLine: false })
    expect(svg).toContain("<linearGradient")
    expect(svg).not.toContain('stroke="#E5A800"')
    expect(svg).not.toContain('stroke="#FF8000"')
    expect(svg).not.toContain('stroke="#FF7077"')
  })

  it("a plain AreaChart (no semanticGradient) emits no gradient", () => {
    const { semanticGradient, ...plain } = props
    void semanticGradient
    const svg = renderChart("AreaChart", plain)
    expect(svg).not.toContain("<linearGradient")
  })

  it("threshold-annotation labels get a legible (opaque) halo, not a transparent one", () => {
    // The default light theme background is "transparent"; a baked transparent
    // halo left a same-colored label invisible over the gradient. The halo must
    // fall back to the theme surface so the label reads on either path.
    const svg = renderChart("AreaChart", {
      ...props,
      annotations: [{ type: "y-threshold", value: 90, label: "Critical", color: "#FF7077" }],
    })
    const label = svg.match(/<text[^>]*>Critical<\/text>/)?.[0] ?? ""
    expect(label).toContain("stroke=")
    expect(label).not.toContain('stroke="transparent"')
  })
})

// ── Pie / Donut startAngle ────────────────────────────────────────────────
// startAngle rotates the first wedge. SSR dropped it (always started at 12
// o'clock), so the same config produced a different rotation than the HOC.

describe("PieChart / DonutChart — startAngle SSR parity", () => {
  const pieData = [ { c: "K", v: 45 }, { c: "F", v: 25 }, { c: "C", v: 30 } ]
  const base: PieChartProps<(typeof pieData)[number]> = {
    data: pieData,
    categoryAccessor: "c",
    valueAccessor: "v",
    colorScheme: ["#6C4EE8", "#0E9AA7", "#C2185B"],
    width: 300,
    height: 300,
  }

  it("PieChart startAngle changes the SSR wedge geometry", () => {
    expect(renderChart("PieChart", { ...base, startAngle: 0 }))
      .not.toBe(renderChart("PieChart", { ...base, startAngle: 90 }))
  })

  it("DonutChart startAngle changes the SSR wedge geometry", () => {
    expect(renderChart("DonutChart", { ...base, innerRadius: 70, startAngle: 0 }))
      .not.toBe(renderChart("DonutChart", { ...base, innerRadius: 70, startAngle: 90 }))
  })

  it("SSR wedge paths match the live HOC for a rotated pie", () => {
    const props = { ...base, startAngle: 90 }
    const ssrArcs = (renderChart("PieChart", props).match(/<path/g) ?? []).length
    const hocArcs = (renderToString(<PieChart {...props} />).match(/<path/g) ?? []).length
    expect(ssrArcs).toBeGreaterThan(0)
    expect(ssrArcs).toBe(hocArcs)
    // Silence unused-import lint for DonutChart in-frame parity (exercised above).
    expect(renderToString(<DonutChart {...props} innerRadius={70} />)).toContain("<svg")
  })
})

// ── LineChart band (SSR presence + curve interpolation) ───────────────────
// SSR dropped `band` entirely; the ribbon also ignored the line's curve, so it
// drew straight edges under a curved line. Both are fixed together.

describe("LineChart — band SSR parity", () => {
  const bandData = [
    { t: 0, v: 10, s: "A", lo: 5, hi: 15 }, { t: 1, v: 25, s: "A", lo: 18, hi: 32 },
    { t: 2, v: 18, s: "A", lo: 12, hi: 24 }, { t: 3, v: 30, s: "A", lo: 22, hi: 38 },
  ]
  const props: LineChartProps<(typeof bandData)[number]> = {
    data: bandData,
    xAccessor: "t",
    yAccessor: "v",
    lineBy: "s",
    curve: "monotoneX",
    band: { y0Accessor: "lo", y1Accessor: "hi" },
    width: 400,
    height: 240,
  }

  it("renderChart paints the band as a filled ribbon that follows the curve", () => {
    const svg = renderChart("LineChart", props)
    // A filled ribbon (lines are fill:none) whose path carries cubic commands.
    expect(svg).toMatch(/<path\b[^>]*d="M[^"]*C[^"]*"[^>]*fill="(?!none)/)
  })

  it("a linear-curve band renders straight (no cubic commands in the ribbon)", () => {
    const svg = renderChart("LineChart", { ...props, curve: "linear" })
    // Opening tags of filled paths (the ribbon; lines are fill:none).
    const filledPaths = svg.match(/<path\b[^>]*fill="(?!none)[^"]+"[^>]*>/g) ?? []
    expect(filledPaths.length).toBeGreaterThan(0) // the band still renders…
    expect(filledPaths.some((p) => /d="[^"]*C/.test(p))).toBe(false) // …but straight
  })

  it("band ribbon count matches the live HOC's in-frame SSR", () => {
    const filled = (svg: string) => (svg.match(/<path\b[^>]*fill="(?!none)[^"]+"/g) ?? []).length
    expect(filled(renderChart("LineChart", props))).toBe(filled(renderToString(<LineChart {...props} />)))
  })
})

// ── Vertical band + threshold annotations (x-band / x-threshold) ──────────
// Native vertical-region + vertical-line annotations must serialize in SSR and
// match the canvas. (The library-native equivalent of a downstream chart's
// bespoke "vertical bands + annotations" that dropped out server-side.)

describe("LineChart — x-band / x-threshold SSR", () => {
  const props = {
    data: [
      { x: 0, y: 12 }, { x: 1, y: 17 }, { x: 2, y: 15 }, { x: 3, y: 8 },
      { x: 4, y: 3 }, { x: 5, y: 4 }, { x: 6, y: 3 }, { x: 7, y: 4 },
    ],
    xAccessor: "x",
    yAccessor: "y",
    annotations: [
      { type: "x-band", x0: 0, x1: 3, label: "Catch-up window", fill: "#6C4EE8", fillOpacity: 0.15 },
      { type: "x-threshold", value: 3, label: "Caught up", color: "#DB2777" },
    ],
    width: 460,
    height: 280,
  }

  it("renders the band region, the dashed threshold line, and both labels in SSR", () => {
    const svg = renderChart("LineChart", props)
    expect(svg).toContain("Catch-up window")
    expect(svg).toContain("Caught up")
    expect(svg).toMatch(/stroke-dasharray/)
  })

  it("an x-band label without explicit color uses the theme primary (matches canvas), not text", () => {
    // Default theme primary #00a2ce vs text #333: SSR used to fall back to text
    // while the canvas x-band label defaults to --semiotic-primary.
    const svg = renderChart("LineChart", {
      ...props,
      annotations: [{ type: "x-band", x0: 0, x1: 2, label: "Phase" }],
    })
    const label = svg.match(/<text[^>]*>Phase<\/text>/)?.[0] ?? ""
    expect(label).toContain('fill="#00a2ce"')
  })
})

/**
 * Top-level primitive styling (`stroke` / `strokeWidth` / `opacity`) in SSR.
 *
 * Only charts whose HOC actually implements the primitives (via
 * `mergeShapeStyle` / `useOrdinalPieceStyle` / `useXYPointStyle`) belong in the
 * table below. Heatmap and DifferenceChart deliberately do NOT — Heatmap
 * exposes cell borders through `cellBorderColor`/`cellBorderWidth` and
 * DifferenceChart owns its A/B series colors — so teaching only the server path
 * to honor them would make the static SVG diverge from the canvas instead of
 * matching it.
 *
 * The AI reference contract: these "apply to any shape the chart draws", resolved
 * last so they beat `frameProps.*Style`, the HOC base, and the theme. Every
 * shape-drawing HOC implements that with `mergeShapeStyle`; a server
 * `ChartConfig.buildProps` that builds its style function *without* the same
 * overlay drops the whole channel, and the static SVG comes back byte-identical
 * to an unstyled render while the canvas honors it.
 *
 * A downstream SSR consumer reported this for Heatmap and Treemap. Sweeping
 * every server-renderable chart found the same omission in ten more, so this
 * table gates the class rather than the two reported instances.
 */
describe("SSR honors top-level primitive styling", () => {
  const PRIMITIVES = { stroke: "#00ff00", strokeWidth: 6, opacity: 0.4 }
  const tree = { name: "r", children: [{ name: "a", value: 10 }, { name: "b", value: 6 }] }
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }]
  const edges = [{ source: "a", target: "b", value: 5 }, { source: "b", target: "c", value: 3 }]

  const cases: Array<[string, Record<string, unknown>]> = [
    ["Treemap", { data: tree, valueAccessor: "value" }],
    ["CirclePack", { data: tree, valueAccessor: "value" }],
    ["TreeDiagram", { data: tree }],
    ["ForceDirectedGraph", { nodes, edges }],
    ["SankeyDiagram", { nodes, edges, valueAccessor: "value" }],
    ["ChordDiagram", { nodes, edges, valueAccessor: "value" }],
    ["GaugeChart", { value: 42 }],
    ["LikertChart", {
      // Needs `levels` plus rows on both sides of neutral: a degenerate
      // Likert config renders empty, which would pass the table vacuously.
      data: [
        { q: "Clarity", level: "Disagree", n: 8 },
        { q: "Clarity", level: "Neutral", n: 12 },
        { q: "Clarity", level: "Agree", n: 28 },
        { q: "Trust", level: "Disagree", n: 10 },
        { q: "Trust", level: "Neutral", n: 16 },
        { q: "Trust", level: "Agree", n: 22 },
      ],
      categoryAccessor: "q", levelAccessor: "level", countAccessor: "n",
      levels: ["Disagree", "Neutral", "Agree"],
    }],
    ["ConnectedScatterplot", { data: [{ x: 0, y: 1 }, { x: 1, y: 4 }], xAccessor: "x", yAccessor: "y" }],
    ["StackedAreaChart", {
      data: [{ x: 0, y: 5, s: "a" }, { x: 1, y: 7, s: "a" }, { x: 0, y: 3, s: "b" }, { x: 1, y: 9, s: "b" }],
      xAccessor: "x", yAccessor: "y", areaBy: "s",
    }],
    ["BarChart", { data: [{ c: "AMER", v: 42 }, { c: "EMEA", v: 33 }], categoryAccessor: "c", valueAccessor: "v" }],
    ["LineChart", { data: [{ x: 0, y: 1 }, { x: 1, y: 4 }], xAccessor: "x", yAccessor: "y" }],
  ]

  it.each(cases)("%s emits the caller's stroke", (component, props) => {
    const styled = renderChart(component as Parameters<typeof renderChart>[0], { ...props, ...PRIMITIVES })
    const plain = renderChart(component as Parameters<typeof renderChart>[0], { ...props })
    // Guard against a vacuous pass: an empty render is byte-identical for
    // reasons that have nothing to do with styling.
    expect(renderChartWithEvidence(component as Parameters<typeof renderChart>[0], { ...props }).evidence.empty).toBe(false)
    expect(styled).not.toBe(plain)
    expect(styled).toContain("#00ff00")
  })

  it("Heatmap cell borders reach the static SVG", () => {
    const props = {
      data: [{ x: "a", y: "p", v: 1 }, { x: "b", y: "q", v: 5 }],
      xAccessor: "x", yAccessor: "y", valueAccessor: "v",
    }
    // The HOC turns cellBorderColor/cellBorderWidth into an areaStyle; SSR used
    // to forward a bare `cellBorderColor` that no consumer read.
    const svg = renderChart("Heatmap", { ...props, cellBorderColor: "#ff0000", cellBorderWidth: 4 })
    expect(svg).toContain('stroke="#ff0000"')
    expect(svg).toContain('stroke-width="4"')
    // Default matches the HOC's "#fff" / 1 rather than an unstroked cell.
    expect(renderChart("Heatmap", props)).toContain('stroke="#fff"')
  })

  it("a bottom legend is placed outside the bottom axis chrome", () => {
    const props = {
      data: [
        { category: "alpha", value: 4, series: "one" }, { category: "alpha", value: 6, series: "two" },
        { category: "beta", value: 3, series: "one" }, { category: "beta", value: 8, series: "two" },
      ],
      categoryAccessor: "category", valueAccessor: "value", stackBy: "series",
      showLegend: true, legendPosition: "bottom" as const, width: 400, height: 300,
    }
    // Resolve each <text> to an absolute y by accumulating enclosing
    // translate()s — the axis ticks and the legend live in different groups,
    // so their raw `y` attributes are not comparable.
    const absoluteTextY = (svg: string, label: string): number => {
      const stack = [0]
      let found = NaN
      const token = /<g\b[^>]*?>|<\/g>|<text\b[^>]*?>([^<]*)</g
      let m: RegExpExecArray | null
      while ((m = token.exec(svg))) {
        if (m[0] === "</g>") { stack.pop(); continue }
        const top = stack[stack.length - 1]
        if (m[0].startsWith("<g")) {
          const tr = /transform="translate\((-?[\d.]+)[, ]\s*(-?[\d.]+)\)"/.exec(m[0])
          stack.push(top + (tr ? Number(tr[2]) : 0))
          continue
        }
        if (m[1] === label) found = top + Number(/\by="(-?[\d.]+)"/.exec(m[0])?.[1] ?? 0)
      }
      return found
    }
    const gap = (svg: string) => absoluteTextY(svg, "one") - absoluteTextY(svg, "alpha")

    // Default reserves the 22px tick-label band; `axisGutter: 0` restores the
    // pre-3.8.7 plot-edge anchoring for callers who laid out around it.
    expect(gap(renderChart("StackedBarChart", props))).toBe(22)
    expect(gap(renderChart("StackedBarChart", {
      ...props, legendLayout: { axisGutter: 0 },
    }))).toBe(0)
    // An axis title pushes the band out further still.
    expect(gap(renderChart("StackedBarChart", {
      ...props, categoryLabel: "Region",
    }))).toBe(46)
  })
})
