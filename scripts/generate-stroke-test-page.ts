/**
 * Generate test page for CSS var stroke resolution on pie/bar charts.
 * Run: npx tsx scripts/generate-stroke-test-page.ts
 */
import * as fs from "fs"
import * as path from "path"
import { renderChart } from "../src/components/server/renderToStaticSVG"

const outDir = path.resolve(__dirname, "../test-results")
fs.mkdirSync(outDir, { recursive: true })

const barData = [
  { category: "Q1", product: "Widgets", value: 12000 },
  { category: "Q1", product: "Gadgets", value: 8000 },
  { category: "Q2", product: "Widgets", value: 15000 },
  { category: "Q2", product: "Gadgets", value: 9000 },
  { category: "Q3", product: "Widgets", value: 11000 },
  { category: "Q3", product: "Gadgets", value: 10000 },
]

const pieData = [
  { category: "Desktop", value: 58 },
  { category: "Mobile", value: 28 },
  { category: "Tablet", value: 14 },
]

// Test 1: StackedBarChart with white stroke via pieceStyle
const stackedWithStroke = renderChart("StackedBarChart", {
  data: barData,
  categoryAccessor: "category",
  stackBy: "product",
  valueAccessor: "value",
  colorScheme: ["#6366f1", "#f59e0b"],
  width: 400, height: 250,
  title: "Stacked Bar — stroke: #fff",
  frameProps: {
    pieceStyle: () => ({ stroke: "#ffffff", strokeWidth: 2 }),
  },
})

// Check: does the SVG contain stroke="#ffffff"?
const hasBarStroke = stackedWithStroke.includes('stroke="#ffffff"') || stackedWithStroke.includes("stroke=\"#ffffff\"")
console.log(`StackedBar stroke present in SVG: ${hasBarStroke}`)
if (!hasBarStroke) {
  // Check what fill/stroke the rects have
  const rects = stackedWithStroke.match(/<rect[^>]*>/g) || []
  console.log(`  Rects found: ${rects.length}`)
  rects.slice(0, 3).forEach(r => console.log(`  ${r.substring(0, 120)}`))
}

// Test 2: PieChart with white stroke
const pieWithStroke = renderChart("PieChart", {
  data: pieData,
  categoryAccessor: "category",
  valueAccessor: "value",
  width: 300, height: 300,
  title: "Pie — stroke: #fff",
  frameProps: {
    pieceStyle: () => ({ stroke: "#ffffff", strokeWidth: 2 }),
  },
})

const hasPieStroke = pieWithStroke.includes('stroke="#ffffff"') || pieWithStroke.includes("stroke=\"#ffffff\"")
console.log(`PieChart stroke present in SVG: ${hasPieStroke}`)
if (!hasPieStroke) {
  const paths = pieWithStroke.match(/<path[^>]*>/g) || []
  console.log(`  Paths found: ${paths.length}`)
  paths.slice(0, 3).forEach(p => console.log(`  ${p.substring(0, 120)}`))
}

// Test 3: BarChart with CSS var stroke
const barWithCSSVar = renderChart("BarChart", {
  data: [
    { category: "A", value: 10 },
    { category: "B", value: 20 },
    { category: "C", value: 15 },
  ],
  categoryAccessor: "category",
  valueAccessor: "value",
  colorBy: "category",
  width: 300, height: 200,
  title: "Bar — stroke: var(--semiotic-bg)",
  frameProps: {
    pieceStyle: () => ({ stroke: "var(--semiotic-bg, #fff)", strokeWidth: 1 }),
  },
})

const hasVarStroke = barWithCSSVar.includes("stroke")
console.log(`BarChart var stroke present: ${hasVarStroke}`)

// Write HTML gallery
const html = `<!DOCTYPE html>
<html><head><title>Stroke Test</title>
<style>body{font-family:sans-serif;background:#e8e8e8;padding:20px}
.card{display:inline-block;margin:12px;padding:12px;background:#fff;border:1px solid #ccc;vertical-align:top}
.label{font-size:11px;color:#666;font-family:monospace;margin-bottom:4px}
</style></head><body>
<h2>Stroke Tests</h2>
<div class="card"><div class="label">stacked-bar-stroke</div>${stackedWithStroke}</div>
<div class="card"><div class="label">pie-stroke</div>${pieWithStroke}</div>
<div class="card"><div class="label">bar-css-var-stroke</div>${barWithCSSVar}</div>
</body></html>`

fs.writeFileSync(path.join(outDir, "stroke-test.html"), html)
console.log("\nWrote test-results/stroke-test.html")
