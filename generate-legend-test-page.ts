/**
 * Generate a static HTML gallery of server-rendered SVG charts with legends
 * at all four positions, plus background and colorScheme tests.
 *
 * Output: test-results/server-legend-gallery.html
 * Used by: integration-tests/server-legend.spec.ts
 */

import * as fs from "fs"
import * as path from "path"
import { renderChart } from "../src/components/server/renderToStaticSVG"

const outDir = path.resolve(__dirname, "../test-results")
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const barData = [
  { category: "A", value: 10, group: "X" },
  { category: "B", value: 20, group: "Y" },
  { category: "C", value: 15, group: "X" },
  { category: "D", value: 25, group: "Y" },
]

const lineData = [
  { x: 1, y: 10, series: "Alpha" },
  { x: 2, y: 20, series: "Alpha" },
  { x: 3, y: 15, series: "Alpha" },
  { x: 1, y: 5, series: "Beta" },
  { x: 2, y: 15, series: "Beta" },
  { x: 3, y: 25, series: "Beta" },
]

const pieData = [
  { category: "Red", value: 30 },
  { category: "Blue", value: 50 },
  { category: "Green", value: 20 },
]

interface TestCase {
  id: string
  svg: string
}

const cases: TestCase[] = [
  {
    id: "bar-legend-right",
    svg: renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "group", showLegend: true, legendPosition: "right",
      width: 400, height: 300,
    }),
  },
  {
    id: "bar-legend-left",
    svg: renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "group", showLegend: true, legendPosition: "left",
      width: 400, height: 300,
    }),
  },
  {
    id: "bar-legend-top",
    svg: renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "group", showLegend: true, legendPosition: "top",
      width: 400, height: 300,
    }),
  },
  {
    id: "bar-legend-bottom",
    svg: renderChart("BarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "group", showLegend: true, legendPosition: "bottom",
      width: 400, height: 300,
    }),
  },
  {
    id: "line-legend-right",
    svg: renderChart("LineChart", {
      data: lineData, xAccessor: "x", yAccessor: "y",
      lineBy: "series", colorBy: "series",
      showLegend: true, legendPosition: "right",
      width: 400, height: 300,
    }),
  },
  {
    id: "line-legend-left",
    svg: renderChart("LineChart", {
      data: lineData, xAccessor: "x", yAccessor: "y",
      lineBy: "series", colorBy: "series",
      showLegend: true, legendPosition: "left",
      width: 400, height: 300,
    }),
  },
  {
    id: "pie-legend-right",
    svg: renderChart("PieChart", {
      data: pieData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "category", showLegend: true, legendPosition: "right",
      width: 400, height: 300,
    }),
  },
  {
    id: "pie-legend-bottom",
    svg: renderChart("PieChart", {
      data: pieData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "category", showLegend: true, legendPosition: "bottom",
      width: 400, height: 300,
    }),
  },
  {
    id: "pie-background",
    svg: renderChart("PieChart", {
      data: pieData, categoryAccessor: "category", valueAccessor: "value",
      colorBy: "category", showLegend: true, background: "#1a1a2e",
      width: 400, height: 300,
    }),
  },
  {
    id: "line-colorscheme",
    svg: renderChart("LineChart", {
      data: lineData, xAccessor: "x", yAccessor: "y",
      lineBy: "series", colorBy: "series",
      colorScheme: ["#0EA4AF", "#DB2187"],
      showLegend: true,
      width: 400, height: 300,
    }),
  },
  {
    id: "stacked-bar-legend",
    svg: renderChart("StackedBarChart", {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      stackBy: "group", colorBy: "group",
      showLegend: true, legendPosition: "right",
      width: 400, height: 300,
    }),
  },
]

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Server Legend Gallery</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    .case { margin-bottom: 24px; background: white; padding: 12px; border-radius: 8px; display: inline-block; }
    .case h3 { margin: 0 0 8px 0; font-size: 14px; color: #333; }
  </style>
</head>
<body>
  <h1>Server-Rendered SVG Legend Gallery</h1>
  ${cases.map(c => `
  <div class="case">
    <h3>${c.id}</h3>
    ${c.svg}
  </div>
  `).join("\n")}
</body>
</html>`

const outPath = path.join(outDir, "server-legend-gallery.html")
fs.writeFileSync(outPath, html)
console.log(`Generated ${outPath} with ${cases.length} charts`)
