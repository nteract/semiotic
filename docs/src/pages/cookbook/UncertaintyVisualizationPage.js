import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import UncertaintyVisualization from "../../examples/UncertaintyVisualization"

export default function UncertaintyVisualizationPage() {
  return (
    <PageLayout
      title="Uncertainty Visualization"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        {
          label: "Uncertainty Visualization",
          path: "/cookbook/uncertainty-visualization",
        },
      ]}
      prevPage={{
        title: "Canvas Interaction",
        path: "/cookbook/canvas-interaction",
      }}
      nextPage={{
        title: "Marginal Graphics",
        path: "/cookbook/marginal-graphics",
      }}
    >
      <p>
        Forecasts are only useful when they communicate how confident you are in
        the prediction. This recipe shows how to visualize a time series with a
        forecasted segment and a confidence interval cone, stitching together
        observed data and projected values in a single XYFrame.
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
        <UncertaintyVisualization />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The visualization is built from two line objects: one for observed
        values and one for the forecast. Each forecast data point includes an{" "}
        <code>uncertainty</code> value that widens over time. The forecast line
        is styled with a dashed stroke to visually distinguish it from actuals:
      </p>
      <CodeBlock
        code={`lineStyle: d => {
  let baseStyles = {
    stroke: theme[1],
    strokeWidth: "3px"
  }
  if (!d.forecast) {
    return baseStyles
  } else if (d.forecast === "mean") {
    return { ...baseStyles, strokeDasharray: "5px" }
  } else {
    return { strokeWidth: "0px" }
  }
}`}
        language="jsx"
      />
      <p>
        The confidence interval is created using the{" "}
        <code>linebounds</code> summary type, which reads the{" "}
        <code>uncertainty</code> field from each data point to determine the
        width of the band:
      </p>
      <CodeBlock
        code={`summaryType: {
  type: "linebounds",
  boundingAccessor: d => d.uncertainty || 0
},
summaryDataAccessor: "data",
summaryClass: "uncertainty_cone"`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>linebounds</code> summary type creates ribbon-like
          confidence intervals from a bounding accessor on each data point.
        </li>
        <li>
          Multiple line objects with different styling (solid vs. dashed) can
          represent observed vs. forecasted segments.
        </li>
        <li>
          Using <code>defined</code> to filter undefined points prevents
          rendering artifacts at segment boundaries.
        </li>
        <li>
          Tooltips can inspect <code>parentLine</code> metadata to display
          context-aware information (e.g., "forecast" label).
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying frame for
          line and summary rendering
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — simpler line chart
          for time series
        </li>
        <li>
          <Link to="/charts/area-chart">AreaChart</Link> — filled area
          visualizations
        </li>
      </ul>
    </PageLayout>
  )
}
