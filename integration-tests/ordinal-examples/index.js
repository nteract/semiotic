import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"
import {
  barData,
  stackedBarData,
  groupedBarData,
  statisticalData,
  colors
} from "../test-data.js"

const {
  BarChart,
  StackedBarChart,
  GroupedBarChart,
  SwimlaneChart,
  PieChart,
  DonutChart,
  GaugeChart,
  SwarmPlot,
  BoxPlot,
  ViolinPlot,
  Histogram,
  DotPlot,
  RidgelinePlot
} = Semiotic

const TestCase = ({ title, children, testId, key }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: key || testId },
    React.createElement("h2", null, title),
    children
  )

// Dedicated dataset for the valueExtent matrix: deterministic, three
// categories with means well above 0, no near-zero outliers, no values
// >120. Each variant of the override (both/min/max) needs to land on a
// visibly different axis layout — `statisticalData`'s tail dipping to
// ~3 in Group A made the "min only" case look identical to no-override
// (the data already started near 0). This dataset's data min sits at
// ~40, so anchoring `valueExtent[0]` to 0 pulls the axis down clearly.
const extentSwarmData = (() => {
  const out = []
  const groups = ["Group A", "Group B", "Group C"]
  const means = [55, 75, 60]
  // Deterministic seeded jitter so snapshots are pixel-stable across runs.
  let s = 1
  const rng = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  for (let g = 0; g < groups.length; g++) {
    for (let i = 0; i < 24; i++) {
      // Uniform-ish jitter within ±10 of the group mean keeps every
      // value in [40, 90] — well above 0, well below 120.
      const v = means[g] + (rng() - 0.5) * 20
      out.push({ category: groups[g], value: Math.round(v * 10) / 10 })
    }
  }
  return out
})()

