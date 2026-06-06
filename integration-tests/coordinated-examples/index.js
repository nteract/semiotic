import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  LinkedCharts,
  CategoryColorProvider,
  ChartGrid,
  Scatterplot,
  BarChart,
  LineChart,
  AreaChart,
  StackedAreaChart,
  DonutChart,
  PieChart,
  FunnelChart,
  GroupedBarChart,
  StackedBarChart,
  BoxPlot,
  DotPlot,
  Histogram,
  RidgelinePlot,
  SwarmPlot,
  ViolinPlot,
} = Semiotic

const TestCase = ({ title, children, testId, key }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: key || testId },
    React.createElement("h2", null, title),
    children
  )

// ── Shared test data (deterministic) ────────────────────────────────────

const dashboardData = [
  { region: "North", month: 1, revenue: 120, units: 30 },
  { region: "North", month: 2, revenue: 140, units: 35 },
  { region: "North", month: 3, revenue: 160, units: 40 },
  { region: "South", month: 1, revenue: 90, units: 22 },
  { region: "South", month: 2, revenue: 110, units: 28 },
  { region: "South", month: 3, revenue: 130, units: 33 },
  { region: "East", month: 1, revenue: 70, units: 18 },
  { region: "East", month: 2, revenue: 85, units: 21 },
  { region: "East", month: 3, revenue: 100, units: 25 },
]

const barSummary = [
  { region: "North", total: 420 },
  { region: "South", total: 330 },
  { region: "East", total: 255 },
]

const scatterData = [
  { region: "North", x: 30, y: 120 },
  { region: "North", x: 35, y: 140 },
  { region: "North", x: 40, y: 160 },
  { region: "South", x: 22, y: 90 },
  { region: "South", x: 28, y: 110 },
  { region: "South", x: 33, y: 130 },
  { region: "East", x: 18, y: 70 },
  { region: "East", x: 21, y: 85 },
  { region: "East", x: 25, y: 100 },
]

const groupedCategoryData = [
  { region: "North", segment: "Enterprise", value: 28 },
  { region: "North", segment: "SMB", value: 18 },
  { region: "South", segment: "Enterprise", value: 20 },
  { region: "South", segment: "SMB", value: 16 },
  { region: "East", segment: "Enterprise", value: 16 },
  { region: "East", segment: "SMB", value: 11 },
]

const statisticalData = [
  { category: "Alpha", value: 20 },
  { category: "Alpha", value: 24 },
  { category: "Alpha", value: 29 },
  { category: "Alpha", value: 32 },
  { category: "Alpha", value: 38 },
  { category: "Beta", value: 14 },
  { category: "Beta", value: 18 },
  { category: "Beta", value: 22 },
  { category: "Beta", value: 28 },
  { category: "Beta", value: 35 },
  { category: "Gamma", value: 30 },
  { category: "Gamma", value: 33 },
  { category: "Gamma", value: 37 },
  { category: "Gamma", value: 42 },
  { category: "Gamma", value: 47 },
]

const statisticalScatterData = statisticalData.map((d, i) => ({
  ...d,
  x: d.value,
  y: i % 5,
}))

const crosshairPrimaryData = [
  { month: 1, value: 84 },
  { month: 2, value: 118 },
  { month: 3, value: 100 },
  { month: 4, value: 132 },
  { month: 5, value: 176 },
]

const crosshairSecondaryData = [
  { month: 1, value: 148 },
  { month: 2, value: 126 },
  { month: 3, value: 96 },
  { month: 4, value: 112 },
  { month: 5, value: 88 },
]

// ── Test cases ──────────────────────────────────────────────────────────

