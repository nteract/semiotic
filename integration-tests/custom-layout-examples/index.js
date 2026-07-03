import * as Semiotic from "../../dist/semiotic.module.min.js"
import { unitize } from "../../dist/semiotic-recipes.module.js"
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

// ── Glyph unit chart: composite-pictogram scene nodes fed by unitize ────────

const SERVER_SIGN = {
  viewBox: [40, 40],
  anchor: [0.5, 1],
  parts: [
    { d: "M8 3h24v34H8z", fill: "color" },
    { d: "M12 9h16v5H12zM12 18h16v5H12zM12 27h16v5H12z", fill: "accent" },
  ],
}

const GLYPH_ROWS = [
  { id: "alpha", label: "Alpha", value: 85 },
  { id: "beta", label: "Beta", value: 50 },
  { id: "gamma", label: "Gamma", value: 130 },
]
const GLYPH_COLORS = { alpha: "#d72f3f", beta: "#4f8999", gamma: "#d8ad43" }

function glyphUnitLayout(ctx) {
  const nodes = []
  const labels = []
  ctx.data.forEach((row, index) => {
    const feetY = 44 + index * 52
    labels.push(
      React.createElement(
        "text",
        { key: row.id, x: 4, y: feetY - 8, fontSize: 12, fontWeight: 700, fill: "#333" },
        row.label
      )
    )
    // Every unit sign is an interactive glyph node: hit-tested, keyboard
    // navigable, with the partial final sign riding fraction + ghostColor.
    for (const unit of unitize(row.value, { unit: 25 }).units) {
      nodes.push({
        type: "glyph",
        x: 80 + unit.index * 30,
        y: feetY,
        size: 24,
        glyph: SERVER_SIGN,
        color: GLYPH_COLORS[row.id],
        accent: "#ffffff",
        fraction: unit.fraction < 1 ? unit.fraction : undefined,
        ghostColor: unit.fraction < 1 ? "#e6dfca" : undefined,
        style: {},
        datum: row,
        pointId: `${row.id}-${unit.index}`,
      })
    }
  })
  return { nodes, overlays: React.createElement("g", null, labels) }
}

function GlyphUnitFixture() {
  const [hovered, setHovered] = useState("none")

  return React.createElement(
    TestCase,
    { title: "Glyph unit chart — composite pictograms from unitize", testId: "glyph-unit-chart" },
    React.createElement(
      "div",
      { className: "controls" },
      React.createElement("span", { "data-testid": "glyph-hover-label" }, hovered)
    ),
    React.createElement(XYCustomChart, {
      data: GLYPH_ROWS,
      layout: glyphUnitLayout,
      width: 480,
      height: 210,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      enableHover: true,
      accessibleTable: true,
      animate: false,
      onObservation: (observation) => {
        if (observation.type === "hover" && observation.datum) {
          setHovered(observation.datum.label ?? "none")
        }
      },
      frameProps: { background: "transparent" },
    })
  )
}

function App() {
  return React.createElement(
    ThemeProvider,
    { theme: "light" },
    React.createElement(ResponsiveFlowerFixture),
    React.createElement(GlyphUnitFixture)
  )
}

createRoot(document.getElementById("root")).render(React.createElement(App))
