import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { lineData, scatterData, barData, colors } from "../test-data.js"

const {
  LineChart,
  Scatterplot,
  BarChart,
  ForceDirectedGraph,
  ChartContainer,
  CategoryColorProvider,
  LinkedCharts,
  ChartGrid,
} = Semiotic

const TestCase = ({ title, children, testId, key }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: key || testId },
    React.createElement("h2", null, title),
    children
  )

// Network data for force-directed graph
const networkNodes = [
  { id: "A", group: "eng" },
  { id: "B", group: "design" },
  { id: "C", group: "eng" },
  { id: "D", group: "design" },
]

const networkEdges = [
  { source: "A", target: "B" },
  { source: "B", target: "C" },
  { source: "C", target: "D" },
]

// Dashboard data for coordinated views
const dashboardData = [
  { region: "North", month: 1, revenue: 120, units: 30 },
  { region: "North", month: 2, revenue: 140, units: 35 },
  { region: "South", month: 1, revenue: 90, units: 22 },
  { region: "South", month: 2, revenue: 110, units: 28 },
  { region: "East", month: 1, revenue: 70, units: 18 },
  { region: "East", month: 2, revenue: 85, units: 21 },
]

const barSummary = [
  { region: "North", total: 260 },
  { region: "South", total: 200 },
  { region: "East", total: 155 },
]

const examples = [
  // 1. XY chart with title (aria-label comes from title)
  TestCase({
    title: "XY Chart with Title (aria-label)",
    testId: "a11y-xy-titled",
    children: React.createElement(LineChart, {
      data: lineData,
      xAccessor: "x",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      title: "Monthly Revenue Trends",
      width: 400,
      height: 300,
      colorScheme: colors,
    }),
  }),

  // 2. XY chart without title (default aria-label)
  TestCase({
    title: "XY Chart without Title (default aria-label)",
    testId: "a11y-xy-default",
    children: React.createElement(Scatterplot, {
      data: scatterData.slice(0, 10),
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
      width: 400,
      height: 300,
      colorScheme: colors,
    }),
  }),

  // 3. Ordinal chart with aria
  TestCase({
    title: "Ordinal Chart (aria-label)",
    testId: "a11y-ordinal",
    children: React.createElement(BarChart, {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "Sales by Category",
      width: 400,
      height: 300,
    }),
  }),

  // 4. Network chart with aria
  TestCase({
    title: "Network Chart (aria-label)",
    testId: "a11y-network",
    children: React.createElement(ForceDirectedGraph, {
      nodes: networkNodes,
      edges: networkEdges,
      nodeIDAccessor: "id",
      title: "Team Connections",
      iterations: 300,
      width: 400,
      height: 300,
    }),
  }),

  // 5. Scatter with hover + tooltip (aria-live region)
  TestCase({
    title: "Scatter with Tooltip (aria-live)",
    testId: "a11y-tooltip",
    children: React.createElement(Scatterplot, {
      data: scatterData.slice(0, 15),
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
      pointRadius: 6,
      enableHover: true,
      tooltip: true,
      width: 400,
      height: 300,
      colorScheme: colors,
    }),
  }),

  // 6. Chart with interactive legend (for keyboard navigation testing)
  TestCase({
    title: "Chart with Interactive Legend (keyboard nav)",
    testId: "a11y-legend-keyboard",
    children: React.createElement(BarChart, {
      data: [
        { category: "A", value: 10, type: "X" },
        { category: "B", value: 20, type: "Y" },
        { category: "C", value: 15, type: "Z" },
        { category: "D", value: 25, type: "X" },
        { category: "E", value: 18, type: "Y" },
        { category: "F", value: 22, type: "Z" },
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "type",
      showLegend: true,
      legendInteraction: "isolate",
      width: 500,
      height: 300,
    }),
  }),

  // 7. ChartContainer with toolbar buttons
  TestCase({
    title: "ChartContainer Toolbar Buttons",
    testId: "a11y-chart-container",
    children: React.createElement(
      ChartContainer,
      {
        title: "Revenue Overview",
        height: 300,
        actions: { export: true, fullscreen: true, copyConfig: true },
      },
      React.createElement(BarChart, {
        data: barData,
        categoryAccessor: "category",
        valueAccessor: "value",
        width: 450,
        height: 250,
      })
    ),
  }),

  // 8. Coordinated views with linked hover (tests cross-chart accessibility)
  TestCase({
    title: "Coordinated Views (linked hover)",
    testId: "a11y-coordinated",
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
            data: dashboardData,
            xAccessor: "units",
            yAccessor: "revenue",
            colorBy: "region",
            width: 350,
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
            width: 350,
            height: 200,
            selection: { name: "hl" },
            showLegend: false,
          })
        )
      )
    ),
  }),
]

const root = createRoot(document.getElementById("root"))
root.render(React.createElement("div", { className: "test-grid" }, examples.map((ex, i) => React.cloneElement(ex, { key: `test-${i}` }))))
