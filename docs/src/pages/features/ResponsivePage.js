import React from "react"
import { XYFrame, OrdinalFrame, ResponsiveXYFrame, ResponsiveOrdinalFrame } from "semiotic"
import { LineChart, BarChart } from "semiotic"

import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  { month: 4, revenue: 22000 },
  { month: 5, revenue: 19000 },
  { month: 6, revenue: 27000 },
  { month: 7, revenue: 24000 },
  { month: 8, revenue: 31000 },
  { month: 9, revenue: 28000 },
  { month: 10, revenue: 35000 },
  { month: 11, revenue: 32000 },
  { month: 12, revenue: 41000 },
]

const barData = [
  { category: "Q1", revenue: 24000 },
  { category: "Q2", revenue: 31000 },
  { category: "Q3", revenue: 28000 },
  { category: "Q4", revenue: 36000 },
]

const frameLineData = [
  {
    label: "Revenue",
    coordinates: lineData.map((d) => ({ step: d.month, value: d.revenue })),
  },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const responsiveProps = [
  { name: "responsiveWidth", type: "boolean", required: false, default: "false", description: "When true, the frame width (size[0]) automatically matches the container width." },
  { name: "responsiveHeight", type: "boolean", required: false, default: "false", description: "When true, the frame height (size[1]) automatically matches the container height." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResponsivePage() {
  return (
    <PageLayout
      title="Responsive"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Responsive", path: "/features/responsive" },
      ]}
      prevPage={{ title: "Interaction", path: "/features/interaction" }}
      nextPage={{ title: "Accessibility", path: "/features/accessibility" }}
    >
      <p>
        Semiotic provides responsive wrapper components that automatically
        resize visualizations to fit their container. Instead of hardcoding
        pixel dimensions, you can let the chart fill available space —
        essential for dashboards, articles, and any layout where the
        container width is not known ahead of time.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components like <code>LineChart</code> and{" "}
        <code>BarChart</code> support responsive behavior through the{" "}
        <code>frameProps</code> escape hatch. Wrap the underlying frame
        configuration with responsive settings, or use the responsive Frame
        components directly:
      </p>

      <CodeBlock
        code={`import { LineChart } from "semiotic"

// Option 1: Use frameProps to pass responsive settings
<div style={{ width: "100%" }}>
  <LineChart
    data={salesData}
    xAccessor="month"
    yAccessor="revenue"
    xLabel="Month"
    yLabel="Revenue"
    size={[800, 400]}
    frameProps={{
      responsiveWidth: true
    }}
  />
</div>`}
        language="jsx"
      />

      <p>
        Alternatively, use the <code>ResponsiveXYFrame</code> directly for
        full control:
      </p>

      <CodeBlock
        code={`import { ResponsiveXYFrame } from "semiotic"

<div style={{ width: "100%", height: 400 }}>
  <ResponsiveXYFrame
    lines={[{ coordinates: salesData }]}
    xAccessor="month"
    yAccessor="revenue"
    lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
    axes={[
      { orient: "left", label: "Revenue" },
      { orient: "bottom", label: "Month" }
    ]}
    responsiveWidth={true}
    size={[800, 400]}
  />
</div>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="responsive-xy">ResponsiveXYFrame</h3>
      <p>
        <code>ResponsiveXYFrame</code> wraps <code>XYFrame</code> and
        observes its container's dimensions. Set{" "}
        <code>responsiveWidth</code> and/or <code>responsiveHeight</code> to{" "}
        <code>true</code>. The <code>size</code> prop still provides the
        initial dimensions and aspect ratio.
      </p>

      <LiveExample
        frameProps={{
          lines: frameLineData,
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          responsiveWidth: true,
          margin: { top: 20, bottom: 60, left: 70, right: 20 },
          axes: [
            { orient: "left", label: "Revenue ($)" },
            { orient: "bottom", label: "Month" },
          ],
        }}
        type={ResponsiveXYFrame}
        startHidden={false}
        overrideProps={{
          lines: `[{
  label: "Revenue",
  coordinates: [
    { step: 1, value: 12000 },
    { step: 2, value: 18000 },
    // ...more coordinates
  ]
}]`,
        }}
        hiddenProps={{}}
        title="Responsive Width (resize your browser to see it adapt)"
      />

      <h3 id="responsive-ordinal">ResponsiveOrdinalFrame</h3>
      <p>
        <code>ResponsiveOrdinalFrame</code> works the same way for bar
        charts, swarm plots, and other ordinal visualizations:
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          oAccessor: "category",
          rAccessor: "revenue",
          type: "bar",
          style: { fill: "#6366f1", stroke: "white" },
          oLabel: true,
          responsiveWidth: true,
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
          axes: [
            {
              orient: "left",
              label: "Revenue ($)",
              tickFormat: (d) => `$${(d / 1000).toFixed(0)}k`,
            },
          ],
        }}
        type={ResponsiveOrdinalFrame}
        overrideProps={{
          data: `[
  { category: "Q1", revenue: 24000 },
  { category: "Q2", revenue: 31000 },
  { category: "Q3", revenue: 28000 },
  { category: "Q4", revenue: 36000 }
]`,
          axes: `[{
  orient: "left",
  label: "Revenue ($)",
  tickFormat: d => \`$\${(d / 1000).toFixed(0)}k\`
}]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="responsive-height">Responsive Height</h3>
      <p>
        Set <code>responsiveHeight</code> to <code>true</code> to make the
        chart height match its container. This requires the container to have
        an explicit height set (via CSS or inline styles):
      </p>

      <CodeBlock
        code={`// Container must have explicit height for responsiveHeight to work
<div style={{ width: "100%", height: "50vh" }}>
  <ResponsiveXYFrame
    responsiveWidth={true}
    responsiveHeight={true}
    size={[800, 400]}
    lines={data}
    xAccessor="step"
    yAccessor="value"
  />
</div>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <h3 id="responsive-components">Available Responsive Components</h3>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid var(--surface-3)" }}>Responsive Component</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid var(--surface-3)" }}>Wraps</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["ResponsiveXYFrame", "XYFrame"],
            ["ResponsiveOrdinalFrame", "OrdinalFrame"],
            ["ResponsiveNetworkFrame", "NetworkFrame"],
            ["ResponsiveMinimapXYFrame", "MinimapXYFrame"],
          ].map(([responsive, wraps], i) => (
            <tr key={responsive} style={{ background: i % 2 ? "var(--surface-1)" : "transparent" }}>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--surface-3)", fontFamily: "var(--font-code)", fontSize: "0.9em" }}>{responsive}</td>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--surface-3)", fontFamily: "var(--font-code)", fontSize: "0.9em" }}>{wraps}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 id="responsive-props">Responsive Props</h3>

      <PropTable componentName="ResponsiveFrame" props={responsiveProps} />

      <h3 id="usage-patterns">Usage Patterns</h3>

      <CodeBlock
        code={`import {
  ResponsiveXYFrame,
  ResponsiveOrdinalFrame,
  ResponsiveNetworkFrame,
  ResponsiveMinimapXYFrame
} from "semiotic"

// Width-only responsive (most common)
<ResponsiveXYFrame
  responsiveWidth={true}
  size={[800, 400]}  // Height stays fixed at 400
  {...otherProps}
/>

// Both width and height responsive
<div style={{ width: "100%", height: "60vh" }}>
  <ResponsiveXYFrame
    responsiveWidth={true}
    responsiveHeight={true}
    size={[800, 400]}  // Used as initial/fallback dimensions
    {...otherProps}
  />
</div>

// Height-only responsive (rare)
<div style={{ width: 600, height: "100%" }}>
  <ResponsiveOrdinalFrame
    responsiveHeight={true}
    size={[600, 400]}  // Width stays fixed at 600
    {...otherProps}
  />
</div>`}
        language="jsx"
      />

      <h3 id="best-practices">Best Practices</h3>

      <ul>
        <li>
          <strong>Always provide a <code>size</code> prop</strong> — it serves
          as the initial dimension and fallback before the container is
          measured.
        </li>
        <li>
          <strong>Set explicit container height for <code>responsiveHeight</code></strong>{" "}
          — the container must have a defined height (via CSS, vh units, or
          flex/grid layout) for height-based responsiveness to work.
        </li>
        <li>
          <strong>Margins remain fixed</strong> — only the chart drawing area
          scales. Margins stay at their configured pixel values, ensuring
          axis labels and padding remain readable.
        </li>
        <li>
          <strong>Debouncing</strong> — Responsive components internally
          debounce resize events to avoid excessive re-renders during window
          resizing.
        </li>
        <li>
          <strong>Combine with CSS Grid or Flexbox</strong> — for dashboard
          layouts, place responsive frames inside grid/flex containers that
          manage the available space.
        </li>
      </ul>

      <CodeBlock
        code={`/* Dashboard layout with responsive charts */
.dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-card {
  min-height: 300px;
}

/* Each ResponsiveXYFrame fills its card */
<div className="dashboard">
  <div className="chart-card">
    <ResponsiveXYFrame responsiveWidth={true} size={[400, 300]} ... />
  </div>
  <div className="chart-card">
    <ResponsiveOrdinalFrame responsiveWidth={true} size={[400, 300]} ... />
  </div>
</div>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the base frame that
          ResponsiveXYFrame wraps
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the base
          frame that ResponsiveOrdinalFrame wraps
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — the base
          frame that ResponsiveNetworkFrame wraps
        </li>
        <li>
          <Link to="/features/axes">Axes</Link> — axis configuration remains
          fixed while the chart area scales
        </li>
        <li>
          <Link to="/features/accessibility">Accessibility</Link> — ensuring
          responsive charts remain accessible
        </li>
      </ul>
    </PageLayout>
  )
}
