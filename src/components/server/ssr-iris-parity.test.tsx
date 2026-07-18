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
})

// ── AreaChart semanticGradient ────────────────────────────────────────────
// A value-anchored gradient (`{ at, color }` on the value scale) resolves to a
// gradientFill.colorStops before reaching the frame. SSR used to drop it.

describe("AreaChart — semanticGradient SSR parity", () => {
  const props = {
    data: [
      { time: 0, value: 10 }, { time: 1, value: 45 }, { time: 2, value: 62 },
      { time: 3, value: 80 }, { time: 4, value: 95 },
    ],
    xAccessor: "time",
    yAccessor: "value",
    curve: "step" as const,
    semanticGradient: [
      { at: 50, color: "#E5A800" },
      { at: 75, color: "#FF8000" },
      { at: 95, color: "#FF7077" },
    ],
    yExtent: [0, 100] as [number, number],
    width: 440,
    height: 260,
  }

  it("renderChart emits a colorStops gradient with the semantic colors", () => {
    const svg = renderChart("AreaChart", props)
    expect(svg).toContain("<linearGradient")
    expect(svg).toContain("#E5A800")
    expect((svg.match(/<stop/g) ?? []).length).toBeGreaterThanOrEqual(3)
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
