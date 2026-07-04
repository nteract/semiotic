/* eslint-disable react/no-unescaped-entities */
import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { LineChart, StackedBarChart } from "semiotic"
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
            style={{
              padding: "5px 12px",
              borderRadius: 14,
              border: "1px solid var(--surface-3)",
              background: k === key ? "var(--accent)" : "var(--surface-2)",
              color: k === key ? "white" : "var(--text)",
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
          color: "var(--text-2)",
          fontFamily: "var(--font-code)",
          marginBottom: 8,
        }}
      >
        {SPECS[key].plotCode}
      </div>
      {Chart ? <Chart {...config.props} width={560} height={260} /> : null}
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "6px 6px 0" }}>
        The Plot one-liner above, translated to a Semiotic <code>{config.component}</code> that
        ships with a data table, keyboard nav, a description, theme tokens, and SSR.
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
        Observable Plot is the fastest way to think with data in a notebook. The moment that
        thinking has to become a product, though, you hit the notebook→production rewrite tax: the
        chart that was perfect for exploring now has to be rebuilt as a styled, responsive,
        accessible component. Semiotic's new
        <code> fromObservablePlot</code> adapter collapses that tax — it maps a Plot spec to a
        Semiotic chart, and the chart arrives with everything the throwaway version never had.
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        A notebook chart is built for one reader who can see it and already knows the data. A
        production chart is read by someone on a screen reader, someone on a phone, an agent
        summarizing a dashboard — none of whom the notebook chart ever considered. And the expensive
        part of the rewrite was never drawing the marks again; it was re-acquiring the accessible
        table, the keyboard navigation, the generated description, the theme tokens, the
        server-render path. Semiotic already ships all of that. So the adapter's job is narrow and
        high-leverage: translate the encoding faithfully, and let everything past the bare picture
        come along for free.
      </p>

      <h2 id="demo">The same chart, more capability</h2>
      <Demo />

      <pre style={preStyle}>{`import { unstable_fromObservablePlot } from "semiotic/experimental"

const config = unstable_fromObservablePlot({
  marks: [{ type: "lineY", data, options: { x: "month", y: "users", stroke: "plan" } }],
  color: { scheme: "tableau10" },
})
// → { component: "LineChart", props: { xAccessor: "month", yAccessor: "users",
//      lineBy: "plan", colorScheme: "category10", data } }`}</pre>

      <h2 id="faithful">Faithful, or it refuses</h2>
      <p>
        The honest hard part — and the reason it ships behind an <code>unstable_</code> prefix for
        now — is that Plot's API is imperative JavaScript, not declarative JSON. Some of it has no
        faithful Semiotic equivalent, and where that happens the adapter{" "}
        <em>warns instead of approximating</em>: a function-valued channel can't be serialized, a
        layered multi-mark plot translates only its first data mark, a faceted plot is pointed at{" "}
        <code>LinkedCharts</code>. A 70%-faithful adapter that announces its 30% gap is an asset; a
        95%-faithful one that hides its 5% is a liability, because the failures are exactly where a
        non-expert reader and an LLM both get deceived. Every config it does produce is checked to
        emit only props the schema knows, so it round-trips cleanly.
      </p>

      <h2 id="when">When to reach for it</h2>
      <p>
        Reach for it at the notebook→app boundary: you explored in Plot, the result is going into a
        React product, and you don't want to hand-rebuild the chart or its accessibility. Reach for
        it when an agent drafts in Plot and ships in Semiotic. Don't reach for it to reproduce an
        exotic Plot composition pixel-for-pixel — it translates standard statistical charts and
        tells you, out loud, when it can't.
      </p>

      <h2 id="where-this-goes">Where this goes</h2>
      <p>
        The notebook handoff is one instance of a general pattern: a chart authored in a fast,
        low-ceremony tool has to graduate into a context with real readers. The same adapter shape
        serves a docs site embedding a figure, a BI tool exporting an analyst's exploration, an
        agent that drafts in one grammar and ships in another. The translation is the cheap part;
        the capabilities the destination demands are the value — and a sibling adapter,{" "}
        <Link to="/interoperability/vega-lite">fromVegaLite</Link>, already does the same for
        Vega-Lite.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/observable-plot">Observable Plot Adapter</Link> — the
          interactive page with the full mark coverage and the description a translated chart gains.
        </li>
        <li>
          <Link to="/interoperability/vega-lite">Vega-Lite Translator</Link> — the stable sibling
          this is modeled on.
        </li>
        <li>
          <Link to="/interoperability/portability-spec">Portability Spec</Link> — carrying
          capability and provenance metadata across tools.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "notebook-to-production",
  title: "From Notebook to Production, Without the Rewrite",
  subtitle:
    "fromObservablePlot maps an Observable Plot spec to a Semiotic chart, so a chart sketched in a notebook crosses the production boundary carrying the accessible table, keyboard nav, description, theme tokens, and SSR it never had — and refuses, out loud, what it can't translate faithfully.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study", "xy"],
  excerpt:
    "Observable Plot is the fastest way to think with data; the rewrite into a production component is the tax. The new fromObservablePlot adapter collapses it — translate the encoding, inherit the accessibility, theming, and SSR Semiotic already ships — while warning rather than approximating where Plot's imperative API has no faithful equivalent.",
  component: Body,
  ogChart: { component: "LineChart" },
  draft: true,
}
