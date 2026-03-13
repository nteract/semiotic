import React, { useState } from "react"
import { LineChart, BarChart, ChartContainer } from "semiotic"

import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChartStatesPage() {
  const [isLoading, setIsLoading] = useState(false)

  const barData = [
    { category: "Q1", value: 120 },
    { category: "Q2", value: 180 },
    { category: "Q3", value: 95 },
    { category: "Q4", value: 210 },
  ]

  return (
    <PageLayout
      title="Chart States"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Chart States", path: "/features/chart-states" },
      ]}
      prevPage={{
        title: "Chart Container",
        path: "/features/chart-container",
      }}
      nextPage={{
        title: "Chart Modes",
        path: "/features/chart-modes",
      }}
    >
      <p>
        Every Semiotic chart handles empty data and loading states out of the
        box. These states work at two levels: directly on individual chart
        components, and at the{" "}
        <Link to="/features/chart-container">ChartContainer</Link> level for
        dashboard cards.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Empty State */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="empty-state">Empty State</h2>

      <p>
        When <code>data</code> is an empty array, every chart automatically
        displays a centered "No data available" message. Customize this with
        the <code>emptyContent</code> prop, or suppress it entirely with{" "}
        <code>emptyContent=&#123;false&#125;</code>.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h4 style={{ marginTop: 0 }}>Default</h4>
          <LineChart data={[]} xAccessor="x" yAccessor="y" width={250} height={180} />
        </div>
        <div>
          <h4 style={{ marginTop: 0 }}>Custom Content</h4>
          <BarChart
            data={[]}
            categoryAccessor="category"
            valueAccessor="value"
            width={250}
            height={180}
            emptyContent={
              <div style={{ textAlign: "center", color: "#888", padding: 16 }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>No sales data</div>
                <div style={{ fontSize: 12 }}>Try adjusting the date range</div>
              </div>
            }
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0 }}>Suppressed</h4>
          <LineChart data={[]} width={250} height={180} emptyContent={false} />
        </div>
      </div>

      <CodeBlock
        code={`// Default empty state — "No data available"
<LineChart data={[]} />

// Custom empty content
<BarChart
  data={[]}
  categoryAccessor="category"
  valueAccessor="value"
  emptyContent={<div>No sales data for this period</div>}
/>

// Suppress empty state entirely
<LineChart data={[]} emptyContent={false} />`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Loading State */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="loading-state">Loading State</h2>

      <p>
        Set <code>loading=&#123;true&#125;</code> on any chart to show a pulsing
        skeleton placeholder. This works at both the chart level and the{" "}
        <Link to="/features/chart-container">ChartContainer</Link> level.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setIsLoading(!isLoading)}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: "1px solid var(--semiotic-border, #ccc)",
            background: isLoading ? "var(--semiotic-border, #e0e0e0)" : "transparent",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--semiotic-text, #333)",
          }}
        >
          {isLoading ? "Stop Loading" : "Simulate Loading"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: "1 1 290px", minWidth: 290 }}>
          <ChartContainer title="Chart-Level Loading" height={200}>
            <LineChart data={[]} loading={isLoading} width={290} height={200} />
          </ChartContainer>
        </div>
        <div style={{ flex: "1 1 290px", minWidth: 290 }}>
          <ChartContainer title="Container-Level Loading" loading={isLoading} height={200}>
            <BarChart
              data={barData}
              categoryAccessor="category"
              valueAccessor="value"
              width={290}
              height={200}
            />
          </ChartContainer>
        </div>
      </div>

      <CodeBlock
        code={`// Chart-level loading — skeleton rendered by the chart itself
<LineChart data={null} loading={isLoading} />

// Container-level loading — skeleton replaces entire children
<ChartContainer title="CPU Load" loading={isLoading}>
  <LineChart data={data} xAccessor="x" yAccessor="y" />
</ChartContainer>

// Choose based on your data-fetching pattern:
// • Chart-level: each chart loads independently
// • Container-level: single fetch for the whole dashboard card`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Error State */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="error-state">Error State</h2>

      <p>
        <Link to="/features/chart-container">ChartContainer</Link> provides
        error display and error boundary support. Set <code>error</code> to show
        a message, or <code>errorBoundary</code> to catch render crashes.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: "1 1 290px", minWidth: 290 }}>
          <ChartContainer title="Error Message" error="Failed to fetch data from API." height={200}>
            <div />
          </ChartContainer>
        </div>
        <div style={{ flex: "1 1 290px", minWidth: 290 }}>
          <ChartContainer title="Error Boundary" errorBoundary height={200}>
            <BarChart
              data={barData}
              categoryAccessor="category"
              valueAccessor="value"
              width={290}
              height={200}
            />
          </ChartContainer>
        </div>
      </div>

      <CodeBlock
        code={`// Error message
<ChartContainer title="CPU Load" error="Failed to fetch data from API.">
  <LineChart data={data} xAccessor="x" yAccessor="y" />
</ChartContainer>

// Error boundary — catches render crashes
<ChartContainer title="CPU Load" errorBoundary>
  <LineChart data={data} xAccessor="x" yAccessor="y" />
</ChartContainer>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/chart-container">Chart Container</Link> — production
          shell with title, toolbar, export, and status
        </li>
        <li>
          <Link to="/features/chart-modes">Chart Modes</Link> — primary, context,
          and sparkline rendering modes
        </li>
      </ul>
    </PageLayout>
  )
}
