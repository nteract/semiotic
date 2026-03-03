import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import BarToParallel from "../../examples/BarToParallel"

export default function BarToParallelPage() {
  return (
    <PageLayout
      title="Funnel Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Funnel Chart", path: "/cookbook/bar-to-parallel" },
      ]}
      prevPage={{
        title: "Bar + Line Chart",
        path: "/cookbook/bar-line-chart",
      }}
      nextPage={{
        title: "Waterfall Chart",
        path: "/cookbook/waterfall-chart",
      }}
    >
      <p>
        Funnel charts show how a population moves through sequential stages.
        Each bar represents a step in the process, with height proportional to
        the count at that stage. Stacking by a grouping dimension (e.g. country
        or region) reveals which segments drop off at each step.
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
        <BarToParallel />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Use <code>chartType="bar"</code> with <code>stackBy</code> to stack
        segments within each funnel step:
      </p>
      <CodeBlock
        code={`<StreamOrdinalFrame
  chartType="bar"
  data={funnelData}
  oAccessor="step"
  rAccessor="people"
  stackBy="country"
  pieceStyle={d => ({
    fill: stepColors[d.step],
    stroke: stepColors[d.step]
  })}
  showAxes
/>`}
        language="jsx"
      />

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — simple bar chart
        </li>
        <li>
          <Link to="/charts/stacked-bar-chart">StackedBarChart</Link> — stacked
          bar chart
        </li>
        <li>
          <Link to="/cookbook/slope-chart">Slope Chart</Link> — connected ordinal
          visualization
        </li>
      </ul>
    </PageLayout>
  )
}
