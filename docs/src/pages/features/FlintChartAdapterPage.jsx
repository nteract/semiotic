import React, { useMemo, useState } from "react"
import {
  AreaChart,
  BarChart,
  BoxPlot,
  BubbleChart,
  DonutChart,
  GroupedBarChart,
  Heatmap,
  Histogram,
  LineChart,
  PieChart,
  Scatterplot,
  StackedAreaChart,
  StackedBarChart,
  configToJSX,
} from "semiotic"
import { describeChart } from "semiotic/ai"
import { unstable_fromFlintChart as fromFlintChart } from "semiotic/experimental"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"

const SALES = [
  { region: "North", segment: "Consumer", month: "2026-01", sales: 10, profit: 2, margin: 0.2 },
  { region: "North", segment: "Business", month: "2026-01", sales: 15, profit: 5, margin: 0.33 },
  { region: "South", segment: "Consumer", month: "2026-02", sales: 12, profit: 3, margin: 0.25 },
  { region: "South", segment: "Business", month: "2026-02", sales: 18, profit: 7, margin: 0.39 },
  { region: "West", segment: "Consumer", month: "2026-03", sales: 9, profit: 1, margin: 0.11 },
  { region: "West", segment: "Business", month: "2026-03", sales: 21, profit: 8, margin: 0.38 },
]

const GRID = [
  { weekday: "Mon", slot: "AM", load: 0.31 },
  { weekday: "Mon", slot: "PM", load: 0.66 },
  { weekday: "Tue", slot: "AM", load: 0.42 },
  { weekday: "Tue", slot: "PM", load: 0.82 },
  { weekday: "Wed", slot: "AM", load: 0.37 },
  { weekday: "Wed", slot: "PM", load: 0.74 },
]

const PRESETS = {
  "Stacked bar": {
    note: "A compact Flint request becomes a Semiotic StackedBarChart, with size, labels, field semantics, and warnings preserved around the config.",
    input: {
      data: { values: SALES },
      semantic_types: { sales: "Currency", region: "Region", month: "YearMonth" },
      field_display_names: { region: "Region", sales: "Sales" },
      chart_spec: {
        chartType: "Stacked Bar Chart",
        encodings: {
          x: { field: "region", type: "nominal" },
          y: { field: "sales", type: "quantitative", aggregate: "sum" },
          color: { field: "segment", type: "nominal", scheme: "tableau10" },
        },
        baseSize: { width: 560, height: 320 },
        canvasSize: { width: 760, height: 440 },
        chartProperties: { stackMode: "normalize", cornerRadius: 3, title: "Sales mix by region" },
      },
    },
  },
  "Time series": {
    note: "Flint field semantics carry enough intent for the adapter to choose a time x-scale and series grouping.",
    input: {
      data: { values: SALES },
      semantic_types: { month: "YearMonth", sales: "Currency" },
      field_display_names: { month: "Month", sales: "Sales" },
      chart_spec: {
        chartType: "Line Chart",
        encodings: {
          x: "month",
          y: "sales",
          color: "segment",
        },
        baseSize: { width: 560, height: 300 },
        chartProperties: { interpolate: "step-after", showPoints: true, title: "Monthly sales by segment" },
      },
    },
  },
  Heatmap: {
    note: "Flint's color channel is the heatmap value. Semiotic keeps that value encoding, then adds its own accessible chart behavior.",
    input: {
      data: { values: GRID },
      semantic_types: { load: "Percentage" },
      field_display_names: { weekday: "Weekday", slot: "Time slot", load: "Load" },
      chart_spec: {
        chartType: "Heatmap",
        encodings: {
          x: { field: "weekday", type: "nominal" },
          y: { field: "slot", type: "nominal" },
          color: { field: "load", type: "quantitative", scheme: "viridis" },
        },
        baseSize: { width: 480, height: 300 },
        chartProperties: { showTextLabels: true, title: "Service load" },
      },
    },
  },
  Donut: {
    note: "Flint's pie size channel maps to slice value; innerRadius promotes the Semiotic output to DonutChart.",
    input: {
      data: { values: SALES },
      chart_spec: {
        chartType: "Pie Chart",
        encodings: {
          color: "segment",
          size: { field: "sales", type: "quantitative", aggregate: "sum" },
        },
        baseSize: { width: 420, height: 320 },
        chartProperties: { innerRadius: 65, cornerRadius: 2, title: "Sales by segment" },
      },
    },
  },
}

const CHARTS = {
  AreaChart,
  BarChart,
  BoxPlot,
  BubbleChart,
  DonutChart,
  GroupedBarChart,
  Heatmap,
  Histogram,
  LineChart,
  PieChart,
  Scatterplot,
  StackedAreaChart,
  StackedBarChart,
}

const pretty = (value) => JSON.stringify(value, null, 2)

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  background: "var(--surface-1)",
  padding: 14,
}

function chartProps(config) {
  return {
    ...config.props,
    width: Math.min(config.props.width || 480, 560),
    height: Math.min(config.props.height || 300, 340),
  }
}

