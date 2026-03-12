/**
 * SSR Gallery Generator
 *
 * Renders a gallery of charts using both SSR paths:
 *   1. Component SSR — actual HOC components via ReactDOMServer.renderToStaticMarkup
 *   2. Standalone SSR — renderToStaticSVG from semiotic/server
 *
 * Usage: npx tsx scripts/ssr-gallery.tsx > ssr-gallery.html
 */

import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

// HOC components
import { LineChart } from "../src/components/charts/xy/LineChart"
import { AreaChart } from "../src/components/charts/xy/AreaChart"
import { StackedAreaChart } from "../src/components/charts/xy/StackedAreaChart"
import { Scatterplot } from "../src/components/charts/xy/Scatterplot"
import { Heatmap } from "../src/components/charts/xy/Heatmap"
import { BarChart } from "../src/components/charts/ordinal/BarChart"
import { StackedBarChart } from "../src/components/charts/ordinal/StackedBarChart"
import { PieChart } from "../src/components/charts/ordinal/PieChart"
import { DonutChart } from "../src/components/charts/ordinal/DonutChart"
import { BoxPlot } from "../src/components/charts/ordinal/BoxPlot"
import { DotPlot } from "../src/components/charts/ordinal/DotPlot"
import { ForceDirectedGraph } from "../src/components/charts/network/ForceDirectedGraph"
import { SankeyDiagram } from "../src/components/charts/network/SankeyDiagram"
import { TreeDiagram } from "../src/components/charts/network/TreeDiagram"
import { Treemap } from "../src/components/charts/network/Treemap"

// Standalone SSR
import {
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
} from "../src/components/server/renderToStaticSVG"

// ── Data ────────────────────────────────────────────────────────────────

const timeSeriesData = [
  { month: 1, revenue: 42000 },
  { month: 2, revenue: 58000 },
  { month: 3, revenue: 52000 },
  { month: 4, revenue: 71000 },
  { month: 5, revenue: 68000 },
  { month: 6, revenue: 84000 },
  { month: 7, revenue: 79000 },
  { month: 8, revenue: 91000 },
  { month: 9, revenue: 87000 },
  { month: 10, revenue: 95000 },
  { month: 11, revenue: 102000 },
  { month: 12, revenue: 118000 },
]

const multiLineData = [
  ...timeSeriesData.map(d => ({ ...d, region: "North" })),
  ...[
    { month: 1, revenue: 28000 }, { month: 2, revenue: 35000 },
    { month: 3, revenue: 41000 }, { month: 4, revenue: 48000 },
    { month: 5, revenue: 52000 }, { month: 6, revenue: 61000 },
    { month: 7, revenue: 58000 }, { month: 8, revenue: 67000 },
    { month: 9, revenue: 72000 }, { month: 10, revenue: 78000 },
    { month: 11, revenue: 85000 }, { month: 12, revenue: 91000 },
  ].map(d => ({ ...d, region: "South" })),
]

const stackedData = [
  ...multiLineData,
  ...[
    { month: 1, revenue: 15000 }, { month: 2, revenue: 19000 },
    { month: 3, revenue: 22000 }, { month: 4, revenue: 28000 },
    { month: 5, revenue: 31000 }, { month: 6, revenue: 35000 },
    { month: 7, revenue: 38000 }, { month: 8, revenue: 42000 },
    { month: 9, revenue: 39000 }, { month: 10, revenue: 45000 },
    { month: 11, revenue: 51000 }, { month: 12, revenue: 58000 },
  ].map(d => ({ ...d, region: "East" })),
]

const scatterData = [
  { age: 25, income: 35000, dept: "Eng" },
  { age: 32, income: 72000, dept: "Eng" },
  { age: 28, income: 48000, dept: "Design" },
  { age: 45, income: 95000, dept: "Eng" },
  { age: 38, income: 68000, dept: "Design" },
  { age: 29, income: 55000, dept: "Sales" },
  { age: 52, income: 110000, dept: "Eng" },
  { age: 35, income: 62000, dept: "Sales" },
  { age: 41, income: 85000, dept: "Design" },
  { age: 27, income: 42000, dept: "Sales" },
  { age: 33, income: 78000, dept: "Eng" },
  { age: 48, income: 98000, dept: "Design" },
]

