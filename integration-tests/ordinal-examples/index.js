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
  SwarmPlot,
  BoxPlot,
  ViolinPlot,
  Histogram
} = Semiotic

const TestCase = ({ title, children, testId, key }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: key || testId },
    React.createElement("h2", null, title),
    children
  )

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
  })
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
