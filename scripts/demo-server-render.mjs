#!/usr/bin/env node
/**
 * CLI Screenshot Generator — batch-renders charts to SVG/PNG files on disk.
 *
 * Produces the exact images needed for PR descriptions, release posts, and
 * documentation. Each chart uses a different theme to showcase variety.
 *
 * Usage:
 *   npx tsx scripts/demo-server-render.mjs              # SVG only
 *   npx tsx scripts/demo-server-render.mjs --png         # also generate PNGs (requires sharp)
 *   npx tsx scripts/demo-server-render.mjs --out ./images # custom output dir
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load from dist or source
let renderChart, renderDashboard, renderToImage
try {
  const mod = await import("../dist/server.module.min.js")
  const server = mod.default ?? mod
  renderChart = server.renderChart
  renderDashboard = server.renderDashboard
  renderToImage = server.renderToImage
} catch {
  try {
    const mod = await import("../src/components/semiotic-server.ts")
    renderChart = mod.renderChart
    renderDashboard = mod.renderDashboard
    renderToImage = mod.renderToImage
  } catch (e) {
    console.error('Run "npm run dist" first, or use "npx tsx scripts/demo-server-render.mjs"')
    process.exit(1)
  }
}

// ── Config ──────────────────────────────────────────────────────────────

const generatePNG = process.argv.includes("--png")
const outIdx = process.argv.indexOf("--out")
if (outIdx !== -1 && (!process.argv[outIdx + 1] || process.argv[outIdx + 1].startsWith("--"))) {
  console.error('Error: "--out" requires a directory path.\nUsage: npx tsx scripts/demo-server-render.mjs [--png] [--out <directory>]')
  process.exit(1)
}
const outDir = outIdx !== -1 ? process.argv[outIdx + 1] : path.join(__dirname, "..", "demo-output")

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

// ── Sample data ─────────────────────────────────────────────────────────

const barData = [
  { category: "Q1", value: 42000, region: "Americas" },
  { category: "Q2", value: 58000, region: "Americas" },
  { category: "Q3", value: 65000, region: "Americas" },
  { category: "Q4", value: 71000, region: "Americas" },
  { category: "Q1", value: 28000, region: "EMEA" },
  { category: "Q2", value: 35000, region: "EMEA" },
  { category: "Q3", value: 41000, region: "EMEA" },
  { category: "Q4", value: 48000, region: "EMEA" },
]

const lineData = Array.from({ length: 24 }, (_, i) => ({
  month: i + 1,
  revenue: Math.round(40000 + 30000 * Math.sin(i / 3) + i * 2000),
  cost: Math.round(25000 + 5000 * Math.sin(i / 4) + i * 800),
})).flatMap(d => [
  { x: d.month, y: d.revenue, series: "Revenue" },
  { x: d.month, y: d.cost, series: "Cost" },
])

const pieData = [
  { category: "Desktop", value: 58 },
  { category: "Mobile", value: 28 },
  { category: "Tablet", value: 10 },
  { category: "Other", value: 4 },
]

const sankeyEdges = [
  { source: "Revenue", target: "Product", value: 500 },
  { source: "Revenue", target: "Services", value: 300 },
  { source: "Revenue", target: "Licensing", value: 200 },
  { source: "Product", target: "Gross Profit", value: 300 },
  { source: "Services", target: "Gross Profit", value: 200 },
  { source: "Licensing", target: "Gross Profit", value: 200 },
  { source: "Gross Profit", target: "OpEx", value: 350 },
  { source: "Gross Profit", target: "Net Income", value: 350 },
]

// ── Chart definitions ───────────────────────────────────────────────────

const charts = [
  {
    name: "bar-tufte",
    component: "BarChart",
    props: {
      data: barData.filter(d => d.region === "Americas"),
      categoryAccessor: "category",
      valueAccessor: "value",
      theme: "tufte",
      title: "Quarterly Revenue",
      roundedTop: 4,
      showGrid: true,
    },
  },
  {
    name: "stacked-bar-dark",
    component: "StackedBarChart",
    props: {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      stackBy: "region",
      colorBy: "region",
      theme: "dark",
      title: "Revenue by Region",
      roundedTop: 4,
      showLegend: true,
      background: "#1a1a2e",
    },
  },
  {
    name: "line-journalist",
    component: "LineChart",
    props: {
      data: lineData,
      xAccessor: "x",
      yAccessor: "y",
      lineBy: "series",
      colorBy: "series",
      theme: "journalist",
      title: "Revenue vs Cost",
      showLegend: true,
      showGrid: true,
    },
  },
  {
    name: "pie-pastels-rounded",
    component: "PieChart",
    props: {
      data: pieData,
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "category",
      theme: "pastels",
      cornerRadius: 8,
      width: 400,
      height: 400,
    },
  },
  {
    name: "donut-italian",
    component: "DonutChart",
    props: {
      data: pieData,
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "category",
      theme: "italian",
      cornerRadius: 6,
      width: 400,
      height: 400,
    },
  },
  {
    name: "sankey-dark",
    component: "SankeyDiagram",
    props: {
      edges: sankeyEdges,
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
      theme: "tufte-dark",
      showLabels: true,
      background: "#1a1a2e",
    },
  },
  {
    name: "gauge-high-contrast",
    component: "GaugeChart",
    props: {
      value: 72,
      min: 0,
      max: 100,
      sweep: 240,
      arcWidth: 0.3,
      thresholds: [
        { value: 60, color: "#22c55e", label: "Normal" },
        { value: 80, color: "#f59e0b", label: "Warning" },
        { value: 100, color: "#ef4444", label: "Critical" },
      ],
      title: "CPU Usage",
      theme: "high-contrast",
      width: 350,
      height: 350,
    },
  },
]

// ── Dashboard ───────────────────────────────────────────────────────────

const dashboardDef = {
  name: "dashboard-bi-tool",
  charts: [
    { component: "BarChart", colSpan: 2, props: { data: barData.filter(d => d.region === "Americas"), categoryAccessor: "category", valueAccessor: "value", title: "Revenue" } },
    { component: "PieChart", props: { data: pieData, categoryAccessor: "category", valueAccessor: "value", colorBy: "category" } },
    { component: "LineChart", colSpan: 2, props: { data: lineData, xAccessor: "x", yAccessor: "y", lineBy: "series", colorBy: "series", title: "Trend", showLegend: true } },
  ],
  options: { title: "Executive Summary", theme: "bi-tool", width: 1200, layout: { columns: 3 } },
}

// ── Render ───────────────────────────────────────────────────────────────

console.log(`Rendering ${charts.length} charts + 1 dashboard to ${outDir}\n`)

for (const chart of charts) {
  const props = { width: 600, height: 400, ...chart.props }
  const svg = renderChart(chart.component, props)
  const svgPath = path.join(outDir, `${chart.name}.svg`)
  fs.writeFileSync(svgPath, svg)
  console.log(`  SVG  ${chart.name}.svg (${(svg.length / 1024).toFixed(1)}KB)`)

  if (generatePNG && renderToImage) {
    try {
      const png = await renderToImage(chart.component, props, { format: "png", scale: 2 })
      const pngPath = path.join(outDir, `${chart.name}.png`)
      fs.writeFileSync(pngPath, png)
      console.log(`  PNG  ${chart.name}.png (${(png.length / 1024).toFixed(1)}KB)`)
    } catch (e) {
      console.log(`  PNG  ${chart.name}.png SKIPPED (${e instanceof Error ? e.message : String(e)})`)
    }
  }
}

// Dashboard
const dashSvg = renderDashboard(dashboardDef.charts, dashboardDef.options)
const dashPath = path.join(outDir, `${dashboardDef.name}.svg`)
fs.writeFileSync(dashPath, dashSvg)
console.log(`  SVG  ${dashboardDef.name}.svg (${(dashSvg.length / 1024).toFixed(1)}KB)`)

console.log(`\nDone. ${charts.length + 1} files in ${outDir}`)
