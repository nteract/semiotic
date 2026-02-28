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
        recipe uses OrdinalFrame's icon bar type to display a survey of data
        visualization practitioners and journalists, with each person
        represented by a small person-shaped SVG path.
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
        The <code>icon</code> property on the bar type replaces rectangle bars
        with repeated SVG paths. Each icon shape is looked up from a hash based
        on the data type. The <code>resize: "fixed"</code> setting preserves
        the icon's natural aspect ratio instead of stretching it:
      </p>
      <CodeBlock
        code={`type: {
  type: "bar",
  icon: d => iconHash[d.type],
  iconPadding: 2,
  resize: "fixed"
}`}
        language="jsx"
      />
      <p>
        The icon paths are SVG path data strings. The same "rosto" (person
        silhouette) shape is used for both journalists and viz practitioners,
        distinguished by color. The <code>renderMode: "sketchy"</code> prop
        gives the entire chart a hand-drawn aesthetic:
      </p>
      <CodeBlock
        code={`const rosto = "M 9.12...(SVG path)...Z"

const iconHash = {
  viz: rosto,
  journalist: rosto,
  none: "M0,0"
}
const colorHash = {
  journalist: theme[2],
  viz: theme[1]
}

// In frame props:
renderMode: "sketchy",
style: d => ({
  fill: colorHash[d.type],
  stroke: colorHash[d.type],
  fillOpacity: 1,
  strokeWidth: 1.5
})`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>icon</code> property on bar types replaces bars with
          repeated SVG path shapes, creating pictogram charts.
        </li>
        <li>
          <code>resize: "fixed"</code> preserves icon proportions;{" "}
          <code>"auto"</code> would stretch icons to fill available space.
        </li>
        <li>
          <code>iconPadding</code> controls spacing between repeated icons
          within each bar.
        </li>
        <li>
          <code>renderMode: "sketchy"</code> applies a hand-drawn rendering
          style to all marks, including icon shapes.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          frame with icon bar support
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — standard bar chart
          without icon rendering
        </li>
        <li>
          <Link to="/cookbook/waterfall-chart">Waterfall Chart</Link> — another
          custom rendering approach in OrdinalFrame
        </li>
      </ul>
    </PageLayout>
  )
}
