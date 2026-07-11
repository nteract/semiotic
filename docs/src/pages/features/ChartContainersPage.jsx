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
    name: "notifications",
    type: "ChartNotification[]",
    required: false,
    default: "undefined",
    description:
      "Chart-level notices surfaced as a severity-colored toolbar bell with a count badge; clicking it opens a popover with the dismissible cards (an overlay, so arriving/dismissing notices never reflow the plot). Each entry: { id?, level?, title?, message, source?, dismissible? }. Levels (info | success | warning | error | neutral) map to the theme's semantic role colors; the bell adopts the icon + color of the most severe visible notice, and an sr-only aria-live region announces the count + severity.",
  },
  {
    name: "onNotificationDismiss",
    type: "(notification, index) => void",
    required: false,
    default: "undefined",
    description:
      "Called when a notification's dismiss button is clicked. Dismissal is tracked internally (keyed by notification.id, falling back to array index) whether or not this is provided.",
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

const notificationDemoItems = [
  {
    id: "truncated-axis",
    level: "error",
    title: "Truncated axis",
    message:
      "Start the bar axis at zero, or switch to a point or line form that does not imply a zero baseline.",
    source: "datapitfalls · Graphical Gaffes",
  },
  {
    id: "stale-source",
    level: "warning",
    title: "Source data is 26 hours old",
    message: "The nightly warehouse sync has not completed. Values may lag reality.",
    source: "data platform",
  },
  {
    id: "methodology",
    level: "info",
    message: "Q3 values are restated after the fiscal-calendar change.",
    dismissible: false,
  },
]

export default function ChartContainersPage() {
  const siteTheme = useSiteTheme()
  const [statusDemo, setStatusDemo] = useState("live")
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [selectedYear, setSelectedYear] = useState("2024")
  const [notificationDemoKey, setNotificationDemoKey] = useState(0)
  const [lastDismissed, setLastDismissed] = useState(null)
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
        code={`// Data summary action — shows stats + sample rows in an overlay above the plot
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
      {/* Notifications */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="notifications">Notifications</h2>

      <p>
        The <code>notifications</code> prop surfaces <em>chart-level</em> notices
        that have no single mark to anchor to — machine findings (a{" "}
        <Link to="/intelligence/data-pitfalls">Data Pitfalls</Link> report entry
        about the whole chart, an unplaceable{" "}
        <Link to="/interoperability/data-quality-bridge">data-quality</Link>{" "}
        result) and any custom user-authored notice. They collapse into a single
        toolbar <strong>bell with a count badge</strong>: the bell adopts the icon
        and color of the <em>most severe</em> visible notice, so severity reads at
        a glance. Clicking the bell opens a <strong>popover</strong> with the full
        dismissible cards — an overlay, so a notice arriving or being dismissed
        never reflows the chart body. Levels map to the theme&rsquo;s semantic
        role colors, and a screen-reader-only <code>aria-live=&quot;polite&quot;</code>{" "}
        region announces the current count and most-severe level, so notices that
        arrive while streaming are still voiced even with the popover collapsed.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setNotificationDemoKey((k) => k + 1)}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: "1px solid var(--surface-3, #ccc)",
            background: "transparent",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-primary, #333)",
          }}
        >
          Restore dismissed notifications
        </button>
        {lastDismissed && (
          <span style={{ fontSize: 12, color: "var(--text-secondary, #666)", alignSelf: "center" }}>
            onNotificationDismiss → <code>{lastDismissed}</code>
          </span>
        )}
      </div>

      <div style={{ maxWidth: 620, marginBottom: 24 }}>
        <ThemeProvider theme={siteTheme}>
          <ChartContainer
            key={notificationDemoKey}
            title="Customer satisfaction"
            subtitle="The error finding came back from a datapitfalls scan; the info note is pinned (dismissible: false)"
            notifications={notificationDemoItems}
            onNotificationDismiss={(notification) => setLastDismissed(notification.id)}
            height={260}
          >
            <BarChart
              data={barData}
              categoryAccessor="category"
              valueAccessor="value"
              width={600}
              height={260}
            />
          </ChartContainer>
        </ThemeProvider>
      </div>

      <CodeBlock
        code={`<ChartContainer
  title="Customer satisfaction"
  notifications={[
    {
      id: "truncated-axis",              // stable id — keys dismissal
      level: "error",                    // "info" | "success" | "warning" | "error" | "neutral"
      title: "Truncated axis",
      message: "Start the bar axis at zero.",
      source: "datapitfalls · Graphical Gaffes",  // small origin tag
    },
    {
      id: "methodology",
      level: "info",
      message: "Q3 values are restated after the fiscal-calendar change.",
      dismissible: false,                // pinned — no dismiss button
    },
  ]}
  onNotificationDismiss={(notification, index) => track(notification.id)}
>
  <BarChart data={data} categoryAccessor="category" valueAccessor="value" />
</ChartContainer>

// Feeding machine findings straight in — e.g. chart-level entries from a
// datapitfalls report (findings that name the whole chart, not one mark):
const notifications = report.findings
  .filter((finding) => !anchorable(finding))
  .map((finding) => ({
    id: finding.ruleId,
    level: finding.severity,             // info | warning | error map 1:1
    title: finding.name,
    message: finding.remediation,
    source: \`datapitfalls · \${finding.domain}\`,
  }))`}
        language="jsx"
      />

      <p>
        Dismissal is tracked internally, keyed by <code>id</code> (falling back
        to array index), so a re-render with the same list keeps dismissed
        entries dismissed — pass <code>onNotificationDismiss</code> to sync your
        own store or telemetry. Mark-level findings belong on the plot as{" "}
        <Link to="/annotations/overview">annotations</Link>; notifications are
        for everything that describes the chart as a whole. See the{" "}
        <Link to="/examples/what-the-machine-sees">What the Machine Sees</Link> example for the
        two surfaces working together on a real audit report.
      </p>

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