const examples = [
  // 1. LinkedCharts with hover cross-highlighting
  TestCase({
    title: "Linked Hover: Scatter + Bar",
    testId: "linked-hover",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["North", "South", "East"] },
      React.createElement(
        LinkedCharts,
        { showLegend: true },
        React.createElement(
          ChartGrid,
          { columns: 2 },
          React.createElement(Scatterplot, {
            data: scatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "region",
            width: 350,
            height: 250,
            linkedHover: { name: "hl", fields: ["region"] },
            selection: { name: "hl" },
            showLegend: false,
          }),
          React.createElement(BarChart, {
            data: barSummary,
            categoryAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 350,
            height: 250,
            selection: { name: "hl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 2. ChartGrid with emphasis
  TestCase({
    title: "ChartGrid with Emphasis",
    testId: "grid-emphasis",
    children: React.createElement(
      ChartGrid,
      { columns: 2 },
      React.createElement(LineChart, {
        data: dashboardData.filter((d) => d.region === "North"),
        xAccessor: "month",
        yAccessor: "revenue",
        width: 350,
        height: 200,
        emphasis: "primary",
      }),
      React.createElement(BarChart, {
        data: barSummary,
        categoryAccessor: "region",
        valueAccessor: "total",
        width: 350,
        height: 200,
      }),
      React.createElement(Scatterplot, {
        data: scatterData,
        xAccessor: "x",
        yAccessor: "y",
        width: 350,
        height: 200,
      })
    ),
  }),

  // 3. Empty state rendering
  TestCase({
    title: "Empty State",
    testId: "empty-state",
    children: React.createElement(LineChart, {
      data: [],
      xAccessor: "x",
      yAccessor: "y",
      width: 350,
      height: 200,
    }),
  }),

  // 4. Multiple linked charts (3-way)
  TestCase({
    title: "Three-Way Linked Charts",
    testId: "three-way-linked",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["North", "South", "East"] },
      React.createElement(
        LinkedCharts,
        null,
        React.createElement(
          ChartGrid,
          { columns: 3 },
          React.createElement(Scatterplot, {
            data: scatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "region",
            width: 250,
            height: 200,
            linkedHover: { name: "hl", fields: ["region"] },
            selection: { name: "hl" },
            showLegend: false,
          }),
          React.createElement(BarChart, {
            data: barSummary,
            categoryAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 250,
            height: 200,
            selection: { name: "hl" },
            showLegend: false,
          }),
          React.createElement(LineChart, {
            data: dashboardData,
            xAccessor: "month",
            yAccessor: "revenue",
            lineBy: "region",
            colorBy: "region",
            width: 250,
            height: 200,
            selection: { name: "hl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 5. XY family linked-hover targets
  TestCase({
    title: "Linked Hover: XY series targets",
    testId: "xy-linked-hover",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["North", "South", "East"] },
      React.createElement(
        LinkedCharts,
        null,
        React.createElement(
          ChartGrid,
          { columns: 4 },
          React.createElement(Scatterplot, {
            data: scatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "region",
            width: 220,
            height: 180,
            linkedHover: { name: "xyhl", fields: ["region"] },
            selection: { name: "xyhl" },
            showLegend: false,
          }),
          React.createElement(LineChart, {
            data: dashboardData,
            xAccessor: "month",
            yAccessor: "revenue",
            lineBy: "region",
            colorBy: "region",
            width: 220,
            height: 180,
            selection: { name: "xyhl" },
            showLegend: false,
          }),
          React.createElement(AreaChart, {
            data: dashboardData,
            xAccessor: "month",
            yAccessor: "revenue",
            areaBy: "region",
            colorBy: "region",
            width: 220,
            height: 180,
            selection: { name: "xyhl" },
            showLegend: false,
          }),
          React.createElement(StackedAreaChart, {
            data: dashboardData,
            xAccessor: "month",
            yAccessor: "revenue",
            areaBy: "region",
            colorBy: "region",
            width: 220,
            height: 180,
            selection: { name: "xyhl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 6. Ordinal composition linked-hover targets
  TestCase({
    title: "Linked Hover: Ordinal composition targets",
    testId: "ordinal-linked-hover",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["North", "South", "East"] },
      React.createElement(
        LinkedCharts,
        null,
        React.createElement(
          ChartGrid,
          { columns: 3 },
          React.createElement(Scatterplot, {
            data: scatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "region",
            width: 240,
            height: 190,
            linkedHover: { name: "ordhl", fields: ["region"] },
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(GroupedBarChart, {
            data: groupedCategoryData,
            categoryAccessor: "region",
            valueAccessor: "value",
            groupBy: "segment",
            colorBy: "region",
            width: 240,
            height: 190,
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(StackedBarChart, {
            data: groupedCategoryData,
            categoryAccessor: "region",
            valueAccessor: "value",
            stackBy: "segment",
            colorBy: "region",
            width: 240,
            height: 190,
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(DonutChart, {
            data: barSummary,
            categoryAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 240,
            height: 220,
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(PieChart, {
            data: barSummary,
            categoryAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 240,
            height: 220,
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(FunnelChart, {
            data: barSummary,
            stepAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 240,
            height: 190,
            selection: { name: "ordhl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 7. Statistical ordinal linked-hover targets
  TestCase({
    title: "Linked Hover: Statistical ordinal targets",
    testId: "statistical-linked-hover",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["Alpha", "Beta", "Gamma"] },
      React.createElement(
        LinkedCharts,
        null,
        React.createElement(
          ChartGrid,
          { columns: 4 },
          React.createElement(Scatterplot, {
            data: statisticalScatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "category",
            width: 220,
            height: 180,
            linkedHover: { name: "stathl", fields: ["category"] },
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(BoxPlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(DotPlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(Histogram, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(RidgelinePlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(SwarmPlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(ViolinPlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 8. X-position linked-hover click lock
  TestCase({
    title: "Linked Hover: Locked x-position crosshair",
    testId: "linked-crosshair-lock",
    children: React.createElement(
      LinkedCharts,
      null,
      React.createElement(
        ChartGrid,
        { columns: 2 },
        React.createElement(LineChart, {
          data: crosshairPrimaryData,
          xAccessor: "month",
          yAccessor: "value",
          width: 320,
          height: 180,
          margin: 20,
          xExtent: [1, 5],
          yExtent: [0, 200],
          color: "#38bdf8",
          showPoints: true,
          pointRadius: 4,
          hoverRadius: 80,
          tooltip: false,
          linkedHover: { name: "lockhl", mode: "x-position", xField: "month" },
          showLegend: false,
          frameProps: { background: "#111827" },
        }),
        React.createElement(LineChart, {
          data: crosshairSecondaryData,
          xAccessor: "month",
          yAccessor: "value",
          width: 320,
          height: 180,
          margin: 20,
          xExtent: [1, 5],
          yExtent: [0, 200],
          color: "#f97316",
          showPoints: true,
          pointRadius: 4,
          hoverRadius: 80,
          tooltip: false,
          linkedHover: { name: "lockhl", mode: "x-position", xField: "month" },
          showLegend: false,
          frameProps: { background: "#111827" },
        })
      )
    ),
  }),
]

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(React.Fragment, null, ...examples))
