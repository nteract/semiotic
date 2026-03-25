import React, { useRef, useEffect, useState } from "react"
import {
  LineChart, BarChart, Scatterplot, DonutChart, Treemap,
  LinkedCharts, CategoryColorProvider,
} from "semiotic"
import { RealtimeLineChart, RealtimeTemporalHistogram } from "semiotic"

import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const revenueByQuarter = [
  { quarter: "Q1", revenue: 420 },
  { quarter: "Q2", revenue: 580 },
  { quarter: "Q3", revenue: 390 },
  { quarter: "Q4", revenue: 710 },
]

const salesTrend = [
  {
    id: "Sales",
    coordinates: [
      { month: 1, value: 42 },
      { month: 2, value: 55 },
      { month: 3, value: 48 },
      { month: 4, value: 63 },
      { month: 5, value: 59 },
      { month: 6, value: 72 },
      { month: 7, value: 68 },
      { month: 8, value: 81 },
      { month: 9, value: 76 },
      { month: 10, value: 89 },
      { month: 11, value: 85 },
      { month: 12, value: 94 },
    ],
  },
]

const customerSegments = [
  { segment: "Enterprise", value: 45 },
  { segment: "Mid-Market", value: 30 },
  { segment: "SMB", value: 20 },
  { segment: "Self-Serve", value: 5 },
]

const scatterData = [
  { spend: 12, roi: 3.2, channel: "Email", size: 450 },
  { spend: 28, roi: 2.8, channel: "Search", size: 1200 },
  { spend: 45, roi: 4.1, channel: "Social", size: 800 },
  { spend: 18, roi: 1.9, channel: "Display", size: 350 },
  { spend: 55, roi: 3.5, channel: "Search", size: 2100 },
  { spend: 32, roi: 4.8, channel: "Email", size: 900 },
  { spend: 8, roi: 1.2, channel: "Display", size: 200 },
  { spend: 40, roi: 3.9, channel: "Social", size: 1500 },
  { spend: 22, roi: 2.5, channel: "Email", size: 600 },
  { spend: 60, roi: 3.0, channel: "Search", size: 2500 },
]

