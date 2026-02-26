import * as Semiotic from "../../dist/semiotic.module.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { barData, timelineData, colors } from "../test-data.js"

const { OrdinalFrame } = Semiotic

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

const examples = [
  // 1. Vertical Bar Chart - SVG
  TestCase({
    title: "Vertical Bars - SVG",
    testId: "ordinal-bars-vertical-svg",
    children: React.createElement(OrdinalFrame, {
      size: [400, 300],
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      type: "bar",
      style: { fill: colors[0], stroke: colors[1], strokeWidth: 1 },
      axes: [{ orient: "left" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 },
      oPadding: 5
    })
  }),

  // 2. Horizontal Bar Chart - SVG
  TestCase({
    title: "Horizontal Bars - SVG",
    testId: "ordinal-bars-horizontal-svg",
    children: React.createElement(OrdinalFrame, {
      size: [400, 300],
      data: barData,
      projection: "horizontal",
      oAccessor: "category",
      rAccessor: "value",
      type: "bar",
      style: { fill: colors[2], stroke: colors[3], strokeWidth: 1 },
      axes: [{ orient: "left" }],
      margin: { left: 100, bottom: 50, right: 10, top: 10 },
      oPadding: 5
    })
  }),

  // 3. Stacked Bar Chart
  TestCase({
    title: "Stacked Bars - SVG",
    testId: "ordinal-bars-stacked",
    children: React.createElement(OrdinalFrame, {
      size: [400, 300],
      data: [
        { category: "A", value: 10, type: "X" },
        { category: "A", value: 15, type: "Y" },
        { category: "B", value: 20, type: "X" },
        { category: "B", value: 10, type: "Y" },
        { category: "C", value: 15, type: "X" },
        { category: "C", value: 25, type: "Y" }
      ],
      oAccessor: "category",
      rAccessor: "value",
      type: "bar",
      style: (d) => ({
        fill: d.type === "X" ? colors[0] : colors[1],
        stroke: "white",
        strokeWidth: 1
      }),
      axes: [{ orient: "left" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 },
      oPadding: 5
    })
  }),

  // 4. Pie Chart
  TestCase({
    title: "Pie Chart - SVG",
    testId: "ordinal-pie-svg",
    children: React.createElement(OrdinalFrame, {
      size: [400, 300],
      data: barData.slice(0, 4),
      projection: "radial",
      type: "bar",
      oAccessor: "category",
      rAccessor: () => 1,
      dynamicColumnWidth: "value",
      style: (d, i) => ({
        fill: colors[i],
        stroke: "white",
        strokeWidth: 2
      }),
      margin: { left: 50, bottom: 50, right: 50, top: 50 },
      oLabel: true
    })
  }),

  // 5. Timeline Chart
  TestCase({
    title: "Timeline - SVG",
    testId: "ordinal-timeline-svg",
    children: React.createElement(OrdinalFrame, {
      size: [400, 300],
      data: timelineData,
      projection: "horizontal",
      oAccessor: "task",
      rAccessor: (d) => [d.start, d.end],
      type: { type: "timeline", sort: null },
      style: (d, i) => ({
        fill: colors[i],
        stroke: "black",
        strokeWidth: 1
      }),
      axes: [{ orient: "bottom" }],
      margin: { left: 120, bottom: 50, right: 10, top: 10 },
      oPadding: 10
    })
  }),

  // 6. Swarm Plot
  TestCase({
    title: "Swarm Plot - SVG",
    testId: "ordinal-swarm-svg",
    children: React.createElement(OrdinalFrame, {
      size: [400, 300],
      data: Array.from({ length: 30 }, (_, i) => ({
        category: ["A", "B", "C"][i % 3],
        value: Math.random() * 50 + 10
      })),
      oAccessor: "category",
      rAccessor: "value",
      type: "swarm",
      style: { fill: colors[0], fillOpacity: 0.6, stroke: colors[1] },
      axes: [{ orient: "left" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 },
      oPadding: 5
    })
  }),

  // 7. Bar Chart with Hover
  TestCase({
    title: "Bars with Hover - SVG",
    testId: "ordinal-bars-hover",
    children: React.createElement(OrdinalFrame, {
      size: [400, 300],
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      type: "bar",
      style: { fill: colors[0], stroke: colors[1], strokeWidth: 1 },
      hoverAnnotation: true,
      tooltipContent: (d) =>
        React.createElement(
          "div",
          { className: "tooltip-content", "data-testid": "tooltip-content" },
          `${d.category}: ${d.value}`
        ),
      axes: [{ orient: "left" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 },
      oPadding: 5
    })
  }),

  // 8. Bar Chart - Canvas
  TestCase({
    title: "Vertical Bars - Canvas",
    testId: "ordinal-bars-canvas",
    children: React.createElement(OrdinalFrame, {
      size: [400, 300],
      data: barData,
      oAccessor: "category",
      rAccessor: "value",
      type: "bar",
      style: { fill: colors[4], stroke: colors[0], strokeWidth: 1 },
      canvasPieces: true,
      axes: [{ orient: "left" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 },
      oPadding: 5
    })
  })
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