const heatmapData: { x: number; y: number; value: number }[] = []
for (let x = 0; x < 6; x++) {
  for (let y = 0; y < 5; y++) {
    heatmapData.push({ x, y, value: Math.round(10 + Math.sin(x + y) * 30 + x * 5 + y * 3) })
  }
}

const categoryData = [
  { department: "Engineering", headcount: 142 },
  { department: "Sales", headcount: 89 },
  { department: "Marketing", headcount: 64 },
  { department: "Operations", headcount: 51 },
  { department: "Finance", headcount: 38 },
  { department: "HR", headcount: 25 },
]

const stackBarData = [
  { quarter: "Q1", dept: "Eng", spend: 450 },
  { quarter: "Q1", dept: "Sales", spend: 320 },
  { quarter: "Q1", dept: "Mktg", spend: 280 },
  { quarter: "Q2", dept: "Eng", spend: 510 },
  { quarter: "Q2", dept: "Sales", spend: 350 },
  { quarter: "Q2", dept: "Mktg", spend: 310 },
  { quarter: "Q3", dept: "Eng", spend: 480 },
  { quarter: "Q3", dept: "Sales", spend: 380 },
  { quarter: "Q3", dept: "Mktg", spend: 290 },
  { quarter: "Q4", dept: "Eng", spend: 560 },
  { quarter: "Q4", dept: "Sales", spend: 410 },
  { quarter: "Q4", dept: "Mktg", spend: 340 },
]

const pieData = [
  { category: "Desktop", value: 58 },
  { category: "Mobile", value: 28 },
  { category: "Tablet", value: 10 },
  { category: "Other", value: 4 },
]

const boxData: { group: string; value: number }[] = []
const groups = ["A", "B", "C", "D"]
for (const g of groups) {
  const center = g === "A" ? 50 : g === "B" ? 65 : g === "C" ? 45 : 70
  for (let i = 0; i < 20; i++) {
    boxData.push({ group: g, value: center + (Math.random() - 0.5) * 40 })
  }
}

const sankeyEdges = [
  { source: "Revenue", target: "Product", value: 500 },
  { source: "Revenue", target: "Services", value: 300 },
  { source: "Revenue", target: "Licensing", value: 200 },
  { source: "Product", target: "COGS", value: 200 },
  { source: "Product", target: "Gross Profit", value: 300 },
  { source: "Services", target: "COGS", value: 100 },
  { source: "Services", target: "Gross Profit", value: 200 },
  { source: "Licensing", target: "Gross Profit", value: 200 },
  { source: "Gross Profit", target: "OpEx", value: 350 },
  { source: "Gross Profit", target: "Net Income", value: 350 },
]

const networkNodes = [
  { id: "Alice", team: "Eng" }, { id: "Bob", team: "Eng" },
  { id: "Carol", team: "Design" }, { id: "Dave", team: "Design" },
  { id: "Eve", team: "PM" }, { id: "Frank", team: "PM" },
]
const networkEdges = [
  { source: "Alice", target: "Bob" }, { source: "Alice", target: "Carol" },
  { source: "Bob", target: "Dave" }, { source: "Carol", target: "Eve" },
  { source: "Dave", target: "Frank" }, { source: "Eve", target: "Alice" },
  { source: "Frank", target: "Bob" },
]

const treeData = {
  name: "CEO",
  children: [
    {
      name: "CTO",
      children: [
        { name: "Eng Lead", children: [{ name: "Frontend" }, { name: "Backend" }, { name: "Infra" }] },
        { name: "Data Lead", children: [{ name: "ML" }, { name: "Analytics" }] },
      ],
    },
    {
      name: "CFO",
      children: [
        { name: "Accounting" },
        { name: "FP&A" },
      ],
    },
    {
      name: "COO",
      children: [
        { name: "HR" },
        { name: "Facilities" },
        { name: "Legal" },
      ],
    },
  ],
}

const treemapData = {
  name: "Budget",
  children: [
    {
      name: "Engineering",
      children: [
        { name: "Salaries", value: 800 },
        { name: "Tools", value: 150 },
        { name: "Cloud", value: 300 },
      ],
    },
    {
      name: "Marketing",
      children: [
        { name: "Ads", value: 400 },
        { name: "Events", value: 200 },
        { name: "Content", value: 100 },
      ],
    },
    {
      name: "Operations",
      children: [
        { name: "Office", value: 250 },
        { name: "Travel", value: 100 },
      ],
    },
  ],
}

