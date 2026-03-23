import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import IsotypeChart from "../../examples/IsotypeChart"

export default function IsotypeChartPage() {
  return (
    <PageLayout
      title="Isotype Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Isotype Chart", path: "/cookbook/isotype-chart" },
      ]}
      prevPage={{ title: "Radar Plot", path: "/cookbook/radar-plot" }}
      nextPage={{ title: "Matrix", path: "/cookbook/matrix" }}
    >
      <p>
        Isotype charts (pictogram charts) replace abstract bar lengths with
        repeated icons, making quantities more tangible and engaging. This
        recipe uses <code>StreamOrdinalFrame</code> as a stacked bar chart
        where each person is a separate bar segment, with person silhouette
        icons rendered as an SVG overlay via <code>foregroundGraphics</code>.
      </p>

      <h2 id="the-visualization">The Visualization</h2>
      <div
        style={{
          background: "var(--surface-1)",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid var(--surface-3)",
        }}
      >
        <IsotypeChart />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The data is expanded so each person is a separate data point with a
        unique <code>personId</code>. StreamOrdinalFrame stacks these
        unit-height bars in each column. The bars themselves are made
        transparent, and a <code>foregroundGraphics</code> function renders
        person silhouette SVG paths at the computed positions:
      </p>
      <CodeBlock
        code={`// Expand: one row per person with unique stack key
expandedData.push({
  bin: d.writeviz.toFixed(2),
  type: d.type,
  count: 1,
  personId: \`\${d.type}-\${bin}-\${i}\`
})

// StreamOrdinalFrame stacks by personId
const frameProps = {
  chartType: "bar",
  oAccessor: "bin",
  rAccessor: "count",
  stackBy: "personId",
  pieceStyle: () => ({ fillOpacity: 0 }), // invisible bars
  foregroundGraphics: ({ size, margin }) => {
    // Compute icon positions from chart dimensions
    // Render person silhouettes colored by type
  }
}`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>StreamOrdinalFrame as backbone</strong> — provides category
          layout, axes, margins, and responsiveness. The chart is a real
          stacked bar chart with transparent bars.
        </li>
        <li>
          <strong>foregroundGraphics for custom marks</strong> — the function
          form receives <code>{"{size, margin}"}</code>, letting you compute
          icon positions from the frame&apos;s layout.
        </li>
        <li>
          Each person is a separate bar segment (
          <code>stackBy: &quot;personId&quot;</code>), so the stacking logic
          handles ordering. Icons are positioned to match.
        </li>
        <li>
          Color distinguishes categories (journalist vs. viz expert) using
          the same silhouette shape for both.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — the
          underlying ordinal frame
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — standard bar chart
        </li>
        <li>
          <Link to="/charts/stacked-bar-chart">StackedBarChart</Link> — stacked
          bar chart HOC
        </li>
      </ul>
    </PageLayout>
  )
}
