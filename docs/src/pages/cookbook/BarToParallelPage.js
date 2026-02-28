import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import BarToParallel from "../../examples/BarToParallel"

export default function BarToParallelPage() {
  return (
    <PageLayout
      title="Bar to Parallel Coordinates"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        {
          label: "Bar to Parallel Coordinates",
          path: "/cookbook/bar-to-parallel",
        },
      ]}
      prevPage={{
        title: "Bar + Line Chart",
        path: "/cookbook/bar-line-chart",
      }}
      nextPage={{
        title: "Waterfall Chart",
        path: "/cookbook/waterfall-chart",
      }}
    >
      <p>
        Complex chart types like parallel coordinates can be intimidating for
        stakeholders. This recipe demonstrates how Semiotic's unified data
        model lets you iterate from a simple bar chart through stacked bars,
        connected slopegraphs, swarm plots, and finally a brushable parallel
        coordinates chart -- all by changing OrdinalFrame settings, not the
        underlying data.
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
        <BarToParallel />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The component steps through a series of OrdinalFrame configurations,
        all operating on the same funnel dataset. The progression starts with a
        basic bar chart and evolves by toggling <code>type</code>,{" "}
        <code>connectorType</code>, <code>rAccessor</code>, and{" "}
        <code>interaction</code> settings. Here is the key transition from bars
        to connected points:
      </p>
      <CodeBlock
        code={`// Step 3: Connected stacked bars
{
  type: "bar",
  oPadding: 40,
  connectorType: d => d.country,
  connectorStyle: d => ({
    fill: regionColors[d.source.region],
    stroke: regionColors[d.source.region]
  })
}

// Step 4: Slopegraph (bars become points)
{
  type: "point",
  connectorType: d => d.country,
  connectorStyle: d => ({
    fill: regionColors[d.source.region],
    stroke: regionColors[d.source.region]
  })
}`}
        language="jsx"
      />
      <p>
        The final step adds column brushing to create a fully interactive
        parallel coordinates chart. The <code>interaction</code> prop with{" "}
        <code>columnsBrush</code> enables brush selection on each axis,
        filtering paths that fall outside the selected range:
      </p>
      <CodeBlock
        code={`interaction: {
  columnsBrush: true,
  end: this.brushing,
  extent: this.state.columnExtent
}`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Semiotic's unified data model means the same dataset works across bar,
          point, swarm, and parallel coordinate views.
        </li>
        <li>
          The <code>connectorType</code> prop draws paths between pieces that
          share an identity, creating slopegraph or parallel-coordinate
          connections.
        </li>
        <li>
          <code>columnsBrush</code> in the <code>interaction</code> prop
          enables axis-level brushing for filtering multi-dimensional data.
        </li>
        <li>
          Iterative design -- starting simple and adding complexity -- is a
          natural workflow when the chart type is just a configuration change.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the frame
          powering all ordinal layout types
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — the starting point of
          this progression
        </li>
        <li>
          <Link to="/cookbook/slope-chart">Slope Chart</Link> — another
          connected ordinal visualization
        </li>
      </ul>
    </PageLayout>
  )
}