export default function FlintChartAdapterPage() {
  const presetNames = Object.keys(PRESETS)
  const [presetName, setPresetName] = useState(presetNames[0])
  const [inputText, setInputText] = useState(pretty(PRESETS[presetNames[0]].input))

  const parsed = useMemo(() => {
    try {
      return { input: JSON.parse(inputText), error: null }
    } catch (error) {
      return { input: null, error: error.message }
    }
  }, [inputText])

  const config = useMemo(() => {
    if (!parsed.input) return null
    try {
      return fromFlintChart(parsed.input)
    } catch (error) {
      return { error: error.message }
    }
  }, [parsed.input])

  const Chart = config && !config.error ? CHARTS[config.component] : null
  const jsx = config && !config.error ? configToJSX(config) : ""
  const description = useMemo(() => {
    if (!config || config.error) return null
    try {
      return describeChart(config.component, config.props).text
    } catch {
      return null
    }
  }, [config])

  function selectPreset(name) {
    setPresetName(name)
    setInputText(pretty(PRESETS[name].input))
  }

  return (
    <PageLayout
      title="Flint Chart Adapter"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "Flint Chart Adapter", path: "/interoperability/flint-chart" },
      ]}
      prevPage={{ title: "Observable Plot", path: "/interoperability/observable-plot" }}
      nextPage={{ title: "Mermaid", path: "/interoperability/mermaid" }}
    >
      <p>
        Flint&apos;s authoring surface is a compact chart request: rows, field semantics, chart type,
        channel encodings, and sizing intent. <code>unstable_fromFlintChart</code> treats that
        request as an inbound ecosystem format and compiles it to a Semiotic{" "}
        <code>ChartConfig</code>. Flint keeps doing what it is good at: agent-legible semantic
        chart authoring. Semiotic adds React rendering, accessibility, descriptions, annotations,
        SSR, diagnostics, and IDID metadata around the resulting chart.
      </p>

      <h2>Live Adapter</h2>
      <p>
        Choose a preset or edit the Flint request directly. The adapter runs in the browser and
        returns an inspectable Semiotic config plus warnings when a Flint feature is preserved but
        not rendered by this spike.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {presetNames.map((name) => (
          <button
            key={name}
            onClick={() => selectPreset(name)}
            style={{
              padding: "6px 12px",
              border: "1px solid var(--surface-3)",
              borderRadius: 6,
              background: name === presetName ? "var(--accent)" : "var(--surface-1)",
              color: name === presetName ? "#fff" : "var(--text-primary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        {PRESETS[presetName].note}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <div>
          <h3>Flint ChartAssemblyInput</h3>
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 420,
              boxSizing: "border-box",
              padding: 12,
              border: parsed.error ? "2px solid var(--semiotic-danger, #dc2626)" : "1px solid var(--surface-3)",
              borderRadius: 8,
              background: "var(--surface-1)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-code)",
              fontSize: 13,
              lineHeight: 1.45,
              resize: "vertical",
            }}
          />
          {parsed.error && (
            <p style={{ color: "var(--semiotic-danger, #dc2626)", fontSize: 13 }}>
              {parsed.error}
            </p>
          )}
        </div>

        <div>
          <h3>Rendered Semiotic Chart</h3>
          <div style={{ ...panelStyle, minHeight: 420 }}>
            {config?.error && (
              <p style={{ color: "var(--semiotic-danger, #dc2626)" }}>{config.error}</p>
            )}
            {!config && !parsed.error && <p>Paste a Flint request to render a chart.</p>}
            {config && !config.error && Chart && <Chart {...chartProps(config)} />}
            {config && !config.error && !Chart && (
              <p>
                <code>{config.component}</code> is not wired into this docs preview yet. The
                generated config below is still available.
              </p>
            )}
            {config && !config.error && config.warnings?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 13 }}>Adapter warnings</strong>
                <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)" }}>
                  {config.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {config && !config.error && (
        <>
          <h2>Generated Config</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            <div>
              <h3>ChartConfig</h3>
              <CodeBlock language="json" wrap>
                {pretty({
                  component: config.component,
                  props: {
                    ...config.props,
                    data: Array.isArray(config.props.data) ? `${config.props.data.length} rows` : config.props.data,
                  },
                  flint: config.flint,
                  warnings: config.warnings,
                })}
              </CodeBlock>
            </div>
            <div>
              <h3>JSX</h3>
              <CodeBlock language="jsx" wrap>
                {jsx}
              </CodeBlock>
            </div>
          </div>
        </>
      )}

      {description && (
        <>
          <h2>What Semiotic Adds</h2>
          <div style={panelStyle}>
            <p style={{ marginTop: 0 }}>{description}</p>
            <p style={{ marginBottom: 0, color: "var(--text-secondary)", fontSize: 13 }}>
              The same config can flow through Semiotic&apos;s accessibility audit, keyboard
              navigation, annotations, serialization, SSR rendering, and agent repair tools.
            </p>
          </div>
        </>
      )}

      <h2>Usage</h2>
      <CodeBlock language="ts">
        {`import { unstable_fromFlintChart } from "semiotic/experimental"

const config = unstable_fromFlintChart({
  data: { values: rows },
  semantic_types: { month: "YearMonth", sales: "Currency" },
  chart_spec: {
    chartType: "Line Chart",
    encodings: { x: "month", y: "sales", color: "segment" },
    baseSize: { width: 560, height: 300 },
    canvasSize: { width: 760, height: 420 },
  },
})

// config.component === "LineChart"
// config.props is ready for rendering or configToJSX(config)`}
      </CodeBlock>

      <h2>Current Scope</h2>
      <p>
        This is intentionally staged behind <code>unstable_</code>. The spike covers bar,
        grouped bar, stacked bar, line, area, scatter and bubble charts, heatmap, pie and
        donut charts, histogram, and boxplot. It preserves Flint URLs, field semantics,
        chart properties, sizing, and unmapped encodings under <code>config.flint</code> so
        hosts can inspect what did not render. It does not fetch data URLs, compile Flint
        to Vega-Lite/ECharts/Chart.js, or render Flint facets as small multiples.
      </p>
    </PageLayout>
  )
}
