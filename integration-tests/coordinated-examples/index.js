import * as Semiotic from "../../dist/semiotic.module.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  LinkedCharts,
  CategoryColorProvider,
  ChartGrid,
  Scatterplot,
  BarChart,
  LineChart,
} = Semiotic

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
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
]

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(React.Fragment, null, ...examples))
