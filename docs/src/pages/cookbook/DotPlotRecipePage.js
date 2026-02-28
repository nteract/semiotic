import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import DotPlot from "../../examples/DotPlot"

export default function DotPlotRecipePage() {
  return (
    <PageLayout
      title="Dot Plot"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Dot Plot", path: "/cookbook/dot-plot" },
      ]}
      prevPage={{ title: "Ridgeline Plot", path: "/cookbook/ridgeline-plot" }}
      nextPage={{ title: "Timeline", path: "/cookbook/timeline" }}
    >
      <p>
        Cleveland dot plots are ideal for comparing values across many
        categories, especially when showing change between two time points.
        Unlike grouped bar charts, they reduce visual clutter and draw attention
        to the magnitude and direction of change. This recipe uses OrdinalFrame
        with custom annotation rules to draw connecting lines between paired
        data points representing neonatal mortality rates in 1990 and 2013.
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
        <DotPlot />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Each row represents a region with two data points (1990 and 2013). The
        multi-accessor <code>rAccessor</code> plots both values per category.
        The <code>invertR</code> prop reverses the axis so higher mortality
        appears on the left, making improvement (leftward movement) visually
        clear:
      </p>
      <CodeBlock
        code={`rAccessor: ["y1990", "y2013"],
oAccessor: "region",
projection: "horizontal",
type: { type: "point", r: dotRadius },
rExtent: [0],
invertR: true`}
        language="jsx"
      />
      <p>
        The connecting lines between dots are drawn using custom{" "}
        <code>svgAnnotationRules</code>. Each data row is converted into a
        "range" annotation, and the annotation rule function accesses the
        y-scale and column positions to draw connecting lines between the two
        points:
      </p>
      <CodeBlock
        code={`svgAnnotationRules: ({ d, rScale, orFrameState }) => {
  if (d.type === "range") {
    const start = rScale(d.y1990) + dotRadius
    const end = rScale(d.y2013) - dotRadius
    const y =
      orFrameState.projectedColumns[d.region].middle
    return (
      <line
        x1={start} x2={end}
        y1={y} y2={y}
        style={{ stroke: "black", strokeWidth: 2 }}
      />
    )
  }
  return null
}`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Multi-accessor <code>rAccessor</code> with <code>type: "point"</code>{" "}
          plots multiple values per category as dots.
        </li>
        <li>
          <code>svgAnnotationRules</code> gives full access to the frame state
          (scales, column positions) for drawing custom connecting marks.
        </li>
        <li>
          <code>invertR</code> reverses the quantitative axis, useful when
          lower values should appear on the "better" side.
        </li>
        <li>
          Converting data into annotation objects is a powerful pattern for
          creating derived visual marks that depend on the computed layout.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          frame for dot plot rendering
        </li>
        <li>
          <Link to="/cookbook/slope-chart">Slope Chart</Link> — another
          before-and-after comparison using connectors
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — custom
          annotation rules and built-in annotation types
        </li>
      </ul>
    </PageLayout>
  )
}
