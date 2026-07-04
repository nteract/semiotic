import React from "react"
import RecipeLayout from "../../components/RecipeLayout"
import BenchmarkDashboard from "../../examples/recipes/BenchmarkDashboard"

const sourceCode = `import {
  GroupedBarChart, LineChart, BarChart,
  Heatmap, StackedBarChart, DonutChart,
} from "semiotic"

// Set CSS custom properties on a parent element for dark mode:
// --semiotic-text: #e2e8f0
// --semiotic-text-secondary: #94a3b8
// --semiotic-border: #334155
// --semiotic-grid: #334155

<GroupedBarChart
  data={tierData}
  categoryAccessor="tier"
  valueAccessor="score"
  groupBy="library"
  colorBy="library"
  showGrid
/>

<LineChart
  data={perfLines}
  xAccessor="size" yAccessor="ms"
  lineBy="library" colorBy="library"
  showGrid curve="monotoneX" showPoints
/>

<Heatmap
  data={heatmapData}
  xAccessor="scenario" yAccessor="library"
  valueAccessor="score" colorScheme="viridis"
  showValues
/>`

export default function BenchmarkDashboardPage() {
  return (
    <RecipeLayout
      title="Benchmark Dashboard"
      breadcrumbs={[
        { label: "Recipes", href: "/recipes" },
        { label: "Benchmark Dashboard" },
      ]}
      prevPage={{ label: "Network Explorer", href: "/recipes/network-explorer" }}
      fullSourceCode={sourceCode}
      dependencies={[
        "GroupedBarChart",
        "LineChart",
        "BarChart",
        "Heatmap",
        "StackedBarChart",
        "DonutChart",
      ]}
    >
      <p>
        A dark-mode analytics dashboard comparing four dataviz libraries across 30 AI benchmark
        scenarios. Uses CSS custom properties (<code>--semiotic-text</code>,{" "}
        <code>--semiotic-border</code>, <code>--semiotic-grid</code>) to theme Semiotic charts
        for dark backgrounds.
      </p>
      <BenchmarkDashboard />
    </RecipeLayout>
  )
}
