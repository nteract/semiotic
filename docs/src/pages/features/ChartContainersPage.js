import React, { useRef, useState, useEffect } from "react"
import { ChartContainer, LineChart, BarChart, ThemeProvider } from "semiotic"

import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Site theme hook — reads data-theme from the docs site root element
// ---------------------------------------------------------------------------

function useSiteTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "dark"
    return document.documentElement.getAttribute("data-theme") || "dark"
  })

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => {
      setTheme(el.getAttribute("data-theme") || "dark")
    })
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])

  return theme
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  {
    id: "Revenue",
    coordinates: [
      { x: 1, y: 12 },
      { x: 2, y: 18 },
      { x: 3, y: 14 },
      { x: 4, y: 22 },
      { x: 5, y: 19 },
      { x: 6, y: 27 },
      { x: 7, y: 24 },
      { x: 8, y: 31 },
    ],
  },
]

const barDataByYear = {
  2024: [
    { category: "Q1", value: 120 },
    { category: "Q2", value: 180 },
    { category: "Q3", value: 95 },
    { category: "Q4", value: 210 },
  ],
  2023: [
    { category: "Q1", value: 95 },
    { category: "Q2", value: 140 },
    { category: "Q3", value: 110 },
    { category: "Q4", value: 175 },
  ],
  2022: [
    { category: "Q1", value: 80 },
    { category: "Q2", value: 105 },
    { category: "Q3", value: 90 },
    { category: "Q4", value: 130 },
  ],
}

