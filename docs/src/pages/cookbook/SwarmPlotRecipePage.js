import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import SwarmPlot from "../../examples/SwarmPlot"

export default function SwarmPlotRecipePage() {
  return (
    <PageLayout
      title="Swarm Plot"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Swarm Plot", path: "/cookbook/swarm-plot" },
      ]}
      prevPage={{
        title: "Marimekko Chart",
        path: "/cookbook/marimekko-chart",
      }}
      nextPage={{
        title: "Ridgeline Plot",
        path: "/cookbook/ridgeline-plot",
      }}
    >
      <p>
        When you have many data points along a single quantitative axis,
        plotting them as a strip results in severe overplotting. A beeswarm
        (or swarm) plot applies a collision force to spread points vertically
        while preserving their quantitative position. This recipe uses
        OrdinalFrame's <code>swarm</code> type with custom marks to create a
        labeled beeswarm of weekly box office totals.
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
        <SwarmPlot />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The <code>swarm</code> type applies a force-directed collision layout
        to position pieces without overlap. A <code>customMark</code> renders
        each point as a colored circle with the week number as a label inside:
      </p>
      <CodeBlock
        code={`type: {
  type: "swarm",
  r: 14,
  customMark: d => {
    const [year, week] = d.date.split("-")
    return (
      <g>
        <circle
          r={11}
          stroke={year === "2016" ? theme[0] : theme[2]}
          fill={year === "2016" ? theme[0] : theme[2]}
        />
        <text
          fill={year === "2016" ? "white" : "black"}
          fontWeight="bold"
          textAnchor="middle"
          y=".4em"
        >
          {week}
        </text>
      </g>
    )
  }
}`}
        language="jsx"
      />
      <p>
        The <code>r</code> parameter controls the collision radius, ensuring
        circles do not overlap. The horizontal projection and{" "}
        <code>oAccessor: "none"</code> place all points in a single row,
        spread along the quantitative axis:
      </p>
      <CodeBlock
        code={`projection: "horizontal",
oAccessor: "none",
rAccessor: "total",
rExtent: [0]`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>swarm</code> type applies collision detection to prevent
          overlapping while preserving quantitative positioning.
        </li>
        <li>
          The <code>r</code> parameter on the swarm type controls the spacing
          between pieces.
        </li>
        <li>
          <code>customMark</code> gives full control over each piece's
          appearance, enabling labeled circles or any other glyph.
        </li>
        <li>
          Using <code>oAccessor: "none"</code> with a horizontal projection
          collapses all data into a single row for a pure swarm layout.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          frame with swarm type support
        </li>
        <li>
          <Link to="/cookbook/ridgeline-plot">Ridgeline Plot</Link> — another
          way to show distributions across categories
        </li>
        <li>
          <Link to="/cookbook/bar-to-parallel">Bar to Parallel</Link> — swarm
          used as an intermediate step in iterative design
        </li>
      </ul>
    </PageLayout>
  )
}
