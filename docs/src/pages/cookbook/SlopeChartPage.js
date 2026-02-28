import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import SlopeChart from "../../examples/SlopeChart"

export default function SlopeChartPage() {
  return (
    <PageLayout
      title="Slope Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Slope Chart", path: "/cookbook/slope-chart" },
      ]}
      prevPage={{
        title: "Waterfall Chart",
        path: "/cookbook/waterfall-chart",
      }}
      nextPage={{
        title: "Marimekko Chart",
        path: "/cookbook/marimekko-chart",
      }}
    >
      <p>
        Slope charts are excellent for comparing values between two time periods
        or conditions. They make it immediately clear which categories improved,
        declined, or stayed stable. This recipe uses OrdinalFrame's{" "}
        <code>connectorType</code> to draw lines between points across two
        ordinal columns, creating an effective before-and-after comparison of
        binge drinking rates across U.S. cities.
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
        <SlopeChart />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The data contains one row per city per year. OrdinalFrame groups these
        into columns by <code>year</code>. The <code>connectorType</code>{" "}
        function returns the city name, so pieces sharing the same city name
        across columns get connected with a filled path:
      </p>
      <CodeBlock
        code={`const frameProps = {
  oAccessor: "year",
  rAccessor: "value",
  rExtent: [0],
  type: { type: "point", r: () => 5 },
  connectorType: d => d.name,
  connectorStyle: d => ({
    fill: d.source.color,
    stroke: d.source.color,
    strokeOpacity: 0.5,
    fillOpacity: 0.5
  }),
  style: d => ({
    fill: d.color,
    stroke: "white",
    strokeOpacity: 0.5
  })
}`}
        language="jsx"
      />
      <p>
        A manual legend is placed using <code>foregroundGraphics</code> to
        identify each city by color. Axes on both left and right sides help
        readers compare exact values at both endpoints:
      </p>
      <CodeBlock
        code={`axes: [
  {
    orient: "left",
    tickFormat: d => \`\${d}%\`,
    baseline: false,
    label: { name: "Adults Who Binge Drink" }
  },
  {
    tickFormat: d => \`\${d}%\`,
    baseline: false,
    orient: "right"
  }
]`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <code>connectorType</code> links pieces across ordinal columns by a
          shared identifier, creating the slope lines.
        </li>
        <li>
          Using <code>type: "point"</code> instead of <code>"bar"</code> turns
          the chart from a grouped bar chart into a slope chart.
        </li>
        <li>
          Dual axes (left and right) help readers read precise values at both
          time points without visual clutter.
        </li>
        <li>
          <code>foregroundGraphics</code> lets you place custom legend elements
          anywhere in the SVG coordinate space.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          frame for slope chart rendering
        </li>
        <li>
          <Link to="/cookbook/bar-to-parallel">Bar to Parallel</Link> — another
          recipe using connectors between ordinal columns
        </li>
        <li>
          <Link to="/cookbook/dot-plot">Dot Plot</Link> — a related
          before-and-after comparison chart
        </li>
      </ul>
    </PageLayout>
  )
}