// ── Render helpers ──────────────────────────────────────────────────────

function renderHOC(label: string, element: React.ReactElement): string {
  try {
    return ReactDOMServer.renderToStaticMarkup(element)
  } catch (e: any) {
    return `<div style="color:red;padding:20px;border:1px solid red">Error rendering ${label}: ${e.message}</div>`
  }
}

function card(title: string, svg: string): string {
  return `
    <div class="card">
      <h3>${title}</h3>
      <div class="chart">${svg}</div>
    </div>`
}

// ── Generate all charts ────────────────────────────────────────────────

const W = 500
const H = 320
const pieSize = 360

const charts: string[] = []

// --- XY Charts (Component SSR) ---
charts.push(card("LineChart", renderHOC("LineChart",
  <LineChart data={timeSeriesData} xAccessor="month" yAccessor="revenue" width={W} height={H} title="Monthly Revenue" />
)))

charts.push(card("LineChart (multi-line)", renderHOC("LineChart multi",
  <LineChart data={multiLineData} xAccessor="month" yAccessor="revenue" lineBy="region" colorBy="region" width={W} height={H} showLegend />
)))

charts.push(card("AreaChart", renderHOC("AreaChart",
  <AreaChart data={timeSeriesData} xAccessor="month" yAccessor="revenue" width={W} height={H} />
)))

charts.push(card("StackedAreaChart", renderHOC("StackedAreaChart",
  <StackedAreaChart data={stackedData} xAccessor="month" yAccessor="revenue" areaBy="region" colorBy="region" width={W} height={H} showLegend />
)))

charts.push(card("Scatterplot", renderHOC("Scatterplot",
  <Scatterplot data={scatterData} xAccessor="age" yAccessor="income" colorBy="dept" width={W} height={H} showLegend />
)))

charts.push(card("Heatmap", renderHOC("Heatmap",
  <Heatmap data={heatmapData} xAccessor="x" yAccessor="y" valueAccessor="value" width={W} height={H} />
)))

// --- Ordinal Charts (Component SSR) ---
charts.push(card("BarChart", renderHOC("BarChart",
  <BarChart data={categoryData} categoryAccessor="department" valueAccessor="headcount" width={W} height={H} colorBy="department" />
)))

charts.push(card("BarChart (horizontal)", renderHOC("BarChart horizontal",
  <BarChart data={categoryData} categoryAccessor="department" valueAccessor="headcount" orientation="horizontal" width={W} height={H} colorBy="department" />
)))

charts.push(card("StackedBarChart", renderHOC("StackedBarChart",
  <StackedBarChart data={stackBarData} categoryAccessor="quarter" valueAccessor="spend" stackBy="dept" width={W} height={H} showLegend />
)))

charts.push(card("PieChart", renderHOC("PieChart",
  <PieChart data={pieData} categoryAccessor="category" valueAccessor="value" width={pieSize} height={pieSize} />
)))

charts.push(card("DonutChart", renderHOC("DonutChart",
  <DonutChart data={pieData} categoryAccessor="category" valueAccessor="value" width={pieSize} height={pieSize} />
)))

charts.push(card("BoxPlot", renderHOC("BoxPlot",
  <BoxPlot data={boxData} categoryAccessor="group" valueAccessor="value" width={W} height={H} />
)))

charts.push(card("DotPlot", renderHOC("DotPlot",
  <DotPlot data={categoryData} categoryAccessor="department" valueAccessor="headcount" width={W} height={H} />
)))

// --- Network Charts (Component SSR) ---
charts.push(card("ForceDirectedGraph", renderHOC("ForceDirectedGraph",
  <ForceDirectedGraph nodes={networkNodes} edges={networkEdges} colorBy="team" nodeSize={10} showLabels width={W} height={H} />
)))

charts.push(card("SankeyDiagram", renderHOC("SankeyDiagram",
  <SankeyDiagram edges={sankeyEdges} sourceAccessor="source" targetAccessor="target" valueAccessor="value" width={W} height={H} showLabels />
)))

charts.push(card("TreeDiagram", renderHOC("TreeDiagram",
  <TreeDiagram data={treeData} childrenAccessor="children" nodeIdAccessor="name" colorByDepth width={W} height={H} showLabels />
)))

charts.push(card("Treemap", renderHOC("Treemap",
  <Treemap data={treemapData} childrenAccessor="children" valueAccessor="value" nodeIdAccessor="name" colorByDepth showLabels width={W} height={H} />
)))

