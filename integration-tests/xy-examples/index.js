import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { lineData, scatterData, areaData, colors } from "../test-data.js"

const {
  LineChart,
  AreaChart,
  StackedAreaChart,
  Scatterplot,
  BubbleChart,
  ConnectedScatterplot,
  QuadrantChart,
  MultiAxisLineChart,
  ScatterplotMatrix,
  MinimapChart,
  StreamXYFrame
} = Semiotic

const TestCase = ({ title, children, testId, key }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: key || testId },
    React.createElement("h2", null, title),
    children
  )

const examples = [
  // 1. Basic Line Chart
  TestCase({
    title: "Line Chart",
    testId: "xy-line",
    children: React.createElement(LineChart, {
      data: lineData,
      xAccessor: "x",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 2. Line Chart with Points
  TestCase({
    title: "Line Chart with Points",
    testId: "xy-line-points",
    children: React.createElement(LineChart, {
      data: lineData,
      xAccessor: "x",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      showPoints: true,
      pointRadius: 4,
      curve: "monotoneX",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 3. Area Chart
  TestCase({
    title: "Area Chart",
    testId: "xy-area",
    children: React.createElement(AreaChart, {
      data: areaData,
      xAccessor: "x",
      yAccessor: "y",
      areaBy: "series",
      colorBy: "series",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 4. Scatter Plot
  TestCase({
    title: "Scatter Plot",
    testId: "xy-scatter",
    children: React.createElement(Scatterplot, {
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
      pointRadius: 5,
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 5. Bubble Chart
  TestCase({
    title: "Bubble Chart",
    testId: "xy-bubble",
    children: React.createElement(BubbleChart, {
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      sizeBy: "size",
      colorBy: "category",
      sizeRange: [3, 20],
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 6. Line Chart with Fill Area
  TestCase({
    title: "Line with Fill Area",
    testId: "xy-line-fill",
    children: React.createElement(LineChart, {
      data: lineData.filter((d) => d.series === "A"),
      xAccessor: "x",
      yAccessor: "value",
      fillArea: true,
      areaOpacity: 0.3,
      curve: "monotoneX",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 7. Scatter Plot with Hover
  TestCase({
    title: "Scatter with Hover",
    testId: "xy-scatter-hover",
    children: React.createElement(Scatterplot, {
      data: scatterData.slice(0, 20),
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
      pointRadius: 6,
      enableHover: true,
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),
  // Landmark ticks with xScaleType="time"
  TestCase({
    title: "Landmark Ticks (scaleTime)",
    testId: "xy-landmark-ticks",
    children: React.createElement(StreamXYFrame, {
      chartType: "line",
      data: [{
        label: "Metric",
        coordinates: Array.from({ length: 90 }, (_, i) => {
          const d = new Date(2024, 0, 1)
          d.setDate(d.getDate() + i)
          return { date: d.getTime(), value: 100 + Math.sin(i * 0.1) * 40 }
        }),
      }],
      lineDataAccessor: "coordinates",
      xAccessor: "date",
      xScaleType: "time",
      yAccessor: "value",
      lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
      showAxes: true,
      axes: [
        { orient: "left" },
        {
          orient: "bottom",
          landmarkTicks: true,
          tickFormat: function(d) {
            var date = new Date(d)
            return date.toLocaleString("en", { month: "short" }) + " " + date.getDate()
          },
          ticks: 8,
        },
      ],
      size: [500, 250],
      margin: { top: 20, bottom: 50, left: 60, right: 20 },
    })
  }),
  // Auto-rotate with long date labels
  TestCase({
    title: "Auto-Rotate Labels",
    testId: "xy-auto-rotate",
    children: React.createElement(StreamXYFrame, {
      chartType: "line",
      data: [{
        label: "Metric",
        coordinates: Array.from({ length: 90 }, (_, i) => {
          const d = new Date(2024, 0, 1)
          d.setDate(d.getDate() + i)
          return { date: d.getTime(), value: 100 + Math.sin(i * 0.1) * 40 }
        }),
      }],
      lineDataAccessor: "coordinates",
      xAccessor: "date",
      xScaleType: "time",
      yAccessor: "value",
      lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
      showAxes: true,
      axes: [
        { orient: "left" },
        {
          orient: "bottom",
          autoRotate: true,
          ticks: 8,
          tickFormat: function(d) {
            var date = new Date(d)
            return date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
          },
        },
      ],
      size: [300, 250],
      margin: { top: 10, bottom: 100, left: 50, right: 10 },
    })
  }),
  // Range plot (candlestick with only high/low)
  TestCase({
    title: "Range Plot",
    testId: "xy-range-plot",
    children: React.createElement(StreamXYFrame, {
      chartType: "candlestick",
      data: [
        { day: 1, high: 85, low: 42 },
        { day: 2, high: 78, low: 55 },
        { day: 3, high: 92, low: 38 },
        { day: 4, high: 68, low: 45 },
        { day: 5, high: 95, low: 60 },
      ],
      xAccessor: "day",
      highAccessor: "high",
      lowAccessor: "low",
      candlestickStyle: { rangeColor: "#6366f1", wickWidth: 2 },
      showAxes: true,
      enableHover: true,
      size: [400, 250],
      margin: { top: 20, bottom: 40, left: 50, right: 20 },
    })
  }),

  // ── Default-theme HOC coverage backfill ─────────────────────────────
  // One snapshot per public XY HOC that didn't already have one. Keeps
  // the regression gate honest as new chart families are added.

  TestCase({
    title: "Stacked Area Chart",
    testId: "xy-stacked-area",
    children: React.createElement(StackedAreaChart, {
      data: lineData,
      xAccessor: "x",
      yAccessor: "value",
      areaBy: "series",
      colorBy: "series",
      width: 400,
      height: 300,
      colorScheme: colors,
    }),
  }),

  TestCase({
    title: "Connected Scatterplot",
    testId: "xy-connected-scatter",
    children: React.createElement(ConnectedScatterplot, {
      data: scatterData.slice(0, 12),
      xAccessor: "x",
      yAccessor: "y",
      orderAccessor: "x",
      pointRadius: 5,
      width: 400,
      height: 300,
    }),
  }),

  TestCase({
    title: "Quadrant Chart",
    testId: "xy-quadrant",
    children: React.createElement(QuadrantChart, {
      data: scatterData.slice(0, 30),
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
      // Center the quadrants on the median-ish point of the deterministic
      // fixture so all four quadrants have at least one point.
      xCenter: 50,
      yCenter: 45,
      // `quadrants` is required — the four labeled, colored backgrounds
      // are the entire point of the chart type.
      quadrants: {
        topRight:    { label: "High / High", color: "#dcfce7" },
        topLeft:     { label: "Low / High",  color: "#fef3c7" },
        bottomRight: { label: "High / Low",  color: "#dbeafe" },
        bottomLeft:  { label: "Low / Low",   color: "#fee2e2" },
      },
      pointRadius: 5,
      width: 400,
      height: 300,
      colorScheme: colors,
    }),
  }),

  TestCase({
    title: "Multi-Axis Line Chart",
    testId: "xy-multi-axis-line",
    children: React.createElement(MultiAxisLineChart, {
      data: [
        { t: 0, revenue: 100, latency: 220 },
        { t: 1, revenue: 140, latency: 210 },
        { t: 2, revenue: 130, latency: 240 },
        { t: 3, revenue: 180, latency: 200 },
        { t: 4, revenue: 220, latency: 180 },
      ],
      xAccessor: "t",
      series: [
        { yAccessor: "revenue", label: "Revenue", color: "#1f77b4" },
        { yAccessor: "latency", label: "Latency (ms)", color: "#d62728" },
      ],
      width: 400,
      height: 300,
    }),
  }),

  TestCase({
    title: "Scatterplot Matrix",
    testId: "xy-scatter-matrix",
    children: React.createElement(ScatterplotMatrix, {
      data: scatterData.slice(0, 30),
      fields: ["x", "y", "size"],
      colorBy: "category",
      width: 400,
      height: 400,
      colorScheme: colors,
    }),
  }),

  TestCase({
    title: "Minimap Chart",
    testId: "xy-minimap",
    children: React.createElement(MinimapChart, {
      data: lineData.filter((d) => d.series === "A"),
      xAccessor: "x",
      yAccessor: "value",
      width: 500,
      height: 300,
      // Render in its default (no brush selection) state — the snapshot
      // captures both the overview strip and the detail viewport.
      colorScheme: colors,
    }),
  }),

  // ── Interaction-state fixtures ──────────────────────────────────────
  // One fixture per interaction the visual snapshot suite should
  // exercise: hoverHighlight (dim non-hovered series), brush (drag a
  // selection rectangle), legend isolate (click a legend item to
  // isolate its series). Mirrors the existing `xy-scatter-hover`
  // pattern; the matching tests live in xy-frame.spec.ts under a new
  // "Interaction states" describe.

  TestCase({
    title: "Hover Highlight (multi-line)",
    testId: "xy-hover-highlight",
    children: React.createElement(LineChart, {
      data: lineData,
      xAccessor: "x",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      hoverHighlight: true,
      enableHover: true,
      width: 400,
      height: 300,
      colorScheme: colors,
    }),
  }),

  TestCase({
    title: "Brush Selection (scatter)",
    testId: "xy-brush",
    children: React.createElement(Scatterplot, {
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
      pointRadius: 5,
      // `linkedBrush` enables the SVG brush overlay even with no
      // cross-chart consumer — the brush rect renders + onBrush
      // fires. The test drags a rect across part of the chart and
      // snapshots the resulting selection state.
      linkedBrush: { name: "xy-brush-fixture", xField: "x", yField: "y" },
      width: 400,
      height: 300,
      colorScheme: colors,
    }),
  }),

  TestCase({
    title: "Legend Isolate (multi-line)",
    testId: "xy-legend-isolate",
    children: React.createElement(LineChart, {
      data: lineData,
      xAccessor: "x",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      showLegend: true,
      legendInteraction: "isolate",
      width: 400,
      height: 300,
      colorScheme: colors,
    }),
  }),
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
