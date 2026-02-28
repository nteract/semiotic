import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import WaterfallChart from "../../examples/WaterfallChart"

export default function WaterfallChartPage() {
  return (
    <PageLayout
      title="Waterfall Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Waterfall Chart", path: "/cookbook/waterfall-chart" },
      ]}
      prevPage={{
        title: "Bar to Parallel",
        path: "/cookbook/bar-to-parallel",
      }}
      nextPage={{ title: "Slope Chart", path: "/cookbook/slope-chart" }}
    >
      <p>
        Waterfall (or bridge) charts show how individual positive and negative
        values contribute to a running total -- common in financial reporting
        where you need to decompose revenue into its components. This recipe
        demonstrates how to build one using OrdinalFrame's custom{" "}
        <code>type</code> function, which gives you full control over piece
        rendering.
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
        <WaterfallChart />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Instead of passing a string like <code>"bar"</code> to the{" "}
        <code>type</code> prop, you pass a custom function. This function
        receives the column data, the r-scale, and the adjusted size, giving
        you complete control over positioning. The waterfall logic tracks a
        running offset so each bar starts where the previous one ended:
      </p>
      <CodeBlock
        code={`function waterfall({ data, rScale, adjustedSize }) {
  const renderedPieces = []
  let currentY = 0
  let currentValue = 0
  const zeroValue = rScale(0)

  keys.forEach(key => {
    const thisPiece = data[key].pieceData[0]
    let value = thisPiece.value
    const name = thisPiece.data.name

    if (name === "Total") {
      value = -currentValue
    } else {
      currentValue += value
    }

    const { x, width } = data[name]
    const height = rScale(value) - zeroValue

    let y = adjustedSize[1] - height
    if (height < 0) y = adjustedSize[1]
    y += currentY

    renderedPieces.push(
      <g>
        <rect
          height={Math.abs(height)}
          x={x} y={y} width={width}
          style={{ fill: fillRule(thisPiece) }}
        />
        {/* connector line + value label */}
      </g>
    )
    currentY -= height
  })

  return renderedPieces
}`}
        language="jsx"
      />
      <p>
        Colors differentiate positive values (green), negative values (red),
        and the total (purple). Dashed connector lines between bars help the
        reader follow the running total.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>type</code> prop on OrdinalFrame can accept a custom
          rendering function for chart types not built into the library.
        </li>
        <li>
          Custom type functions receive <code>data</code>,{" "}
          <code>rScale</code>, and <code>adjustedSize</code>, giving full
          access to the layout engine output.
        </li>
        <li>
          For interactivity with custom types, return objects with{" "}
          <code>renderElement</code>, <code>xy</code>, <code>o</code>, and{" "}
          <code>piece</code> instead of raw SVG elements.
        </li>
        <li>
          Manually setting <code>rExtent</code> is necessary when the custom
          layout logic handles its own stacking.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the frame with
          custom type support
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — standard bar chart for
          simpler breakdowns
        </li>
        <li>
          <Link to="/cookbook/bar-line-chart">Bar + Line Chart</Link> — another
          multi-metric OrdinalFrame recipe
        </li>
      </ul>
    </PageLayout>
  )
}