// KPI data for the dashboard demo
const kpiData = [
  {
    label: "Revenue",
    value: "$2.1M",
    change: "+12%",
    positive: true,
    trend: [
      { x: 0, y: 42 }, { x: 1, y: 55 }, { x: 2, y: 48 }, { x: 3, y: 63 },
      { x: 4, y: 59 }, { x: 5, y: 72 }, { x: 6, y: 68 }, { x: 7, y: 81 },
    ],
  },
  {
    label: "Users",
    value: "14.2K",
    change: "+8%",
    positive: true,
    trend: [
      { x: 0, y: 10 }, { x: 1, y: 11 }, { x: 2, y: 10.5 }, { x: 3, y: 12 },
      { x: 4, y: 11.8 }, { x: 5, y: 13 }, { x: 6, y: 12.5 }, { x: 7, y: 14.2 },
    ],
  },
  {
    label: "Churn",
    value: "3.1%",
    change: "-0.4%",
    positive: true,
    trend: [
      { x: 0, y: 5 }, { x: 1, y: 4.5 }, { x: 2, y: 4.8 }, { x: 3, y: 4.2 },
      { x: 4, y: 3.9 }, { x: 5, y: 3.5 }, { x: 6, y: 3.3 }, { x: 7, y: 3.1 },
    ],
  },
  {
    label: "ARPU",
    value: "$148",
    change: "-2%",
    positive: false,
    trend: [
      { x: 0, y: 155 }, { x: 1, y: 152 }, { x: 2, y: 154 }, { x: 3, y: 150 },
      { x: 4, y: 151 }, { x: 5, y: 149 }, { x: 6, y: 148 }, { x: 7, y: 148 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Streaming forecast sparkline
// ---------------------------------------------------------------------------

const FORECAST_WINDOW = 50
const FORECAST_LEN = 12

function useForecastSparkData() {
  const counterRef = useRef(FORECAST_WINDOW)
  const [data, setData] = useState(() => {
    const d = []
    for (let i = 0; i < FORECAST_WINDOW; i++) {
      const base = 60 + Math.sin(i * 0.12) * 20
      const isAnomaly = i === 31
      d.push({
        x: i,
        y: isAnomaly ? base + 40 : base + (Math.random() - 0.5) * 8,
        isTraining: i < FORECAST_WINDOW - FORECAST_LEN,
        isForecast: i >= FORECAST_WINDOW - FORECAST_LEN,
        isAnomaly,
        upper: base + 14,
        lower: base - 14,
      })
    }
    return d
  })

  useEffect(() => {
    const id = setInterval(() => {
      const c = counterRef.current++
      setData(prev => {
        const next = prev.slice(1)
        // Only the point crossing the boundary needs a flag update
        const boundary = FORECAST_WINDOW - FORECAST_LEN - 1
        if (next[boundary] && next[boundary].isForecast) {
          next[boundary] = { ...next[boundary], isTraining: true, isForecast: false }
        }
        const base = 60 + Math.sin(c * 0.12) * 20
        const isAnomaly = c % 41 === 0
        next.push({
          x: c,
          y: isAnomaly ? base + 40 : base + (Math.random() - 0.5) * 8,
          isTraining: false,
          isForecast: true,
          isAnomaly,
          upper: base + 14,
          lower: base - 14,
        })
        return next
      })
    }, 150)
    return () => clearInterval(id)
  }, [])

  return data
}

// ---------------------------------------------------------------------------
// Streaming spark chart
// ---------------------------------------------------------------------------

function StreamingSparkRow() {
  const forecastData = useForecastSparkData()
  const cpuRef = useRef()
  const memRef = useRef()
  const netRef = useRef()
  const idxRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      const i = idxRef.current++
      const t = Date.now()
      cpuRef.current?.push({ time: t, value: 30 + Math.sin(i * 0.08) * 20 + Math.random() * 10 })
      memRef.current?.push({ time: t, value: 60 + Math.sin(i * 0.03) * 15 + Math.random() * 5 })
      netRef.current?.push({ time: t, value: Math.random() * 100 })
    }, 100)
    return () => clearInterval(id)
  }, [])

  const histRef = useRef()

  useEffect(() => {
    const id2 = setInterval(() => {
      histRef.current?.push({
        time: Date.now(),
        value: Math.floor(Math.random() * 5) + 1,
      })
    }, 120)
    return () => clearInterval(id2)
  }, [])

  const metrics = [
    { label: "CPU", ref: cpuRef, value: "42%", color: "#6366f1" },
    { label: "Memory", ref: memRef, value: "68%", color: "#f59e0b" },
    { label: "Network I/O", ref: netRef, value: "1.2 GB/s", color: "#10b981" },
  ]

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
          <th style={thStyle}>Metric</th>
          <th style={thStyle}>Current</th>
          <th style={{ ...thStyle, width: 160 }}>Trend (60s)</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map(({ label, ref, value, color }) => (
          <tr key={label} style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={tdStyle}>{label}</td>
            <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "var(--font-code, monospace)" }}>{value}</td>
            <td style={tdStyle}>
              <RealtimeLineChart
                ref={ref}
                mode="sparkline"
                size={[140, 28]}
                timeAccessor="time"
                valueAccessor="value"
                windowSize={60}
                stroke={color}
                strokeWidth={1.5}
              />
            </td>
          </tr>
        ))}
        <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
          <td style={tdStyle}>Events/sec</td>
          <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "var(--font-code, monospace)" }}>1.7K</td>
          <td style={tdStyle}>
            <RealtimeTemporalHistogram
              ref={histRef}
              mode="sparkline"
              binSize={500}
              size={[140, 28]}
              timeAccessor="time"
              valueAccessor="value"
              windowSize={40}
              fill="#ef4444"
            />
          </td>
        </tr>
        <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
          <td style={tdStyle}>Latency (forecast)</td>
          <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "var(--font-code, monospace)" }}>91ms</td>
          <td style={tdStyle}>
            <LineChart
              data={forecastData}
              xAccessor="x"
              yAccessor="y"
              mode="sparkline"
              width={140}
              height={28}
              colorScheme={["#8b5cf6"]}
              forecast={{
                isTraining: "isTraining",
                isForecast: "isForecast",
                isAnomaly: "isAnomaly",
                upperBounds: "upper",
                lowerBounds: "lower",
              }}
            />
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Mode toggle demo
// ---------------------------------------------------------------------------

