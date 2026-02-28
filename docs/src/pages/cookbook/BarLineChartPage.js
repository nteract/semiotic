import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import BarLineChart from "../../examples/BarLineChart"

export default function BarLineChartPage() {
  return (
    <PageLayout
      title="Bar + Line Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Bar + Line Chart", path: "/cookbook/bar-line-chart" },
      ]}
      prevPage={{
        title: "Marginal Graphics",
        path: "/cookbook/marginal-graphics",
      }}
      nextPage={{
        title: "Bar to Parallel",
        path: "/cookbook/bar-to-parallel",
      }}
    >
      <p>
        Dashboards frequently need to overlay two metrics with different scales
        on the same chart -- for example, bar heights for one metric and a
        connected line for another. This recipe uses OrdinalFrame's multi-axis
        support and custom marks to combine bars and dots-with-connectors in a
        single visualization.
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
        <BarLineChart />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The secret is the <code>multiAxis</code> prop combined with multiple{" "}
        <code>rAccessor</code> values. When <code>multiAxis</code> is{" "}
        <code>true</code>, each accessor gets its own independent scale, so
        "leads" (0-200) and "sales" (0-7) can coexist without distortion:
      </p>
      <CodeBlock
        code={`rAccessor: ["leads", "sales"],
multiAxis: true,
axes: [
  {
    key: "leads-axis",
    orient: "right",
    tickValues: [0, 25, 50, 75, 100, 125, 150, 175, 200],
    label: <text fontWeight="bold" fill={theme[0]}>Leads</text>
  },
  {
    key: "sales-axis",
    orient: "left",
    tickValues: [0, 1, 2, 3, 4, 5, 6, 7],
    label: <text fontWeight="bold" fill={theme[1]}>Sales</text>
  }
]`}
        language="jsx"
      />
      <p>
        The <code>customMark</code> in the type definition uses{" "}
        <code>rIndex</code> to determine which accessor produced each piece,
        rendering a bar for leads and a circle for sales:
      </p>
      <CodeBlock
        code={`type: {
  type: "point",
  customMark: d => {
    if (d.rIndex === 1) {
      return <circle r={6} fill={theme[1]} />
    }
    return (
      <rect
        height={d.scaledValue}
        width={20}
        x={-10}
        fill={theme[0]}
      />
    )
  }
}`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>multiAxis</code> prop gives each <code>rAccessor</code> its
          own independent scale, enabling dual-axis charts.
        </li>
        <li>
          <code>rIndex</code> in custom marks tells you which accessor produced
          each piece, letting you vary the glyph shape per metric.
        </li>
        <li>
          <code>connectorType</code> with <code>rIndex</code> filtering
          creates line connections only between specific pieces (the "sales"
          dots).
        </li>
        <li>
          <code>renderOrder</code> controls z-ordering so connectors appear
          behind the marks.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          frame with multiAxis support
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — standard bar chart
          visualization
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — adding
          callouts and tooltips
        </li>
      </ul>
    </PageLayout>
  )
}
