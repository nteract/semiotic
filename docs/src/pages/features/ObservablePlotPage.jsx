import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AreaChart,
  BarChart,
  Heatmap,
  LineChart,
  Scatterplot,
  StackedAreaChart,
  StackedBarChart,
} from "semiotic"
import { describeChart } from "semiotic/ai"
import { unstable_fromObservablePlot as fromObservablePlot } from "semiotic/experimental"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ── Demo datasets ────────────────────────────────────────────────────────────

// Categorical x (month) — fine for bars, which use an ordinal category scale.
const SERIES = [
  { month: "Jan", users: 240, plan: "Free" },
  { month: "Feb", users: 312, plan: "Free" },
  { month: "Mar", users: 287, plan: "Free" },
  { month: "Jan", users: 90, plan: "Pro" },
  { month: "Feb", users: 140, plan: "Pro" },
  { month: "Mar", users: 210, plan: "Pro" },
]

// Continuous x (week) — a line chart needs a continuous x scale, so the demo
// uses a numeric x rather than category labels.
const TREND = [
  { week: 1, users: 240, plan: "Free" },
  { week: 2, users: 312, plan: "Free" },
  { week: 3, users: 287, plan: "Free" },
  { week: 4, users: 360, plan: "Free" },
  { week: 1, users: 90, plan: "Pro" },
  { week: 2, users: 140, plan: "Pro" },
  { week: 3, users: 210, plan: "Pro" },
  { week: 4, users: 280, plan: "Pro" },
]

const POINTS = [
  { spend: 12, conv: 3.1, channel: "Search" },
  { spend: 28, conv: 4.4, channel: "Social" },
  { spend: 41, conv: 5.0, channel: "Search" },
  { spend: 19, conv: 3.8, channel: "Email" },
  { spend: 55, conv: 6.2, channel: "Social" },
]

const GRID = [
  { day: "Mon", hour: "AM", load: 30 },
  { day: "Mon", hour: "PM", load: 65 },
  { day: "Tue", hour: "AM", load: 42 },
  { day: "Tue", hour: "PM", load: 80 },
]

// Each preset: the imperative Plot you'd write in a notebook, and the declarative
// spec the adapter consumes (the shape you'd pass to Plot.plot()).
const PRESETS = {
  "Multi-series line": {
    plotCode: `Plot.plot({
  marks: [
    Plot.lineY(data, { x: "week", y: "users", stroke: "plan" })
  ],
  color: { scheme: "tableau10" }
})`,
    spec: {
      marks: [{ type: "lineY", data: TREND, options: { x: "week", y: "users", stroke: "plan" } }],
      color: { scheme: "tableau10" },
    },
  },
  "Stacked bars": {
    plotCode: `Plot.plot({
  marks: [
    Plot.barY(data, { x: "month", y: "users", fill: "plan" })
  ]
})`,
    spec: {
      marks: [{ type: "barY", data: SERIES, options: { x: "month", y: "users", fill: "plan" } }],
    },
  },
  Scatter: {
    plotCode: `Plot.plot({
  marks: [
    Plot.dot(data, { x: "spend", y: "conv", fill: "channel" })
  ]
})`,
    spec: {
      marks: [{ type: "dot", data: POINTS, options: { x: "spend", y: "conv", fill: "channel" } }],
    },
  },
  "Heatmap (cell)": {
    plotCode: `Plot.plot({
  marks: [
    Plot.cell(data, { x: "hour", y: "day", fill: "load" })
  ]
})`,
    spec: {
      marks: [{ type: "cell", data: GRID, options: { x: "hour", y: "day", fill: "load" } }],
    },
  },
}

const CHART_COMPONENTS = {
  LineChart,
  BarChart,
  StackedBarChart,
  Scatterplot,
  AreaChart,
  StackedAreaChart,
  Heatmap,
}

const pretty = (v) => JSON.stringify(v, null, 2)

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
}

