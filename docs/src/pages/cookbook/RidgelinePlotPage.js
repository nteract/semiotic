import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import RidgelinePlot from "../../examples/RidgelinePlot"

export default function RidgelinePlotPage() {
  return (
    <PageLayout
      title="Ridgeline Plot"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Ridgeline Plot", path: "/cookbook/ridgeline-plot" },
      ]}
      prevPage={{ title: "Swarm Plot", path: "/cookbook/swarm-plot" }}
      nextPage={{ title: "Dot Plot", path: "/cookbook/dot-plot" }}
    >
      <p>
        Ridgeline plots (also called joy plots) show the distribution of a
        quantitative variable across several categories, stacking density
        curves vertically with controlled overlap. This recipe recreates the
        famous "Perceptions of Probability" visualization using OrdinalFrame's
        ridgeline summary type.
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
        <RidgelinePlot />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The ridgeline layout is controlled by the <code>summaryType</code>{" "}
        prop. The <code>amplitude</code> parameter controls how much each
        density curve can overflow into adjacent rows, and <code>bins</code>{" "}
        sets the histogram resolution:
      </p>
      <CodeBlock
        code={`summaryType: {
  type: "ridgeline",
  bins: 10,
  amplitude: 50,
  curve: "monotonex"
},
summaryStyle: (d, i) => ({
  fill: theme[i % theme.length],
  stroke: "black",
  strokeWidth: 2,
  fillOpacity: 0.5,
  strokeOpacity: 0.25
})`}
        language="jsx"
      />
      <p>
        The data is organized with <code>oAccessor: "k"</code> (the
        probability phrase) and <code>rAccessor: "v"</code> (the probability
        value). The horizontal projection places categories as rows with
        distributions extending along the x-axis. Custom labels are positioned
        with right-alignment to sit neatly beside each ridge:
      </p>
      <CodeBlock
        code={`projection: "horizontal",
oAccessor: "k",
rAccessor: "v",
oLabel: d => (
  <text
    style={{ textAnchor: "end", fill: "grey" }}
    x={-10}
    y={5}
  >
    {d}
  </text>
)`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>ridgeline</code> summary type creates overlapping density
          curves across ordinal categories.
        </li>
        <li>
          The <code>amplitude</code> parameter controls how much each curve can
          extend into neighboring rows -- higher values create more dramatic
          overlap.
        </li>
        <li>
          <code>summaryHoverAnnotation</code> enables hover tooltips on the
          summary shapes themselves.
        </li>
        <li>
          Ridgeline plots work best with a horizontal projection and generous
          left margins for category labels.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          frame with summary type support
        </li>
        <li>
          <Link to="/cookbook/swarm-plot">Swarm Plot</Link> — an alternative
          distribution visualization
        </li>
        <li>
          <Link to="/cookbook/marginal-graphics">Marginal Graphics</Link> —
          ridgeline used as a marginal distribution on XYFrame
        </li>
      </ul>
    </PageLayout>
  )
}