function ModeToggleDemo() {
  const [mode, setMode] = useState("primary")

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["primary", "context", "sparkline"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: `2px solid ${mode === m ? "var(--accent, #6366f1)" : "var(--surface-3, #ccc)"}`,
              background: mode === m ? "var(--accent, #6366f1)" : "transparent",
              color: mode === m ? "#fff" : "var(--text-primary, #333)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "flex-start",
        padding: 16,
        background: "var(--surface-1, #fafafa)",
        borderRadius: 8,
        border: "1px solid var(--surface-3, #e0e0e0)",
      }}>
        <LineChart
          data={salesTrend}
          lineBy="id"
          xAccessor="month"
          yAccessor="value"
          mode={mode}
          xLabel="Month"
          yLabel="Sales ($K)"
          title="Monthly Sales"
          curve="monotoneX"
        />
        <BarChart
          data={revenueByQuarter}
          categoryAccessor="quarter"
          valueAccessor="revenue"
          mode={mode}
          categoryLabel="Quarter"
          valueLabel="Revenue ($K)"
          title="Quarterly Revenue"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Linked context + primary demo
// ---------------------------------------------------------------------------

// Shared color palette — same order as channels appear in data.
// Using a single array ensures Email, Search, Social, Display get consistent
// colors across all charts regardless of data shape.
const channelColors = ["#e15759", "#4e79a7", "#59a14f", "#b07aa1"]

const channelTreeData = {
  name: "Channels",
  children: [
    {
      name: "Email",
      children: [
        { name: "Newsletter", value: 500, channel: "Email" },
        { name: "Drip", value: 400, channel: "Email" },
      ],
    },
    {
      name: "Search",
      children: [
        { name: "Brand", value: 1200, channel: "Search" },
        { name: "Non-Brand", value: 900, channel: "Search" },
      ],
    },
    {
      name: "Social",
      children: [
        { name: "Organic", value: 600, channel: "Social" },
        { name: "Paid", value: 700, channel: "Social" },
      ],
    },
    {
      name: "Display",
      children: [
        { name: "Retargeting", value: 250, channel: "Display" },
        { name: "Prospecting", value: 150, channel: "Display" },
      ],
    },
  ],
}

const channelColorMap = {
  Email: channelColors[0],
  Search: channelColors[1],
  Social: channelColors[2],
  Display: channelColors[3],
}

