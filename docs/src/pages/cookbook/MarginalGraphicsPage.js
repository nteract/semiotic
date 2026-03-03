import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import MarginalGraphics from "../../examples/MarginalGraphics"

export default function MarginalGraphicsPage() {
  return (
    <PageLayout
      title="Marginal Graphics"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Marginal Graphics", path: "/cookbook/marginal-graphics" },
      ]}
      prevPage={{
        title: "Uncertainty Visualization",
        path: "/cookbook/uncertainty-visualization",
      }}
      nextPage={{ title: "Bar + Line Chart", path: "/cookbook/bar-line-chart" }}
    >
      <p>
        Scatter plots reveal relationships between two variables, but they hide
        the univariate distribution along each axis. This recipe adds marginal
        distribution graphics -- a ridgeline plot along the top axis and a
        heatmap along the right axis -- to provide density context alongside
        each dimension.
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
        <MarginalGraphics />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Marginal graphics are configured directly on the axis objects using the{" "}
        <code>marginalSummaryType</code> property. Each axis can host a
        different summary type -- here the top axis uses a ridgeline with
        visible points, and the right axis uses a heatmap:
      </p>
      <CodeBlock
        code={`axes: [
  {
    orient: "top",
    baseline: false,
    marginalSummaryType: {
      type: "ridgeline",
      bins: 8,
      summaryStyle: {
        fill: theme[3],
        fillOpacity: 0.5,
        stroke: theme[3]
      },
      showPoints: true,
      pointStyle: {
        stroke: theme[3],
        strokeOpacity: 0.75,
        fill: "none"
      }
    }
  },
  {
    orient: "right",
    baseline: false,
    marginalSummaryType: {
      type: "heatmap",
      summaryStyle: { fill: theme[3] }
    }
  },
  { orient: "left", label: "Exit Velocity" },
  { orient: "bottom", label: "Distance" }
]`}
        language="jsx"
      />
      <p>
        The <code>marginalSummaryType</code> accepts any of the summary types
        available in OrdinalFrame (ridgeline, histogram, heatmap, violin, etc.),
        making it easy to swap between different distribution representations
        without changing the underlying data.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>marginalSummaryType</code> on axis objects creates density
          visualizations in the margins of XYFrame scatter plots.
        </li>
        <li>
          You can use any OrdinalFrame summary type (ridgeline, heatmap,
          histogram, violin) as a marginal graphic.
        </li>
        <li>
          Combining <code>showPoints</code> with a ridgeline marginal gives
          both individual-point and aggregate-density views.
        </li>
        <li>
          Different marginal types on different axes (ridgeline on top, heatmap
          on right) can complement each other.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying frame
          with marginal graphics support
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — point-based XY
          visualization
        </li>
        <li>
          <Link to="/cookbook/ridgeline-plot">Ridgeline Plot</Link> — full
          ridgeline chart using OrdinalFrame
        </li>
      </ul>
    </PageLayout>
  )
}
