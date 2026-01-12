import * as Semiotic from "../../dist/semiotic.module.js"
import React from "react"
import { createRoot } from "react-dom/client"

const { BubbleChart, BarChart, ForceDirectedGraph, Scatterplot, LineChart, SwarmPlot } = Semiotic

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

// Test data
const bubbleData = [
  { x: 10, y: 20, size: 30, category: "Tech" },
  { x: 25, y: 35, size: 50, category: "Finance" },
  { x: 40, y: 15, size: 20, category: "Tech" },
  { x: 55, y: 45, size: 60, category: "Healthcare" },
  { x: 70, y: 30, size: 40, category: "Finance" }
]

const barData = [
  { category: "A", value: 10, type: "X" },
  { category: "B", value: 20, type: "Y" },
  { category: "C", value: 15, type: "X" },
  { category: "D", value: 25, type: "Y" }
]

const networkNodes = [
  { id: "A", group: "1" },
  { id: "B", group: "2" },
  { id: "C", group: "1" },
  { id: "D", group: "2" }
]

const networkEdges = [
  { source: "A", target: "B" },
  { source: "B", target: "C" },
  { source: "C", target: "D" },
  { source: "D", target: "A" }
]

const scatterData = [
  { x: 1, y: 10, category: "A" },
  { x: 2, y: 20, category: "B" },
  { x: 3, y: 15, category: "A" },
  { x: 4, y: 25, category: "B" },
  { x: 5, y: 18, category: "C" }
]

const lineData = [
  { series: "A", coordinates: [{ x: 0, y: 10 }, { x: 1, y: 12 }, { x: 2, y: 15 }, { x: 3, y: 20 }] },
  { series: "B", coordinates: [{ x: 0, y: 8 }, { x: 1, y: 10 }, { x: 2, y: 12 }, { x: 3, y: 18 }] }
]

const swarmData = [
  { category: "Group A", value: 10, type: "X" },
  { category: "Group A", value: 12, type: "Y" },
  { category: "Group A", value: 11, type: "X" },
  { category: "Group B", value: 15, type: "Y" },
  { category: "Group B", value: 14, type: "X" },
  { category: "Group B", value: 16, type: "Y" }
]

const examples = [
  // 1. BubbleChart with legend
  TestCase({
    title: "BubbleChart with Legend (colorBy)",
    testId: "bubble-with-legend",
    children: React.createElement(BubbleChart, {
        data: bubbleData,
        width: 550,
        height: 350,
        sizeBy: "size",
        colorBy: "category",
        xLabel: "X Axis",
        yLabel: "Y Axis"
      })
  }),

  // 2. BubbleChart without legend
  TestCase({
    title: "BubbleChart without Legend (no colorBy)",
    testId: "bubble-no-legend",
    children: React.createElement(BubbleChart, {
        data: bubbleData,
        width: 550,
        height: 350,
        sizeBy: "size",
        xLabel: "X Axis",
        yLabel: "Y Axis"
      })
  }),

  // 3. BarChart with legend
  TestCase({
    title: "BarChart with Legend (colorBy)",
    testId: "bar-with-legend",
    children: React.createElement(BarChart, {
        data: barData,
        width: 550,
        height: 350,
        colorBy: "type",
        categoryLabel: "Category",
        valueLabel: "Value"
      })
  }),

  // 4. BarChart without legend
  TestCase({
    title: "BarChart without Legend (no colorBy)",
    testId: "bar-no-legend",
    children: React.createElement(BarChart, {
        data: barData,
        width: 550,
        height: 350,
        categoryLabel: "Category",
        valueLabel: "Value"
      })
  }),

  // 5. ForceDirectedGraph with legend
  TestCase({
    title: "ForceDirectedGraph with Legend (colorBy)",
    testId: "network-with-legend",
    children: React.createElement(ForceDirectedGraph, {
        nodes: networkNodes,
        edges: networkEdges,
        width: 550,
        height: 350,
        colorBy: "group"
      })
  }),

  // 6. ForceDirectedGraph without legend
  TestCase({
    title: "ForceDirectedGraph without Legend (no colorBy)",
    testId: "network-no-legend",
    children: React.createElement(ForceDirectedGraph, {
        nodes: networkNodes,
        edges: networkEdges,
        width: 550,
        height: 350
      })
  }),

  // 7. Scatterplot with legend
  TestCase({
    title: "Scatterplot with Legend (colorBy)",
    testId: "scatter-with-legend",
    children: React.createElement(Scatterplot, {
        data: scatterData,
        width: 550,
        height: 350,
        colorBy: "category",
        xLabel: "X Axis",
        yLabel: "Y Axis"
      })
  }),

  // 8. LineChart with legend
  TestCase({
    title: "LineChart with Legend (colorBy)",
    testId: "line-with-legend",
    children: React.createElement(LineChart, {
        data: lineData,
        width: 550,
        height: 350,
        lineGroupAccessor: "series",
        colorBy: "series",
        xLabel: "X Axis",
        yLabel: "Y Axis"
      })
  }),

  // 9. SwarmPlot with legend
  TestCase({
    title: "SwarmPlot with Legend (colorBy)",
    testId: "swarm-with-legend",
    children: React.createElement(SwarmPlot, {
        data: swarmData,
        width: 550,
        height: 350,
        colorBy: "type",
        categoryLabel: "Category",
        valueLabel: "Value"
      })
  }),

  // 10. BubbleChart with showLegend=false (should not show legend)
  TestCase({
    title: "BubbleChart with showLegend=false",
    testId: "bubble-legend-disabled",
    children: React.createElement(BubbleChart, {
        data: bubbleData,
        width: 550,
        height: 350,
        sizeBy: "size",
        colorBy: "category",
        showLegend: false,
        xLabel: "X Axis",
        yLabel: "Y Axis"
      })
  })
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
