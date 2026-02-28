import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import Timeline from "../../examples/Timeline"

export default function TimelinePage() {
  return (
    <PageLayout
      title="Timeline"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Timeline", path: "/cookbook/timeline" },
      ]}
      prevPage={{ title: "Dot Plot", path: "/cookbook/dot-plot" }}
      nextPage={{ title: "Radar Plot", path: "/cookbook/radar-plot" }}
    >
      <p>
        Timeline and Gantt charts visualize events or tasks across time,
        showing duration and sequence at a glance. This recipe uses
        OrdinalFrame's built-in <code>timeline</code> type to display U.S.
        presidential terms, with each row representing a president and bar
        length representing their time in office.
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
        <Timeline />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The timeline type expects the <code>rAccessor</code> to return a
        two-element array representing the start and end of each event.
        Combined with a horizontal projection, each president gets a row with a
        bar spanning their term:
      </p>
      <CodeBlock
        code={`rAccessor: d => [d.start, d.end],
oAccessor: "name",
projection: "horizontal",
type: "timeline",
axes: [{ orient: "bottom", ticks: 10 }]`}
        language="jsx"
      />
      <p>
        Color encodes political party using a lookup hash. The{" "}
        <code>oLabel</code> function colors each president's name to match
        their party, and <code>foregroundGraphics</code> adds a color legend:
      </p>
      <CodeBlock
        code={`style: d => ({
  fill: theme[colors[d.party] || 0],
  stroke: theme[(colors[d.party] || 0) + 5]
}),
oLabel: (d, i) => (
  <text
    y={3}
    textAnchor="end"
    fontSize="11"
    fill={theme[colors[i[0].party] || 0]}
  >
    {d}
  </text>
)`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>timeline</code> type in OrdinalFrame renders range-based
          bars from a two-element array accessor.
        </li>
        <li>
          Horizontal projection with generous left margins provides space for
          long category labels.
        </li>
        <li>
          The <code>oLabel</code> callback receives both the label string and
          the associated data array, enabling data-driven label styling.
        </li>
        <li>
          <code>foregroundGraphics</code> renders on top of the chart area,
          making it ideal for legends and annotations.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          frame with timeline type support
        </li>
        <li>
          <Link to="/cookbook/dot-plot">Dot Plot</Link> — another horizontal
          ordinal layout
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — standard bar layout
          for simpler categorical data
        </li>
      </ul>
    </PageLayout>
  )
}
