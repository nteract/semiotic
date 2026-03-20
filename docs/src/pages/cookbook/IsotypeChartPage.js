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
        recipe renders a survey of data visualization practitioners and
        journalists, with each person represented by a small person-shaped
        SVG silhouette. Journalists are colored in{" "}
        <span style={{ color: "#9fd0cb" }}>teal</span> and viz experts in{" "}
        <span style={{ color: "#E0488B" }}>pink</span>.
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
        The chart lays out a person silhouette SVG path for each respondent in
        a column. Each column corresponds to a data bin (how much they
        write vs. create data viz), and the number of repeated icons in
        each column encodes the count. A color hash maps the respondent
        type to the appropriate color:
      </p>
      <CodeBlock
        code={`const personPath = "M 9.12,3.34 C ... Z" // head + body silhouette

const colorHash = {
  journalist: theme[2],  // teal
  viz: theme[1]          // pink
}

// For each data point, repeat the person icon vertically:
for (let i = 0; i < d.number; i++) {
  <path d={personPath} fill={color} stroke={color} strokeWidth={1.5} />
}`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Repeated SVG path shapes create a pictogram / isotype chart where
          each icon represents one person.
        </li>
        <li>
          Color distinguishes categories (journalist vs. viz expert) using
          the same silhouette shape for both.
        </li>
        <li>
          The chart is responsive, using a <code>ResizeObserver</code> to
          adjust column widths and icon scaling to fit the container.
        </li>
        <li>
          SVG rendering ensures crisp icons at any resolution, with no
          canvas rasterization artifacts.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — the
          underlying ordinal frame for bar charts
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — standard bar chart
          for comparison
        </li>
        <li>
          <Link to="/cookbook/waterfall-chart">Waterfall Chart</Link> — another
          custom rendering approach
        </li>
      </ul>
    </PageLayout>
  )
}
