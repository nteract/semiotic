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
        the column width carry meaning. This recipe uses OrdinalFrame's{" "}
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
        The <code>dynamicColumnWidth</code> prop tells OrdinalFrame to size
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
  type: "bar",
  axes: [
    {
      orient: "left",
      tickFormat: d => Math.floor(d * 100) + "%"
    },
    {
      orient: "top",
      tickFormat: d => d / 1000 + "k"
    }
  ],
  style: d => ({
    fill: colors[d.segment],
    stroke: "white",
    strokeWidth: 1
  })
}`}
        language="jsx"
      />
      <p>
        The top axis shows the absolute value scale (in thousands), making it
        clear that wider columns represent larger markets. The left axis shows
        the percentage breakdown within each market.
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
          A top axis with a value-based tick format helps readers interpret the
          variable column widths.
        </li>
        <li>
          Rotated <code>oLabel</code> text prevents overlap when column widths
          vary significantly.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
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