const examples = [
  // 1. Vertical Bar Chart
  TestCase({
    title: "Vertical Bars",
    testId: "ordinal-bars-vertical",
    children: React.createElement(BarChart, {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 2. Horizontal Bar Chart
  TestCase({
    title: "Horizontal Bars",
    testId: "ordinal-bars-horizontal",
    children: React.createElement(BarChart, {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      orientation: "horizontal",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 3. Stacked Bar Chart
  TestCase({
    title: "Stacked Bars",
    testId: "ordinal-bars-stacked",
    children: React.createElement(StackedBarChart, {
      data: stackedBarData,
      categoryAccessor: "category",
      stackBy: "type",
      valueAccessor: "value",
      colorBy: "type",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 4. Grouped Bar Chart
  TestCase({
    title: "Grouped Bars",
    testId: "ordinal-bars-grouped",
    children: React.createElement(GroupedBarChart, {
      data: groupedBarData,
      categoryAccessor: "category",
      groupBy: "product",
      valueAccessor: "value",
      colorBy: "product",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 5. Pie Chart
  TestCase({
    title: "Pie Chart",
    testId: "ordinal-pie",
    children: React.createElement(PieChart, {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 400,
      colorScheme: colors
    })
  }),

  // 6. Donut Chart
  TestCase({
    title: "Donut Chart",
    testId: "ordinal-donut",
    children: React.createElement(DonutChart, {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      innerRadius: 60,
      width: 400,
      height: 400,
      colorScheme: colors
    })
  }),

  // 7. Swarm Plot
  TestCase({
    title: "Swarm Plot",
    testId: "ordinal-swarm",
    children: React.createElement(SwarmPlot, {
      data: statisticalData,
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "category",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 8. Box Plot
  TestCase({
    title: "Box Plot",
    testId: "ordinal-boxplot",
    children: React.createElement(BoxPlot, {
      data: statisticalData,
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "category",
      showOutliers: true,
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 9. Violin Plot
  TestCase({
    title: "Violin Plot",
    testId: "ordinal-violin",
    children: React.createElement(ViolinPlot, {
      data: statisticalData,
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "category",
      showIQR: true,
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 10. Histogram
  TestCase({
    title: "Histogram",
    testId: "ordinal-histogram",
    children: React.createElement(Histogram, {
      data: statisticalData,
      categoryAccessor: "category",
      valueAccessor: "value",
      bins: 15,
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 11. Bar Chart with Hover
  TestCase({
    title: "Bars with Hover",
    testId: "ordinal-bars-hover",
    children: React.createElement(BarChart, {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      enableHover: true,
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),
  // Swimlane with category ticks
  TestCase({
    title: "Swimlane (with labels)",
    testId: "ord-swimlane",
    children: React.createElement(SwimlaneChart, {
      data: [
        { lane: "A", task: "Design", value: 3 },
        { lane: "A", task: "Dev", value: 5 },
        { lane: "B", task: "Design", value: 2 },
        { lane: "B", task: "QA", value: 4 },
        { lane: "C", task: "Dev", value: 6 },
      ],
      categoryAccessor: "lane",
      subcategoryAccessor: "task",
      valueAccessor: "value",
      colorBy: "task",
      orientation: "horizontal",
      width: 400,
      height: 200,
    })
  }),
  // Swimlane gradient + dashed x-threshold annotation (primary mode)
  // Single-lane budget bar: solid grey 0-50%, then yellow→orange→red
  // gradient 50-75%, with an unlabeled dashed line at 50% (the threshold).
  // The light-grey "track" behind the bar spans the full 0-100 value range
  // and is theme-aware via --semiotic-grid.
  TestCase({
    title: "Swimlane (gradient + threshold)",
    testId: "ord-swimlane-gradient",
    children: React.createElement(SwimlaneChart, {
      data: [{ lane: "Budget", phase: "spend", value: 75 }],
      categoryAccessor: "lane",
      subcategoryAccessor: "phase",
      valueAccessor: "value",
      orientation: "horizontal",
      showCategoryTicks: true,
      showLegend: false,
      // Width fits within the 380px test-grid content area (420 column - 20*2 padding)
      // so the chart doesn't overflow into the adjacent sparkline test case.
      width: 360,
      height: 120,
      margin: { left: 70, right: 20, top: 10, bottom: 30 },
      frameProps: { rExtent: [0, 100] },
      // Track sized to the lane's bandwidth. Semi-transparent neutral grey
      // contrasts in both light and dark mode without flipping black/white.
      trackFill: "rgba(127, 127, 127, 0.25)",
      gradientFill: {
        colorStops: [
          { offset: 0, color: "#9ca3af" },
          { offset: 50 / 75, color: "#9ca3af" },
          { offset: 50 / 75, color: "#fbbf24" },
          { offset: 62.5 / 75, color: "#f97316" },
          { offset: 1, color: "#dc2626" },
        ],
      },
      annotations: [
        { type: "x-threshold", value: 50, color: "var(--semiotic-text, #374151)", strokeWidth: 1.5 },
      ],
    })
  }),
  // Same gradient + threshold composition in sparkline mode — chrome
  // strips, track + gradient + dashed threshold remain. Inline status
  // indicator suitable for tables and compact dashboards.
  TestCase({
    title: "Swimlane (gradient + threshold, sparkline)",
    testId: "ord-swimlane-gradient-sparkline",
    children: React.createElement(SwimlaneChart, {
      mode: "sparkline",
      data: [{ lane: "spend", phase: "spend", value: 75 }],
      categoryAccessor: "lane",
      subcategoryAccessor: "phase",
      valueAccessor: "value",
      orientation: "horizontal",
      width: 240,
      height: 20,
      frameProps: { rExtent: [0, 100] },
      trackFill: "rgba(127, 127, 127, 0.25)",
      gradientFill: {
        colorStops: [
          { offset: 0, color: "#9ca3af" },
          { offset: 50 / 75, color: "#9ca3af" },
          { offset: 50 / 75, color: "#fbbf24" },
          { offset: 62.5 / 75, color: "#f97316" },
          { offset: 1, color: "#dc2626" },
        ],
      },
      annotations: [
        { type: "x-threshold", value: 50, color: "var(--semiotic-text, #374151)", strokeWidth: 1.5 },
      ],
    })
  }),
  // Swimlane WITHOUT category ticks
  TestCase({
    title: "Swimlane (no labels)",
    testId: "ord-swimlane-no-ticks",
    children: React.createElement(SwimlaneChart, {
      data: [
        { lane: "A", task: "Design", value: 3 },
        { lane: "A", task: "Dev", value: 5 },
        { lane: "B", task: "Design", value: 2 },
        { lane: "B", task: "QA", value: 4 },
        { lane: "C", task: "Dev", value: 6 },
      ],
      categoryAccessor: "lane",
      subcategoryAccessor: "task",
      valueAccessor: "value",
      colorBy: "task",
      orientation: "horizontal",
      showCategoryTicks: false,
      width: 400,
      height: 150,
    })
  }),
  // Gauge 180° half-circle
  TestCase({
    title: "Gauge 180° (half circle)",
    testId: "ord-gauge-180",
    children: React.createElement(GaugeChart, {
      value: 65,
      min: 0,
      max: 100,
      sweep: 180,
      thresholds: [
        { value: 50, color: "#d73027" },
        { value: 75, color: "#fc8d59" },
        { value: 100, color: "#4575b4" },
      ],
      width: 300,
      height: 200,
    })
  }),
  // Election needle (180° with fillZones=false)
  TestCase({
    title: "Election Needle",
    testId: "ord-gauge-needle",
    children: React.createElement(GaugeChart, {
      value: 53,
      min: 40,
      max: 60,
      sweep: 180,
      arcWidth: 0.15,
      fillZones: false,
      showNeedle: true,
      needleColor: "#222",
      showScaleLabels: false,
      thresholds: [
        { value: 45, color: "#d73027" },
        { value: 48, color: "#fc8d59" },
        { value: 52, color: "#ccc" },
        { value: 55, color: "#91bfdb" },
        { value: 60, color: "#4575b4" },
      ],
      width: 360,
      height: 200,
    })
  }),
  // Gauge 240° default
  TestCase({
    title: "Gauge 240° (default)",
    testId: "ord-gauge-240",
    children: React.createElement(GaugeChart, {
      value: 72,
      min: 0,
      max: 100,
      thresholds: [
        { value: 50, color: "#4caf50" },
        { value: 80, color: "#ff9800" },
        { value: 100, color: "#f44336" },
      ],
      width: 300,
      height: 250,
    })
  }),

  // ── Default-theme HOC coverage backfill ─────────────────────────────
  // One snapshot per public Ordinal HOC that didn't already have one.
  // Mirrors the XY-family backfill — keeps the regression gate honest
  // as new chart families are added.

  TestCase({
    title: "Dot Plot",
    testId: "ordinal-dotplot",
    children: React.createElement(DotPlot, {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 400,
      height: 300,
    })
  }),

  TestCase({
    title: "Ridgeline Plot",
    testId: "ordinal-ridgeline",
    children: React.createElement(RidgelinePlot, {
      data: statisticalData,
      categoryAccessor: "category",
      valueAccessor: "value",
      bins: 18,
      width: 400,
      height: 300,
      colorScheme: colors,
    })
  }),

  // ── valueExtent override variants ─────────────────────────────────
  // SwarmPlot's `valueExtent` prop maps to the frame's `rExtent` (the
  // value-axis domain). Each variant exercises one shape:
  //   • [min, max] — both bounds pinned (axis runs 0–120)
  //   • [min, undefined] — only the min pinned, max stays data-derived
  //   • [undefined, max] — only the max pinned, min stays data-derived
  //
  // SwarmPlot is the right fixture for this matrix (not BarChart) —
  // bar charts intentionally anchor the value axis at 0 regardless of
  // the rExtent min, so a "min only" override there would look
  // identical to a "both" override and the matrix wouldn't actually
  // distinguish the three shapes.
  //
  // `extentSwarmData` clusters its values in [40, 90] with no near-zero
  // outliers — the original `statisticalData` had a 3.5σ tail dipping
  // to ~3, which made the "min only" case look identical to the
  // no-override default (the data already touched zero). The dedicated
  // dataset guarantees each variant lands on a visibly different axis
  // layout: a clear gap between 0 and the lowest dot in the min-only
  // case, axis above the data top in the max-only case, and a tall
  // empty band above 90 in the both-pinned case.
  TestCase({
    title: "SwarmPlot (valueExtent both)",
    testId: "ordinal-swarm-extent-both",
    children: React.createElement(SwarmPlot, {
      data: extentSwarmData,
      categoryAccessor: "category",
      valueAccessor: "value",
      valueExtent: [0, 120],
      width: 380,
      height: 280,
      colorScheme: colors,
    })
  }),
  TestCase({
    title: "SwarmPlot (valueExtent min only)",
    testId: "ordinal-swarm-extent-min",
    children: React.createElement(SwarmPlot, {
      data: extentSwarmData,
      categoryAccessor: "category",
      valueAccessor: "value",
      // `undefined` upper bound → data max wins (~85), so the dots use
      // most of the upper chart but the axis anchors at 0 — there's a
      // clear gap between 0 and the lowest dot. Without the override
      // the axis would auto-fit to the data min (~40).
      valueExtent: [0, undefined],
      width: 380,
      height: 280,
      colorScheme: colors,
    })
  }),
  TestCase({
    title: "SwarmPlot (valueExtent max only)",
    testId: "ordinal-swarm-extent-max",
    children: React.createElement(SwarmPlot, {
      data: extentSwarmData,
      categoryAccessor: "category",
      valueAccessor: "value",
      valueExtent: [undefined, 200],
      width: 380,
      height: 280,
      colorScheme: colors,
    })
  }),

  // Histogram precedence fixture — user `valueExtent` MUST win over the
  // auto-computed shared bin extent, otherwise pinning the axis to a
  // known range so streamed updates don't shift bins is impossible.
  // The data spans ~20-90; pinning to [0, 120] reveals empty bands at
  // both ends. A regression that drops the precedence would re-fit the
  // domain to [data.min, data.max] and lose the empty bands.
  TestCase({
    title: "Histogram (valueExtent both)",
    testId: "ordinal-histogram-extent",
    children: React.createElement(Histogram, {
      data: extentSwarmData,
      categoryAccessor: "category",
      valueAccessor: "value",
      valueExtent: [0, 120],
      bins: 15,
      width: 380,
      height: 280,
      colorScheme: colors,
    })
  })
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