function LinkedDashboardDemo() {
  return (
    <CategoryColorProvider colors={channelColorMap}>
    <LinkedCharts>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #666)", marginBottom: 4 }}>
          Primary — Campaign Performance Detail
        </div>
        <Scatterplot
          data={scatterData}
          xAccessor="spend"
          yAccessor="roi"
          colorBy="channel"
          colorScheme={channelColors}
          xLabel="Ad Spend ($K)"
          yLabel="ROI"
          linkedHover={{ name: "dash", fields: ["channel"] }}
          selection={{ name: "dash" }}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #666)", marginBottom: 4 }}>
              Context — Channel Breakdown
            </div>
            <Treemap
              data={channelTreeData}
              childrenAccessor="children"
              valueAccessor="value"
              nodeIdAccessor="name"
              colorBy="channel"
              colorScheme={channelColors}
              mode="context"
              width={300}
              height={200}
              linkedHover={{ name: "dash", fields: ["channel"] }}
              selection={{ name: "dash" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #666)", marginBottom: 4 }}>
              Context — Spend Allocation
            </div>
            <DonutChart
              data={[
                { channel: "Email", spend: 62, name: "Email" },
                { channel: "Search", spend: 143, name: "Search" },
                { channel: "Social", spend: 77, name: "Social" },
                { channel: "Display", spend: 26, name: "Display" },
              ]}
              categoryAccessor="channel"
              valueAccessor="spend"
              colorBy="channel"
              colorScheme={channelColors}
              mode="context"
              width={200}
              height={200}
              linkedHover={{ name: "dash", fields: ["channel"] }}
              selection={{ name: "dash" }}
            />
          </div>
        </div>
      </div>
    </LinkedCharts>
    </CategoryColorProvider>
  )
}

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------

function KpiCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {kpiData.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid var(--surface-3, #e0e0e0)",
            background: "var(--surface-1, #fff)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-secondary, #888)", marginBottom: 2 }}>
            {kpi.label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary, #111)" }}>
              {kpi.value}
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: kpi.positive ? "#16a34a" : "#dc2626",
            }}>
              {kpi.change}
            </span>
          </div>
          <div style={{ marginTop: 4 }}>
            <LineChart
              data={kpi.trend}
              xAccessor="x"
              yAccessor="y"
              mode="sparkline"
              width={100}
              height={20}
              colorScheme={[kpi.positive ? "#16a34a" : "#dc2626"]}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChartModesPage() {
  return (
    <PageLayout
      title="Chart Modes"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Chart Modes", path: "/features/chart-modes" },
      ]}
      prevPage={{ title: "Chart Container", path: "/features/chart-container" }}
    >
      <p>
        Every Semiotic chart accepts a <code>mode</code> prop that instantly
        adapts it for different contexts. The same component definition works
        as a full dashboard panel, a compact sidebar widget, or an inline
        sparkline in a KPI card — without manually stripping axes, hover, and
        margins.
      </p>

      <CodeBlock
        code={`<LineChart data={data} xAccessor="month" yAccessor="value" />                    // primary (default)
<LineChart data={data} xAccessor="month" yAccessor="value" mode="context" />     // compact sidebar
<LineChart data={data} xAccessor="month" yAccessor="value" mode="sparkline" />   // inline KPI`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Interactive toggle */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="interactive-demo">Interactive Demo</h2>

      <p>
        Toggle between modes to see the same charts adapt their chrome, size,
        and interaction. User-provided props always override mode defaults —
        modes are presets, not constraints.
      </p>

      <ModeToggleDemo />

      {/* ----------------------------------------------------------------- */}
      {/* KPI Cards */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="kpi-cards">KPI Cards with Sparklines</h2>

      <p>
        Sparkline mode strips all chrome for inline use. Embed trend lines in
        KPI cards, table cells, or notification badges — anywhere a full chart
        would be too heavy.
      </p>

      <KpiCards />

      <CodeBlock
        code={`<div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
  <span style={{ fontSize: 22, fontWeight: 700 }}>$2.1M</span>
  <span style={{ color: "#16a34a" }}>+12%</span>
</div>
<LineChart
  data={trend}
  xAccessor="x"
  yAccessor="y"
  mode="sparkline"
  width={100}
  height={20}
  colorScheme={["#16a34a"]}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Linked Dashboard */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="linked-dashboard">Linked Dashboard with Context Panels</h2>

      <p>
        Pair a primary detail view with context-mode summary charts underneath.
        Wrap in <code>LinkedCharts</code> for cross-highlighting — hover a
        channel in any chart and all three highlight to match. The treemap
        provides a hierarchical breakdown that exposes users to a richer chart
        type they might not have tried on its own.
      </p>

      <LinkedDashboardDemo />

      <CodeBlock
        code={`<CategoryColorProvider colors={{
  Email: "#e15759", Search: "#4e79a7",
  Social: "#59a14f", Display: "#b07aa1",
}}>
<LinkedCharts>
  {/* Primary detail view */}
  <Scatterplot
    data={campaigns}
    xAccessor="spend" yAccessor="roi" colorBy="channel"
    linkedHover={{ name: "dash", fields: ["channel"] }}
    selection={{ name: "dash" }}
  />

  {/* Context panels — compact, no chrome, side by side */}
  <div style={{ display: "flex", gap: 12 }}>
    <Treemap
      data={channelTree} childrenAccessor="children" valueAccessor="value"
      colorBy="channel" mode="context" width={300} height={200}
      linkedHover={{ name: "dash", fields: ["channel"] }}
      selection={{ name: "dash" }}
    />
    <DonutChart
      data={spendBreakdown} categoryAccessor="channel" valueAccessor="spend"
      colorBy="channel" mode="context" width={200} height={200}
      linkedHover={{ name: "dash", fields: ["channel"] }}
      selection={{ name: "dash" }}
    />
  </div>
</LinkedCharts>
</CategoryColorProvider>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Streaming Sparklines */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="streaming-sparklines">Streaming Sparklines in Tables</h2>

      <p>
        Realtime charts support <code>mode="sparkline"</code> too. Embed live
        streaming spark charts in table rows for infrastructure monitoring,
        trading dashboards, or IoT sensor grids.
      </p>

      <StreamingSparkRow />

      <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary, #666)" }}>
        The first four rows use live streaming charts with{" "}
        <code>mode="sparkline"</code> — 140x28px, no axes, no hover. The last
        row is a static <code>LineChart</code> sparkline with{" "}
        <code>forecast</code> and <code>anomaly</code> decoration, showing
        training data, predicted values with confidence bands, and flagged anomalies.
      </div>

      <CodeBlock
        code={`// Streaming sparkline
<RealtimeLineChart
  ref={cpuRef}
  mode="sparkline"
  size={[140, 28]}
  timeAccessor="time"
  valueAccessor="value"
  windowSize={60}
  stroke="#6366f1"
  strokeWidth={1.5}
/>

// Forecast + anomaly sparkline (animated via state)
// Each datum has pre-computed flags: isTraining, isForecast, isAnomaly, upper, lower
<LineChart
  data={forecastData}
  xAccessor="x"
  yAccessor="y"
  mode="sparkline"
  width={140}
  height={28}
  colorScheme={["#8b5cf6"]}
  forecast={{
    isTraining: "isTraining",
    isForecast: "isForecast",
    isAnomaly: "isAnomaly",
    upperBounds: "upper",
    lowerBounds: "lower",
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Mode Defaults Table */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="mode-defaults">Mode Defaults</h2>

      <p>
        Each mode sets sensible defaults. Any prop you set explicitly overrides
        the mode default — <code>mode="sparkline" width={200}</code> gives you
        a 200px-wide sparkline instead of the default 120px.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>primary</th>
            <th style={thStyle}>context</th>
            <th style={thStyle}>sparkline</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["width", "600", "400", "120"],
            ["height", "400", "250", "24"],
            ["showAxes", "true", "false", "false"],
            ["showGrid", "false", "false", "false"],
            ["enableHover", "true", "false", "false"],
            ["showLegend", "auto", "false", "false"],
            ["title", "shown", "hidden", "hidden"],
            ["axis labels", "shown", "hidden", "hidden"],
            ["margin", "50/60/70/40", "10/10/10/10", "2/2/0/0"],
          ].map(([prop, primary, context, sparkline], i) => (
            <tr key={prop} style={{ background: i % 2 ? "var(--surface-1)" : "transparent" }}>
              <td style={tdCodeStyle}>{prop}</td>
              <td style={tdStyle}>{primary}</td>
              <td style={tdStyle}>{context}</td>
              <td style={tdStyle}>{sparkline}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/chart-container">Chart Container</Link> — wrap
          any chart in production chrome (title, export, status badge)
        </li>
        <li>
          <Link to="/features/small-multiples">Linked Charts</Link> — cross-highlighting
          and brushing between primary and context charts
        </li>
        <li>
          <Link to="/features/theming">Theming</Link> — modes compose with
          ThemeProvider for dark/light adaptation
        </li>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> — decay,
          pulse, and staleness on streaming sparklines
        </li>
      </ul>
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Table styles
// ---------------------------------------------------------------------------

const thStyle = {
  padding: "10px 14px",
  textAlign: "left",
  borderBottom: "1px solid var(--surface-3)",
  fontWeight: 600,
  fontSize: 13,
}

const tdStyle = {
  padding: "8px 14px",
  borderBottom: "1px solid var(--surface-3)",
  fontSize: 13,
}

const tdCodeStyle = {
  padding: "8px 14px",
  borderBottom: "1px solid var(--surface-3)",
  fontFamily: "var(--font-code)",
  fontSize: 12,
}