export default function ObservablePlotPage() {
  const [name, setName] = useState(Object.keys(PRESETS)[0])
  const preset = PRESETS[name]

  const config = useMemo(() => fromObservablePlot(preset.spec), [preset])
  const Chart = CHART_COMPONENTS[config.component]

  const description = useMemo(() => {
    try {
      return describeChart(config.component, config.props).text
    } catch {
      return null
    }
  }, [config])

  return (
    <PageLayout
      title="Observable Plot Adapter"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "Observable Plot Adapter", path: "/interoperability/observable-plot" },
      ]}
      prevPage={{ title: "Vega-Lite", path: "/interoperability/vega-lite" }}
      nextPage={{ title: "Mermaid Adapter", path: "/interoperability/mermaid" }}
    >
      <p>
        Observable Plot is the modern default for fast exploratory analysis in a notebook. The
        handoff from that notebook to a production app, though, is a known rewrite tax: the Plot
        chart was perfect for thinking, and now it has to be rebuilt as a styled, responsive,
        accessible component. <code>fromObservablePlot</code> — a sibling to the shipped{" "}
        <Link to="/interoperability/vega-lite">Vega-Lite translator</Link> — collapses that tax. It
        maps a Plot spec to a Semiotic <code>ChartConfig</code>, and the chart arrives carrying
        everything the throwaway version never had.
      </p>

      <h2>Why this matters</h2>
      <p>
        A chart sketched in a notebook is built for one reader who can see it and already knows the
        data. A chart in production is read by people on screen readers, by people on phones, by an
        agent summarizing the dashboard — none of whom the notebook chart ever considered. The
        expensive part of the rewrite was never the marks; it was re-acquiring the accessible table,
        the keyboard navigation, the description, the theme tokens, the SSR path. Semiotic already
        has all of that. So the adapter's job is narrow and high-leverage: translate the encoding
        faithfully, and let everything past the bare picture come along for free. That's the
        Land→Expand move made concrete — meet the analyst where they already work, then hand them
        the capabilities they'd otherwise rebuild.
      </p>

      <h2>From a Plot spec to an accessible component</h2>
      <p>
        Pick a chart you might have sketched in a notebook. The Plot spec on the left becomes the
        live, themed, accessible Semiotic chart on the right — same encoding, more capability.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {Object.keys(PRESETS).map((key) => (
          <button
            key={key}
            onClick={() => setName(key)}
            style={{
              padding: "5px 12px",
              borderRadius: 14,
              border: "1px solid var(--surface-3)",
              background: key === name ? "var(--accent)" : "var(--surface-2)",
              color: key === name ? "white" : "var(--text-primary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {key}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Observable Plot (notebook)
          </div>
          <CodeBlock language="js">{preset.plotCode}</CodeBlock>
        </div>
        <div style={panelStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Semiotic <code>{config.component}</code> (production)
          </div>
          {Chart ? <Chart {...config.props} height={260} width={365} /> : <em>Unsupported</em>}
        </div>
      </div>

      <div style={{ ...panelStyle, marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          The ChartConfig it compiled to
        </div>
        <CodeBlock language="json" wrap>
          {pretty({
            component: config.component,
            props: { ...config.props, data: `…${(config.props.data || []).length} rows` },
          })}
        </CodeBlock>
      </div>

      {description && (
        <div style={{ ...panelStyle, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            What it gained — a generated description (the notebook chart had none)
          </div>
          <p style={{ fontSize: 13, margin: 0, color: "var(--text-secondary)" }}>{description}</p>
        </div>
      )}

      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>
        Beyond the description: an accessible data table, keyboard navigation, a focus ring, theme
        tokens, annotation provenance, and an SSR render path — all from the same config, none of it
        in the original Plot chart.
      </p>

      <h2>Wiring it up</h2>
      <CodeBlock language="ts">
        {`import { unstable_fromObservablePlot } from "semiotic/experimental"
import { configToJSX } from "semiotic/ai"

// The declarative shape of a Plot spec — { marks, x, y, color, … }, each mark
// as { type, data?, options? }. (Plot's API is imperative JS; the adapter reads
// this declarative form.)
const config = unstable_fromObservablePlot({
  marks: [{ type: "lineY", data, options: { x: "month", y: "users", stroke: "plan" } }],
  color: { scheme: "tableau10" },
})

configToJSX(config)   // → "<LineChart data={…} xAccessor=\\"month\\" yAccessor=\\"users\\" lineBy=\\"plan\\" … />"`}
      </CodeBlock>

      <h2>Faithful, or it refuses</h2>
      <p>
        The honest hard part is that Plot's API is imperative JS, not declarative JSON, and some of
        it has no faithful Semiotic equivalent. Where that happens, the adapter warns instead of
        approximating — a function-valued channel can't be serialized; a layered multi-mark plot
        translates only its first data mark; a faceted plot is declined toward{" "}
        <code>LinkedCharts</code>. A 70%-faithful adapter that announces its 30% gap is an asset; a
        95%-faithful one that hides its 5% is a liability, because the failures are exactly where a
        non-expert reader and an LLM are both deceived. Every produced config is also checked to
        emit only props the schema knows, so it round-trips cleanly through <code>fromConfig</code>.
      </p>

      <h2>Where this goes</h2>
      <p>
        The notebook→production handoff is one instance of a general pattern: a chart authored in a
        fast, low-ceremony tool needs to graduate into a context with real readers. The same adapter
        shape serves a docs site embedding a notebook figure, a BI tool exporting an analyst's
        exploration, or an agent that drafts in Plot and ships in React. In each case the
        translation is the cheap part; the capabilities the destination demands are the value.
      </p>

      <h2>Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/vega-lite">Vega-Lite Translator</Link> — the stable sibling
          adapter this is modeled on.
        </li>
        <li>
          <Link to="/interoperability/portability-spec">Portability Spec</Link> — carrying
          capability and provenance metadata across tools.
        </li>
        <li>
          <Link to="/accessibility/overview">Accessibility</Link> — the table, nav, and description
          a translated chart inherits.
        </li>
      </ul>
    </PageLayout>
  )
}
