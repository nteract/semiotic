import React from "react"
import { Link } from "react-router-dom"

import CodeBlock from "../components/CodeBlock"
import PageLayout from "../components/PageLayout"

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const installSnippet = `npm install semiotic`

const firstChartSnippet = `import { LineChart } from "semiotic"

const data = [
  { month: "Jan", sales: 4200 },
  { month: "Feb", sales: 5100 },
  { month: "Mar", sales: 6800 },
  { month: "Apr", sales: 5900 },
  { month: "May", sales: 7200 },
  { month: "Jun", sales: 8100 },
]

function App() {
  return (
    <LineChart
      data={data}
      xAccessor="month"
      yAccessor="sales"
      xLabel="Month"
      yLabel="Sales ($)"
    />
  )
}`

const framePropsSnippet = `// Every Chart accepts a frameProps escape hatch
<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="sales"
  frameProps={{
    annotations: [
      { type: "x", month: "Mar", label: "Q1 End" }
    ],
    hoverAnnotation: true,
    size: [800, 400]
  }}
/>`

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  sectionIntro: {
    fontSize: "18px",
    lineHeight: "1.7",
    color: "var(--text-secondary)",
    marginBottom: "32px",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  card: {
    padding: "20px",
    background: "var(--surface-1)",
    border: "1px solid var(--surface-3)",
    borderRadius: "8px",
  },
  cardTitle: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  cardDescription: {
    margin: 0,
    fontSize: "14px",
    lineHeight: "1.6",
    color: "var(--text-secondary)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "32px",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "10px 16px",
    borderBottom: "2px solid var(--surface-3)",
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "10px 16px",
    borderBottom: "1px solid var(--surface-3)",
    color: "var(--text-primary)",
    lineHeight: "1.5",
  },
  nextStepsList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
  },
  nextStepLink: {
    display: "block",
    padding: "16px 20px",
    background: "var(--surface-1)",
    border: "1px solid var(--surface-3)",
    borderRadius: "8px",
    textDecoration: "none",
    color: "var(--text-primary)",
    fontWeight: 500,
    fontSize: "14px",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  nextStepDescription: {
    display: "block",
    marginTop: "4px",
    fontSize: "13px",
    fontWeight: 400,
    color: "var(--text-secondary)",
  },
  note: {
    padding: "12px 16px",
    background: "var(--surface-1)",
    borderLeft: "3px solid var(--accent)",
    borderRadius: "0 8px 8px 0",
    marginBottom: "24px",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "var(--text-secondary)",
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GettingStartedPage() {
  return (
    <PageLayout
      title="Getting Started"
      breadcrumbs={[{ label: "Getting Started", path: "/getting-started" }]}
      nextPage={{ title: "LineChart", path: "/charts/line-chart" }}
    >
      <p style={styles.sectionIntro}>
        Semiotic is a React data visualization library that provides both
        high-level chart components for common use cases and low-level frame
        primitives for full creative control. This guide will get you from
        zero to your first chart in minutes.
      </p>

      {/* --------------------------------------------------------------- */}
      {/* Installation */}
      {/* --------------------------------------------------------------- */}
      <h2 id="installation">Installation</h2>

      <p>Install Semiotic via npm:</p>

      <CodeBlock code={installSnippet} language="bash" />

      <div style={styles.note}>
        <strong>Peer dependencies:</strong> Semiotic requires{" "}
        <strong>React 18+</strong> and <strong>ReactDOM 18+</strong>. Make
        sure your project already has these installed.
      </div>

      <p>
        Semiotic ships with built-in <strong>TypeScript type definitions</strong>,
        so no additional <code>@types</code> packages are needed. You get full
        autocomplete and type checking out of the box.
      </p>

      {/* --------------------------------------------------------------- */}
      {/* Your First Chart */}
      {/* --------------------------------------------------------------- */}
      <h2 id="your-first-chart">Your First Chart</h2>

      <p>
        Here is a complete example that renders a line chart showing monthly
        sales data. Just import <code>LineChart</code>, pass your data, and
        specify which fields map to the x and y axes:
      </p>

      <CodeBlock code={firstChartSnippet} language="jsx" />

      <p>
        That is it -- Semiotic handles axes, scales, hover interactions, and
        responsive sizing with sensible defaults. When you need to customize,
        every aspect can be controlled through props.
      </p>

      {/* --------------------------------------------------------------- */}
      {/* Core Concepts */}
      {/* --------------------------------------------------------------- */}
      <h2 id="core-concepts">Core Concepts: Three Tiers</h2>

      <p>
        Semiotic is organized into three tiers of abstraction. Start at the
        top with Charts and drop down to Frames or Utilities when you need
        more control.
      </p>

      <div style={styles.cardGrid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span className="tier-badge charts">Charts</span>
          </h3>
          <p style={styles.cardDescription}>
            <strong>20 ready-to-use components</strong> like LineChart,
            BarChart, and Scatterplot. Simple props, instant results. This is
            the best starting point for most visualizations.
          </p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span className="tier-badge frames">Frames</span>
          </h3>
          <p style={styles.cardDescription}>
            <strong>StreamXYFrame, StreamOrdinalFrame, StreamNetworkFrame, and StreamXYFrame.</strong>{" "}
            Full creative control over every aspect of rendering, interaction,
            and layout. Use when Charts are not enough.
          </p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span className="tier-badge utilities">Utilities</span>
          </h3>
          <p style={styles.cardDescription}>
            Individual building blocks like <strong>Axis</strong>,{" "}
            <strong>Legend</strong>, and <strong>DividedLine</strong>. Combine
            them to build completely custom visualizations from scratch.
          </p>
        </div>
      </div>

      <h3 id="the-frameprops-escape-hatch">The frameProps Escape Hatch</h3>

      <p>
        Every Chart component is built on top of a Frame. When you need
        advanced functionality that a Chart does not directly expose, you
        can pass additional Frame-level props through the{" "}
        <code>frameProps</code> prop without having to rewrite your entire
        component:
      </p>

      <CodeBlock code={framePropsSnippet} language="jsx" />

      <p>
        This means you can start simple with a Chart and progressively
        customize it. If you eventually outgrow the Chart API entirely, you
        can graduate to using the underlying Frame directly.
      </p>

      {/* --------------------------------------------------------------- */}
      {/* Choosing the Right Component */}
      {/* --------------------------------------------------------------- */}
      <h2 id="choosing-the-right-component">Choosing the Right Component</h2>

      <p>
        Use this decision matrix to find the right component. Start with your
        data shape, then pick based on what you want to show:
      </p>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Data Shape</th>
            <th style={styles.th}>Goal</th>
            <th style={styles.th}>Component</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }} rowSpan={6}>Flat array<br /><code style={{ fontSize: "12px", fontWeight: 400 }}>[{"{x, y}"}]</code></td>
            <td style={styles.td}>Trends over time</td>
            <td style={styles.td}><Link to="/charts/line-chart">LineChart</Link>, <Link to="/charts/area-chart">AreaChart</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Part-to-whole over time</td>
            <td style={styles.td}><Link to="/charts/stacked-area-chart">StackedAreaChart</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Correlations</td>
            <td style={styles.td}><Link to="/charts/scatterplot">Scatterplot</Link>, <Link to="/charts/bubble-chart">BubbleChart</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Compare categories</td>
            <td style={styles.td}><Link to="/charts/bar-chart">BarChart</Link>, <Link to="/charts/dot-plot">DotPlot</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Part-to-whole (categorical)</td>
            <td style={styles.td}><Link to="/charts/stacked-bar-chart">StackedBarChart</Link>, <Link to="/charts/pie-chart">PieChart</Link>, <Link to="/charts/donut-chart">DonutChart</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Distributions</td>
            <td style={styles.td}><Link to="/charts/box-plot">BoxPlot</Link>, <Link to="/charts/swarm-plot">SwarmPlot</Link></td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }} rowSpan={3}>Hierarchical<br /><code style={{ fontSize: "12px", fontWeight: 400 }}>{"{ children: [...] }"}</code></td>
            <td style={styles.td}>Tree/org structure</td>
            <td style={styles.td}><Link to="/charts/tree-diagram">TreeDiagram</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Proportional sizing</td>
            <td style={styles.td}><Link to="/charts/treemap">Treemap</Link>, <Link to="/charts/circle-pack">CirclePack</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Matrix / density</td>
            <td style={styles.td}><Link to="/charts/heatmap">Heatmap</Link></td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }} rowSpan={3}>Nodes + edges<br /><code style={{ fontSize: "12px", fontWeight: 400 }}>{"[{id}], [{source, target}]"}</code></td>
            <td style={styles.td}>Relationships</td>
            <td style={styles.td}><Link to="/charts/force-directed-graph">ForceDirectedGraph</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Flows and budgets</td>
            <td style={styles.td}><Link to="/charts/sankey-diagram">SankeyDiagram</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Inter-group connections</td>
            <td style={styles.td}><Link to="/charts/chord-diagram">ChordDiagram</Link></td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }} rowSpan={2}>Streaming<br /><code style={{ fontSize: "12px", fontWeight: 400 }}>ref.push({"{ time, value }"})</code></td>
            <td style={styles.td}>Live trends</td>
            <td style={styles.td}><Link to="/charts/realtime-line-chart">RealtimeLineChart</Link></td>
          </tr>
          <tr>
            <td style={styles.td}>Live aggregates</td>
            <td style={styles.td}><Link to="/charts/realtime-bar-chart">RealtimeHistogram</Link>, <Link to="/charts/realtime-swarm-chart">RealtimeSwarmChart</Link></td>
          </tr>
        </tbody>
      </table>

      <h3 id="chart-vs-frame">Chart vs Frame: When to Graduate</h3>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}></th>
            <th style={{ ...styles.th, color: "var(--tier-charts, #22c55e)" }}>Chart</th>
            <th style={{ ...styles.th, color: "var(--tier-frames, #a855f7)" }}>Frame</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }}>Lines of code</td>
            <td style={styles.td}>5-15</td>
            <td style={styles.td}>20-80+</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }}>Custom marks</td>
            <td style={styles.td}>No</td>
            <td style={styles.td}>Yes</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }}>Annotations</td>
            <td style={styles.td}>Via <code>frameProps</code></td>
            <td style={styles.td}>Direct prop</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }}>Custom tooltips</td>
            <td style={styles.td}>Yes</td>
            <td style={styles.td}>Yes</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }}>Custom rendering</td>
            <td style={styles.td}>No</td>
            <td style={styles.td}>Full SVG/Canvas control</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 600 }}>Best for</td>
            <td style={styles.td}>Standard charts, dashboards, quick prototypes</td>
            <td style={styles.td}>Bespoke visualizations, novel encodings</td>
          </tr>
        </tbody>
      </table>

      <div style={styles.note}>
        <strong>Tip:</strong> Start with a Chart. Use <code>frameProps</code> for
        one-off customizations. Only graduate to a Frame when you need full
        control over marks, layout, or rendering.
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Next Steps */}
      {/* --------------------------------------------------------------- */}
      <h2 id="next-steps">Next Steps</h2>

      <p>
        Now that you have the basics, dive into the component documentation:
      </p>

      <ul style={styles.nextStepsList}>
        <li>
          <Link to="/charts/line-chart" style={styles.nextStepLink}>
            LineChart
            <span style={styles.nextStepDescription}>
              Trends, time series, and multi-line comparisons
            </span>
          </Link>
        </li>
        <li>
          <Link to="/charts/bar-chart" style={styles.nextStepLink}>
            BarChart
            <span style={styles.nextStepDescription}>
              Categorical comparisons, grouped and stacked bars
            </span>
          </Link>
        </li>
        <li>
          <Link to="/frames/xy-frame" style={styles.nextStepLink}>
            StreamXYFrame
            <span style={styles.nextStepDescription}>
              Full control over XY-based visualizations
            </span>
          </Link>
        </li>
      </ul>
    </PageLayout>
  )
}