const barData = barDataByYear[2024]

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const containerProps = [
  {
    name: "title",
    type: "string",
    required: false,
    default: "undefined",
    description: "Chart title displayed in the header bar.",
  },
  {
    name: "subtitle",
    type: "string",
    required: false,
    default: "undefined",
    description: "Subtitle / description displayed below the title.",
  },
  {
    name: "children",
    type: "ReactNode",
    required: true,
    default: "-",
    description: "Any Semiotic chart component(s).",
  },
  {
    name: "width",
    type: 'number | string',
    required: false,
    default: '"100%"',
    description: "Width of the container. Passed to child chart if not set on child.",
  },
  {
    name: "height",
    type: "number",
    required: false,
    default: "400",
    description: "Height of the chart area (excluding header).",
  },
  {
    name: "actions",
    type: "{ export?, fullscreen?, copyConfig?, dataSummary? }",
    required: false,
    default: "undefined",
    description:
      "Built-in action buttons. Each can be true or false. export also accepts { format, scale, filename }. dataSummary shows a statistical summary + sample rows panel.",
  },
  {
    name: "controls",
    type: "ReactNode",
    required: false,
    default: "undefined",
    description: "Additional controls rendered in the toolbar before built-in action buttons.",
  },
  {
    name: "loading",
    type: "boolean",
    required: false,
    default: "false",
    description: "Shows a pulsing skeleton placeholder instead of chart children.",
  },
  {
    name: "error",
    type: "string | ReactNode",
    required: false,
    default: "undefined",
    description: "Shows an error message in place of chart children.",
  },
  {
    name: "errorBoundary",
    type: "boolean",
    required: false,
    default: "false",
    description: "Wraps children in ChartErrorBoundary to catch render errors.",
  },
  {
    name: "status",
    type: '"live" | "stale" | "paused" | "error" | "static"',
    required: false,
    default: "undefined",
    description:
      "Status badge displayed in the toolbar after action buttons. Green for live, red for stale/error, yellow for paused, gray for static.",
  },
  {
    name: "className",
    type: "string",
    required: false,
    default: "undefined",
    description: "CSS class for the outer container.",
  },
  {
    name: "style",
    type: "CSSProperties",
    required: false,
    default: "undefined",
    description: "Inline style overrides for the outer container.",
  },
  {
    name: "ref",
    type: "Ref<ChartContainerHandle>",
    required: false,
    default: "-",
    description:
      "Imperative handle with export(), toggleFullscreen(), and element properties.",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChartContainersPage() {
  const siteTheme = useSiteTheme()
  const [statusDemo, setStatusDemo] = useState("live")
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [selectedYear, setSelectedYear] = useState("2024")
  const chartRef = useRef(null)

  return (
    <PageLayout
      title="Chart Container"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Chart Container", path: "/features/chart-container" },
      ]}
      prevPage={{
        title: "Realtime Encoding",
        path: "/features/realtime-encoding",
      }}
    >
      <p>
        <code>ChartContainer</code> wraps any Semiotic chart in a
        production-ready shell with a title, subtitle, toolbar actions, loading
        and error states, and a streaming status badge. It's fully theme-aware
        via <Link to="/features/theming">ThemeProvider</Link>.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Basic usage */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="basic-usage">Basic Usage</h2>

      <p>
        Wrap any chart in <code>ChartContainer</code> with a title and subtitle.
        Enable export and fullscreen via the <code>actions</code> prop.
      </p>

      <div style={{ maxWidth: 620, marginBottom: 24 }}>
        <ThemeProvider theme={siteTheme}>
          <ChartContainer
            title="Monthly Revenue"
            subtitle="USD thousands, 2024"
            actions={{ export: true, fullscreen: true, dataSummary: true }}
            height={300}
          >
            <LineChart
              data={lineData}
              lineBy="id"
              xAccessor="x"
              yAccessor="y"
              curve="monotoneX"
              width={600}
              height={300}
            />
          </ChartContainer>
        </ThemeProvider>
      </div>

      <CodeBlock
        code={`import { ChartContainer, LineChart } from "semiotic"

<ChartContainer
  title="Monthly Revenue"
  subtitle="USD thousands, 2024"
  actions={{ export: true, fullscreen: true, dataSummary: true }}
>
  <LineChart
    data={data}
    lineBy="id"
    xAccessor="x"
    yAccessor="y"
    curve="monotoneX"
  />
</ChartContainer>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Custom controls */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="custom-controls">Custom Controls</h2>

      <p>
        Pass any React content to <code>controls</code> to render it in the
        toolbar before the built-in action buttons.
      </p>

      <div style={{ maxWidth: 620, marginBottom: 24 }}>
        <ThemeProvider theme={siteTheme}>
          <ChartContainer
            title="Quarterly Sales"
            actions={{ export: { format: "png", filename: "sales" } }}
            controls={
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  fontSize: 12,
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid var(--semiotic-border, #e0e0e0)",
                  background: "transparent",
                  color: "var(--semiotic-text, #333)",
                  marginRight: 4,
                }}
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            }
          >
            <BarChart
              data={barDataByYear[selectedYear]}
              categoryAccessor="category"
              valueAccessor="value"
              width={600}
              height={300}
            />
          </ChartContainer>
        </ThemeProvider>
      </div>

      <CodeBlock
        code={`const [year, setYear] = useState("2024")

const dataByYear = {
  2024: [{ category: "Q1", value: 120 }, { category: "Q2", value: 180 }, ...],
  2023: [{ category: "Q1", value: 95 }, { category: "Q2", value: 140 }, ...],
}

<ChartContainer
  title="Quarterly Sales"
  actions={{ export: { format: "png", filename: "sales" } }}
  controls={
    <select value={year} onChange={(e) => setYear(e.target.value)}>
      <option value="2024">2024</option>
      <option value="2023">2023</option>
    </select>
  }
>
  <BarChart data={dataByYear[year]} categoryAccessor="category" valueAccessor="value" />
</ChartContainer>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Data Summary */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="data-summary">Data Summary</h2>

      <p>
        Enable <code>actions.dataSummary</code> to add a toolbar button that
        reveals a statistical summary of the chart's data — field ranges, means,
        and 5 sample rows. This is useful for everyone: screen reader users get
        it automatically, but sighted users can also inspect what data the chart
        is actually rendering. Click the bar-chart icon in the toolbar below.
      </p>

      <div style={{ maxWidth: 620, marginBottom: 24 }}>
        <ThemeProvider theme={siteTheme}>
          <ChartContainer
            title="Quarterly Sales"
            subtitle="Click the summary icon to inspect the data"
            actions={{ dataSummary: true, export: true }}
            height={300}
          >
            <BarChart
              data={barData}
              categoryAccessor="category"
              valueAccessor="value"
              width={600}
              height={300}
            />
          </ChartContainer>
        </ThemeProvider>
      </div>

      <CodeBlock
        code={`// Data summary action — shows stats + sample rows below the chart
<ChartContainer
  title="Quarterly Sales"
  actions={{ dataSummary: true, export: true }}
>
  <BarChart data={data} categoryAccessor="category" valueAccessor="value" />
</ChartContainer>

// The summary panel shows something like:
// "4 data points. category: Q1, Q2, Q3, Q4. value: 95 to 210, mean 151.25."
// + a 4-row sample table

// Works with all chart types — XY, ordinal, network, geo.
// For screen readers, the same data is always available via a
// hidden button (accessibleTable={true} by default).`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Loading and Error states */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="loading-error">Loading & Error States</h2>

      <p>
        Toggle <code>loading</code> to show a skeleton placeholder, or set{" "}
        <code>error</code> to display an error message in place of the chart.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setLoadingDemo(!loadingDemo)}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: "1px solid var(--surface-3, #ccc)",
            background: loadingDemo ? "var(--surface-3, #e0e0e0)" : "transparent",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-primary, #333)",
          }}
        >
          {loadingDemo ? "Stop Loading" : "Simulate Loading"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: "1 1 290px", minWidth: 290 }}>
          <ThemeProvider theme={siteTheme}>
            <ChartContainer title="Loading Demo" loading={loadingDemo} height={200}>
              <BarChart
                data={barData}
                categoryAccessor="category"
                valueAccessor="value"
                width={290}
                height={200}
              />
            </ChartContainer>
          </ThemeProvider>
        </div>
        <div style={{ flex: "1 1 290px", minWidth: 290 }}>
          <ThemeProvider theme={siteTheme}>
            <ChartContainer title="Error Demo" error="Failed to fetch data from API." height={200}>
              <div />
            </ChartContainer>
          </ThemeProvider>
        </div>
      </div>

      <CodeBlock
        code={`// Loading skeleton
<ChartContainer title="CPU Load" loading={isLoading}>
  <LineChart data={data} xAccessor="x" yAccessor="y" />
</ChartContainer>

// Error state
<ChartContainer title="CPU Load" error="Failed to fetch data from API.">
  <LineChart data={data} xAccessor="x" yAccessor="y" />
</ChartContainer>

// Error boundary (catches render crashes)
<ChartContainer title="CPU Load" errorBoundary>
  <LineChart data={data} xAccessor="x" yAccessor="y" />
</ChartContainer>`}
        language="jsx"
      />

      <p>
        Individual charts also support built-in <code>loading</code> and{" "}
        <code>emptyContent</code> props. See{" "}
        <Link to="/features/chart-states">Chart States</Link> for full
        documentation on empty, loading, and error patterns.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Status badge */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="status-badge">Status Badge</h2>

      <p>
        Use the <code>status</code> prop to show a streaming status indicator.
        Works well with <Link to="/features/realtime-encoding">realtime charts</Link>.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {["live", "stale", "paused", "error", "static"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusDemo(s)}
            style={{
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid var(--surface-3, #ccc)",
              background: statusDemo === s ? "var(--surface-3, #e0e0e0)" : "transparent",
              cursor: "pointer",
              fontSize: 13,
              textTransform: "capitalize",
              color: "var(--text-primary, #333)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 620, marginBottom: 24 }}>
        <ThemeProvider theme={siteTheme}>
          <ChartContainer
            title="Sensor Feed"
            subtitle="Temperature readings"
            status={statusDemo}
            actions={{ fullscreen: true }}
            height={250}
          >
            <LineChart
              data={lineData}
              lineBy="id"
              xAccessor="x"
              yAccessor="y"
              width={600}
              height={250}
            />
          </ChartContainer>
        </ThemeProvider>
      </div>

      <CodeBlock
        code={`<ChartContainer
  title="Sensor Feed"
  status="live"           // "live" | "stale" | "paused" | "error" | "static"
>
  <RealtimeLineChart ref={chartRef} timeAccessor="time" valueAccessor="temp" />
</ChartContainer>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Imperative handle */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="imperative-handle">Imperative Handle</h2>

      <p>
        Use a ref to call <code>export()</code> or <code>toggleFullscreen()</code> programmatically.
      </p>

      <CodeBlock
        code={`import { useRef } from "react"
import { ChartContainer } from "semiotic"

function Dashboard() {
  const chartRef = useRef(null)

  const downloadAll = async () => {
    await chartRef.current.export({ format: "png", scale: 2 })
  }

  return (
    <>
      <button onClick={downloadAll}>Download PNG</button>
      <ChartContainer ref={chartRef} title="Revenue">
        <LineChart data={data} xAccessor="x" yAccessor="y" />
      </ChartContainer>
    </>
  )
}`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Dark theme */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="dark-theme">Dark Theme</h2>

      <p>
        <code>ChartContainer</code> reads CSS custom properties from{" "}
        <Link to="/features/theming">ThemeProvider</Link>, so it adapts
        automatically. All examples on this page already follow the site
        theme — toggle dark/light mode in the header to see it.
      </p>

      <div style={{ maxWidth: 620, marginBottom: 24 }}>
        <ThemeProvider theme="dark">
          <ChartContainer
            title="Always Dark"
            subtitle="Pinned to dark theme regardless of site mode"
            actions={{ export: true, fullscreen: true }}
            status="live"
            height={250}
          >
            <LineChart
              data={lineData}
              lineBy="id"
              xAccessor="x"
              yAccessor="y"
              curve="monotoneX"
              width={600}
              height={250}
            />
          </ChartContainer>
        </ThemeProvider>
      </div>

      <CodeBlock
        code={`import { ThemeProvider, ChartContainer, LineChart } from "semiotic"

// Pin to dark theme explicitly
<ThemeProvider theme="dark">
  <ChartContainer title="Dark Mode" actions={{ export: true }} status="live">
    <LineChart data={data} xAccessor="x" yAccessor="y" />
  </ChartContainer>
</ThemeProvider>

// Or follow a dynamic theme
<ThemeProvider theme={isDark ? "dark" : "light"}>
  <ChartContainer title="Adaptive">
    <LineChart data={data} xAccessor="x" yAccessor="y" />
  </ChartContainer>
</ThemeProvider>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props table */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="ChartContainer" props={containerProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/theming">Theming</Link> — ThemeProvider controls
          the CSS custom properties that ChartContainer reads
        </li>
        <li>
          <Link to="/features/accessibility">Accessibility</Link> — data summary,
          keyboard navigation, screen reader support
        </li>
        <li>
          <Link to="/features/styling">Styling</Link> — styling the chart marks
          inside the container
        </li>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> — use{" "}
          <code>status</code> with streaming charts
        </li>
      </ul>
    </PageLayout>
  )
}