// --- Standalone SSR (renderToStaticSVG) ---
const standaloneCharts: string[] = []

try {
  standaloneCharts.push(card("Line (standalone)", renderXYToStaticSVG({
    chartType: "line",
    data: timeSeriesData,
    xAccessor: "month",
    yAccessor: "revenue",
    size: [W, H],
    showAxes: true,
    xLabel: "Month",
    yLabel: "Revenue",
  })))
} catch (e: any) {
  standaloneCharts.push(card("Line (standalone)", `<div style="color:red">${e.message}</div>`))
}

try {
  standaloneCharts.push(card("Scatter (standalone)", renderXYToStaticSVG({
    chartType: "scatter",
    data: scatterData,
    xAccessor: "age",
    yAccessor: "income",
    size: [W, H],
    showAxes: true,
  })))
} catch (e: any) {
  standaloneCharts.push(card("Scatter (standalone)", `<div style="color:red">${e.message}</div>`))
}

try {
  standaloneCharts.push(card("Bar (standalone)", renderOrdinalToStaticSVG({
    chartType: "bar",
    data: categoryData,
    oAccessor: "department",
    rAccessor: "headcount",
    size: [W, H],
    showAxes: true,
  })))
} catch (e: any) {
  standaloneCharts.push(card("Bar (standalone)", `<div style="color:red">${e.message}</div>`))
}

try {
  standaloneCharts.push(card("Pie (standalone)", renderOrdinalToStaticSVG({
    chartType: "pie",
    data: pieData,
    oAccessor: "category",
    rAccessor: "value",
    projection: "radial",
    size: [pieSize, pieSize],
  })))
} catch (e: any) {
  standaloneCharts.push(card("Pie (standalone)", `<div style="color:red">${e.message}</div>`))
}

try {
  standaloneCharts.push(card("Sankey (standalone)", renderNetworkToStaticSVG({
    chartType: "sankey" as NetworkChartType,
    edges: sankeyEdges as RealtimeEdge[],
    sourceAccessor: "source",
    targetAccessor: "target",
    valueAccessor: "value",
    size: [W, H],
  })))
} catch (e: any) {
  standaloneCharts.push(card("Sankey (standalone)", `<div style="color:red">${e.message}</div>`))
}

try {
  standaloneCharts.push(card("Force (standalone)", renderNetworkToStaticSVG({
    chartType: "force" as NetworkChartType,
    nodes: networkNodes as RealtimeNode[],
    edges: networkEdges as RealtimeEdge[],
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    size: [W, H],
  })))
} catch (e: any) {
  standaloneCharts.push(card("Force (standalone)", `<div style="color:red">${e.message}</div>`))
}

// ── Assemble HTML ──────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Semiotic SSR Gallery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin: 32px 0 16px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    .subtitle { color: #777; margin-bottom: 24px; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(520px, 1fr)); gap: 20px; }
    .card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h3 { font-size: 14px; color: #666; margin-bottom: 12px; font-weight: 500; }
    .chart { display: flex; justify-content: center; }
    .chart svg { max-width: 100%; height: auto; }
    .stats { margin-top: 32px; padding: 16px; background: white; border-radius: 8px; font-size: 13px; color: #555; }
    .stats code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Semiotic SSR Gallery</h1>
  <p class="subtitle">Generated server-side — no JavaScript, no canvas, pure SVG.</p>

  <h2>Component SSR (HOC → ReactDOMServer.renderToStaticMarkup)</h2>
  <p class="subtitle">Same React components used on the client, rendered in a Node environment. Stream Frames detect <code>typeof window === "undefined"</code> and render SVG instead of canvas.</p>
  <div class="grid">
    ${charts.join("\n")}
  </div>

  <h2>Standalone SSR (renderToStaticSVG)</h2>
  <p class="subtitle">Direct pipeline computation → SVG generation via <code>semiotic/server</code>. No React component tree — just data in, SVG string out.</p>
  <div class="grid">
    ${standaloneCharts.join("\n")}
  </div>

  <div class="stats">
    <strong>Rendering stats:</strong>
    ${charts.length} component charts + ${standaloneCharts.length} standalone charts = ${charts.length + standaloneCharts.length} total SVGs rendered server-side.
  </div>
</body>
</html>`

process.stdout.write(html)
