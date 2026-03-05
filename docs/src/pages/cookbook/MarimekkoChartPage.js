import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import MarimekkoChart from "../../examples/MarimekkoChart"

export default function MarimekkoChartPage() {
  return (
    <PageLayout
      title="Marimekko Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Marimekko Chart", path: "/cookbook/marimekko-chart" },
      ]}
      prevPage={{ title: "Slope Chart", path: "/cookbook/slope-chart" }}
      nextPage={{ title: "Swarm Plot", path: "/cookbook/swarm-plot" }}
    >
      <p>
        Standard stacked bar charts encode only one quantitative dimension in
        the column width. A Marimekko (or mosaic) chart encodes a second
        dimension by varying column widths, so both the height proportion and
        the column width carry meaning. This recipe uses StreamOrdinalFrame's{" "}
        <code>dynamicColumnWidth</code> to create a variable-width stacked bar
        chart showing market segments across regions.
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
        <MarimekkoChart />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The <code>dynamicColumnWidth</code> prop tells StreamOrdinalFrame to size
        each column proportionally to a data field. Here, the raw{" "}
        <code>value</code> (total sales) determines column width, while{" "}
        <code>pct</code> (percentage of sales by segment) determines bar
        height. Two axes communicate both dimensions:
      </p>
      <CodeBlock
        code={`const frameProps = {
  rAccessor: "pct",
  oAccessor: "market",
  dynamicColumnWidth: "value",
  chartType: "bar",
  showAxes: true,
  rFormat: d => Math.floor(d * 100) + "%",
  oLabel: true,
  pieceStyle: d => ({
    fill: colors[d.segment],
    stroke: "white",
    strokeWidth: 1
  })
}`}
        language="jsx"
      />
      <p>
        The left axis shows the percentage breakdown within each market.
        The <code>oLabel</code> prop renders column labels at the correct
        variable-width positions. Note that the category axis ticks themselves
        use the uniform band scale and may not align perfectly with dynamic
        column widths.
      </p>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <code>dynamicColumnWidth</code> sizes ordinal columns proportionally
          to a data value, enabling Marimekko and mosaic charts.
        </li>
        <li>
          Combining <code>dynamicColumnWidth</code> with stacked bars
          encodes two quantitative dimensions simultaneously.
        </li>
        <li>
          <strong>Known limitation:</strong> The category axis ticks
          use StreamOrdinalFrame's uniform band scale, so they appear at
          equal-width positions rather than at the actual variable-width column
          centers. The <code>oLabel</code> prop correctly positions per-column
          labels using computed column positions. The value (rAccessor) axis
          is unaffected.
        </li>
        <li>
          Rotated <code>oLabel</code> text prevents overlap when column widths
          vary significantly.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — the underlying
          frame with dynamicColumnWidth support
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — standard bar chart
          without variable widths
        </li>
        <li>
          <Link to="/cookbook/waterfall-chart">Waterfall Chart</Link> — another
          custom ordinal layout
        </li>
      </ul>
    </PageLayout>
  )
}
