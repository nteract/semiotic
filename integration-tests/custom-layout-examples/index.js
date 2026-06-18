import * as Semiotic from "../../dist/semiotic.module.min.js"
import React, { useState } from "react"
import { createRoot } from "react-dom/client"

const { ThemeProvider, XYCustomChart } = Semiotic

const seafoodData = [
  { lake: "Erie", species: "Walleye", count: 48, x: 0 },
  { lake: "Erie", species: "Perch", count: 31, x: 0 },
  { lake: "Erie", species: "Trout", count: 16, x: 0 },
  { lake: "Huron", species: "Walleye", count: 26, x: 1 },
  { lake: "Huron", species: "Perch", count: 18, x: 1 },
  { lake: "Huron", species: "Trout", count: 35, x: 1 },
  { lake: "Michigan", species: "Walleye", count: 18, x: 2 },
  { lake: "Michigan", species: "Perch", count: 42, x: 2 },
  { lake: "Michigan", species: "Trout", count: 27, x: 2 },
  { lake: "Ontario", species: "Walleye", count: 22, x: 3 },
  { lake: "Ontario", species: "Perch", count: 21, x: 3 },
  { lake: "Ontario", species: "Trout", count: 43, x: 3 },
  { lake: "Superior", species: "Walleye", count: 14, x: 4 },
  { lake: "Superior", species: "Perch", count: 24, x: 4 },
  { lake: "Superior", species: "Trout", count: 57, x: 4 },
]

function stableId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"
}

function responsiveFlowerLayout(ctx) {
  const plot = ctx.dimensions.plot
  const radius = ctx.config.flowerRadius || 32
  const stemWidth = ctx.config.stemWidth || 5
  const grouped = new Map()
  for (const row of ctx.data) {
    const key = String(row.lake)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(row)
  }
  const lakes = Array.from(grouped.keys())
  const maxTotal = Math.max(
    1,
    ...lakes.map((lake) => grouped.get(lake).reduce((sum, row) => sum + Number(row.count || 0), 0))
  )
  const baseY = plot.y + plot.height - 28
  const xPad = Math.min(plot.width / 2, Math.max(radius * 1.8, plot.width * 0.12))
  const xStart = plot.x + xPad
  const xEnd = plot.x + plot.width - xPad
  const nodes = []
  const overlays = []

  lakes.forEach((lake, index) => {
    const rows = grouped.get(lake)
    const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0)
    const x = lakes.length === 1 ? plot.x + plot.width / 2 : xStart + index * ((xEnd - xStart) / (lakes.length - 1))
    const stemHeight = (plot.height * 0.2) + (plot.height * 0.32) * (total / maxTotal)
    const flowerY = baseY - stemHeight
    const id = stableId(lake)

    nodes.push({
      type: "rect",
      x: x - stemWidth,
      y: flowerY,
      w: stemWidth * 2,
      h: stemHeight,
      style: { fill: "rgba(0,0,0,0)", stroke: "none" },
      datum: { lake, total },
      group: lake,
      _transitionKey: `flower-hit-${id}`,
    })

    overlays.push(
      React.createElement("rect", {
        key: `stem-${id}`,
        "data-gofish-id": `flower-stem-${id}`,
        x: x - stemWidth / 2,
        y: flowerY,
        width: stemWidth,
        height: stemHeight,
        rx: stemWidth / 2,
        fill: "#2f8f46",
      }),
      React.createElement("circle", {
        key: `center-${id}`,
        "data-gofish-id": `flower-center-${id}`,
        cx: x,
        cy: flowerY,
        r: Math.max(5, radius * 0.18),
        fill: "#f6d365",
        stroke: "rgba(0,0,0,0.25)",
        strokeWidth: 0.6,
      })
    )
  })

  return {
    nodes,
    overlays: React.createElement(
      "g",
      { className: "semiotic-custom-flower-layer", style: { pointerEvents: "none" } },
      overlays
    ),
  }
}

function TestCase({ title, testId, children }) {
  return React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )
}

function ResponsiveFlowerFixture() {
  const [radius, setRadius] = useState(32)

  return React.createElement(
    TestCase,
    { title: "Flower custom layout — responsive overlays", testId: "gofish-flower-responsive" },
    React.createElement(
      "div",
      { className: "controls" },
      React.createElement(
        "button",
        {
          type: "button",
          "data-testid": "radius-plus",
          onClick: () => setRadius((prev) => prev + 4),
        },
        "Increase radius"
      ),
      React.createElement("span", { "data-testid": "radius-value" }, `${radius}px`)
    ),
    React.createElement(
      "div",
      { className: "responsive-shell" },
      React.createElement(XYCustomChart, {
        data: seafoodData,
        layout: responsiveFlowerLayout,
        layoutConfig: { flowerRadius: radius, stemWidth: 5 },
        width: 760,
        height: 360,
        responsiveWidth: true,
        margin: { top: 20, right: 24, bottom: 42, left: 24 },
        colorScheme: ["#4e79a7", "#f28e2c", "#59a14f"],
        enableHover: true,
        frameProps: {
          transition: { duration: 450, easing: "ease-out" },
        },
      })
    )
  )
}

function App() {
  return React.createElement(
    ThemeProvider,
    { theme: "light" },
    React.createElement(ResponsiveFlowerFixture)
  )
}

createRoot(document.getElementById("root")).render(React.createElement(App))
