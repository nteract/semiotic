import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { LineChart } from "semiotic/line"
import { StackedBarChart } from "semiotic/ordinal"
import { unstable_fromObservablePlot as fromObservablePlot } from "semiotic/experimental"

// ---------------------------------------------------------------------------
// Demo data + two Plot specs a notebook might produce
// ---------------------------------------------------------------------------

// Categorical x (month) for the bars; continuous x (week) for the line — a
// line chart needs a continuous x scale, not category labels.
const SERIES = [
  { month: "Jan", users: 240, plan: "Free" },
  { month: "Feb", users: 312, plan: "Free" },
  { month: "Mar", users: 287, plan: "Free" },
  { month: "Jan", users: 90, plan: "Pro" },
  { month: "Feb", users: 140, plan: "Pro" },
  { month: "Mar", users: 210, plan: "Pro" },
]

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

const SPECS = {
  "Multi-series line": {
    plotCode: `Plot.lineY(data, { x: "week", y: "users", stroke: "plan" }).plot({ color: { scheme: "tableau10" } })`,
    spec: {
      marks: [{ type: "lineY", data: TREND, options: { x: "week", y: "users", stroke: "plan" } }],
      color: { scheme: "tableau10" },
    },
  },
  "Stacked bars": {
    plotCode: `Plot.barY(data, { x: "month", y: "users", fill: "plan" }).plot()`,
    spec: {
      marks: [{ type: "barY", data: SERIES, options: { x: "month", y: "users", fill: "plan" } }],
    },
  },
}

const COMPONENTS = { LineChart, StackedBarChart }

const chartFrame = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 12,
  margin: "20px 0",
  background: "var(--surface-1)",
}

const preStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: "14px 16px",
  overflowX: "auto",
  fontSize: 13,
  lineHeight: 1.5,
  margin: "16px 0",
}

function Demo() {
  const [key, setKey] = useState(Object.keys(SPECS)[0])
  const config = useMemo(() => fromObservablePlot(SPECS[key].spec), [key])
  const Chart = COMPONENTS[config.component]
  return (
    <div style={chartFrame}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {Object.keys(SPECS).map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            aria-pressed={k === key}
            style={{
              padding: "5px 12px",
              borderRadius: 14,
              border: "1px solid var(--surface-3)",
              background: k === key ? "var(--accent)" : "var(--surface-2)",
              color: k === key ? "white" : "var(--text-primary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          fontFamily: "var(--font-code)",
          marginBottom: 8,
        }}
      >
        {SPECS[key].plotCode}
      </div>
      {Chart ? (
        <Chart
          {...config.props}
          responsiveWidth
          height={260}
          title={key === "Multi-series line" ? "Weekly users by plan" : "Monthly users by plan"}
          description="Synthetic Free and Pro plan counts. Compare the labeled series or read their exact values in the table."
          summary={
            key === "Multi-series line"
              ? "Free rises from 240 to 360; Pro rises from 90 to 280."
              : "Monthly totals rise from 330 in January to 452 in February and 497 in March."
          }
          accessibleTable
        />
      ) : null}
      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 6px 0" }}>
        The notation above corresponds to the plain-object input used in this demo. The adapter
        returns a <code>{config.component}</code> configuration; this page adds its title,
        description, summary, and exact-value table.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function Body() {
  return (
    <>
      <p>
        You have found a useful pattern in a notebook. Now the chart needs to live in a React
        application, match its theme, fit a phone, and explain itself to a new reader.
        <code> unstable_fromObservablePlot</code> can carry a supported Plot-style specification
        across that boundary, leaving you to review the translation and add the context.
      </p>
      <h2 id="why-care">Why this matters</h2>
      <p>
        The expensive part of a handoff is remembering the decisions behind the picture. Which
        column identifies a series? Are the bars stacked? Does the horizontal axis represent time or
        categories? Translating those choices into an inspectable configuration gives the next
        author something concrete to check.
      </p>
      <h2 id="demo">Two questions, two charts</h2>
      <p>
        Choose Multi-series line to compare weekly growth in two plans. Follow each line from week 1
        to week 4; Free stays higher, while Pro also grows. Choose Stacked bars to compare monthly
        totals and the contribution of each plan. These are separate synthetic examples, so a week
        on the line is not a month in the bars.
      </p>
      <Demo />
      <h2 id="how-it-works">What the adapter actually accepts</h2>
      <p>
        The input is a plain object describing marks, data, and channels. It is not an arbitrary
        <code> Plot.plot()</code> result, a rendered SVG, or a JavaScript program to execute. A{" "}
        <code>lineY</code> mark with a numeric week field becomes a <code>LineChart</code>; a{" "}
        <code>barY</code> mark with a fill field can become a <code>StackedBarChart</code>.
      </p>
      <p>
        Translation warnings are part of the result. Multiple data marks may be reduced to the first
        one, facets are not reconstructed, and function-valued channels are not preserved. Some
        unsupported input can still return a partial configuration. A warning therefore needs a
        decision from the caller; it is not an automatic refusal to render.
      </p>
      <h2 id="when">When to reach for it</h2>
      <p>
        Use it for a supported chart whose field mappings you can inspect. Keep a complex Plot
        composition in Plot when its custom marks, transforms, or facets are the point. For a
        translation you keep, author a title and summary, enable the exact-value table, and test the
        keyboard and small-screen experience. Translation does not write that explanation or add a{" "}
        <Link to="/accessibility/navigation">navigation tree</Link> for you.
      </p>
      <h2 id="wiring">Wiring it up</h2>
      <pre style={preStyle}>{`import { unstable_fromObservablePlot } from "semiotic/experimental"

const config = unstable_fromObservablePlot({
  marks: [{ type: "lineY", data,
    options: { x: "week", y: "users", stroke: "plan" } }],
})
if (config.warnings?.length) {
  // Show the warnings and resolve the unsupported parts before rendering.
}`}</pre>
      <p>
        The adapter uses an experimental entry point, so pin the package version and keep a
        representative translation in your tests. The reference page lists the supported marks and
        the shape of the returned configuration.
      </p>
      <h2 id="other-domains">Other places this helps</h2>
      <p>
        The same review applies when a notebook figure enters a report, an analyst hands a chart to
        a product team, or an assistant proposes a chart in another grammar. Preserve the question
        and encoding, then check the destination's reading experience.
      </p>
      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/observable-plot">Observable Plot adapter</Link>
        </li>
        <li>
          <Link to="/interoperability/vega-lite">Vega-Lite translator</Link>
        </li>
        <li>
          <Link to="/features/chart-container">ChartContainer reading tools</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "notebook-to-production",
  title: "From Notebook to Production, Without the Rewrite",
  subtitle:
    "Carry a supported Plot-style specification into React, then review the translation and add the explanation your readers need.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study", "xy"],
  excerpt:
    "A notebook chart already contains useful choices about fields, series, and comparison. Try two translations, learn how to read them, and see where warnings require an author’s judgment.",
  component: Body,
  ogChart: { component: "LineChart" },
}
