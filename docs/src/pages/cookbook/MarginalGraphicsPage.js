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
      nextPage={{ title: "Bar to Parallel Coordinates", path: "/cookbook/bar-to-parallel-coordinates" }}
    >
      <p>
        Scatter plots reveal relationships between two variables, but they hide
        the univariate distribution along each axis. This recipe adds marginal
        distribution graphics -- a ridgeline plot along the top and a histogram
        along the right -- to provide density context alongside each dimension.
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
        Marginal graphics are configured using the <code>marginalGraphics</code>{" "}
        prop on <code>StreamXYFrame</code>, <code>Scatterplot</code>, or{" "}
        <code>BubbleChart</code>. Each side (<code>top</code>,{" "}
        <code>bottom</code>, <code>left</code>, <code>right</code>) can host a
        different distribution type:
      </p>
      <CodeBlock
        code={`<StreamXYFrame
  chartType="scatter"
  data={data}
  xAccessor="distance"
  yAccessor="exit_velocity"
  marginalGraphics={{
    top: { type: "ridgeline", fill: "#9fd0cb", fillOpacity: 0.5 },
    right: { type: "histogram", fill: "#9fd0cb", fillOpacity: 0.5 }
  }}
  margin={{ left: 70, right: 60, top: 60, bottom: 60 }}
/>`}
        language="jsx"
      />
      <p>
        You can also use string shorthand for defaults:{" "}
        <code>{`marginalGraphics={{ top: "histogram", left: "boxplot" }}`}</code>
      </p>
      <p>
        Margins are auto-expanded to at least 60px on any side with a marginal,
        so there is enough room for the distribution visualization.
      </p>

      <h2 id="marginal-types">Available Marginal Types</h2>
      <ul>
        <li>
          <strong>histogram</strong> — Binned bars showing frequency distribution
        </li>
        <li>
          <strong>ridgeline</strong> — One-sided density area fill
        </li>
        <li>
          <strong>violin</strong> — Symmetric density path centered on the
          margin midline
        </li>
        <li>
          <strong>boxplot</strong> — Box-and-whisker showing quartiles and whiskers
        </li>
      </ul>

      <h2 id="config-options">Config Options</h2>
      <CodeBlock
        code={`// Full config object
{
  type: "histogram" | "violin" | "ridgeline" | "boxplot",
  bins: 20,          // number of bins (histogram/violin/ridgeline)
  fill: "#4e79a7",   // fill color
  fillOpacity: 0.5,  // fill opacity
  stroke: "none",    // stroke color
  strokeWidth: 1     // stroke width
}`}
        language="js"
      />

      <h2 id="hoc-usage">Using with HOC Charts</h2>
      <p>
        The <code>marginalGraphics</code> prop is available directly on{" "}
        <code>Scatterplot</code> and <code>BubbleChart</code>:
      </p>
      <CodeBlock
        code={`<Scatterplot
  data={iris}
  xAccessor="sepalLength"
  yAccessor="petalLength"
  colorBy="species"
  marginalGraphics={{ top: "histogram", right: "violin" }}
/>`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>marginalGraphics</code> prop on StreamXYFrame, Scatterplot,
          and BubbleChart creates distribution visualizations in the chart margins.
        </li>
        <li>
          Four types are supported: histogram, ridgeline, violin, and boxplot.
        </li>
        <li>
          Each side (top, bottom, left, right) can use a different type
          independently.
        </li>
        <li>
          Margins auto-expand to 60px minimum to ensure enough room for the
          visualization.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — point-based XY
          visualization
        </li>
        <li>
          <Link to="/charts/bubble-chart">Bubble Chart</Link> — scatter with
          size encoding
        </li>
        <li>
          <Link to="/cookbook/ridgeline-plot">Ridgeline Plot</Link> — full
          ridgeline chart using StreamOrdinalFrame
        </li>
      </ul>
    </PageLayout>
  )
}
