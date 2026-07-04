/* eslint-disable react/no-unescaped-entities */
import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AreaChart,
  BarChart,
  BoxPlot,
  ConnectedScatterplot,
  DonutChart,
  DotPlot,
  Histogram,
  LineChart,
  MultiAxisLineChart,
  PieChart,
  Scatterplot,
  StackedAreaChart,
  StackedBarChart,
  SwarmPlot,
  ViolinPlot,
  DifferenceChart,
} from "semiotic"
import {
  executivePersona,
  dataScientistPersona,
  inferIntent,
  suggestCharts,
  suggestStretchCharts,
} from "semiotic/ai"

// ─── Styling shared with the rest of the blog ───
const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  overflow: "hidden",
  margin: "20px 0",
}

const playgroundFrame = {
  ...chartFrame,
  padding: 20,
}

const controlsRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "flex-end",
  marginBottom: 16,
}

const controlGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  minWidth: 160,
}

const labelStyle = {
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: 10,
  color: "var(--text-secondary)",
  fontWeight: 700,
}

const selectStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid var(--surface-3)",
  background: "var(--background)",
  color: "var(--text)",
  fontSize: 13,
}

const inputStyle = {
  ...selectStyle,
  width: "100%",
}

const intentBadge = {
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 999,
  background: "var(--accent)",
  color: "white",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
}

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
}

const suggestionCard = {
  background: "var(--background)",
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const stretchCard = {
  ...suggestionCard,
  background: "linear-gradient(180deg, rgba(123,97,255,0.08), transparent)",
  border: "1px solid rgba(123,97,255,0.35)",
}

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 12,
  fontWeight: 700,
}

const sectionLabel = {
  ...labelStyle,
  marginTop: 24,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 8,
}

const stretchLabel = {
  ...sectionLabel,
  color: "rgb(123,97,255)",
}

// ─── Sample datasets the playground rotates through ───
const SAMPLE_DATASETS = {
  "Quarterly revenue by region": Array.from({ length: 24 }, (_, i) => {
    const region = ["EU", "NA", "APAC"][i % 3]
    const quarter = Math.floor(i / 3) + 1
    const revenue = 800 + i * 60 + Math.sin(i / 2) * 90
    return {
      quarter,
      revenue,
      profit: revenue - Math.random() * revenue * 0.9,
      region,
    }
  }),
  "Product sales": [
    { product: "Widget", units: 480 },
    { product: "Gadget", units: 620 },
    { product: "Sprocket", units: 290 },
    { product: "Whatsit", units: 740 },
    { product: "Doohickey", units: 410 },
  ],
  "Survey ratings by cohort": Array.from({ length: 150 }, (_, i) => ({
    respondent: Math.max(1, Math.min(10, 6 + Math.sin((i % 5) / 7) * 2 + Math.random() * 3 - 1)),
    satisfaction: ((i % 3) + 1) * Math.random(),
    cohort: ["Beta", "GA", "Enterprise"][i % 3],
  })),
}

// Aggregated single-series time series for the fixed example: one row per
// quarter, two correlated numerics (revenue, profit). Picked specifically
// so the engine produces a canonical ConnectedScatterplot revenue on x,
// profit on y, quarter as the order axis when given correlation intent.
const QUARTERLY_KPIS = Array.from({ length: 8 }, (_, i) => {
  const quarter = i + 1
  const revenue = 2400 + i * 220 + Math.sin(i / 2) * 180
  return {
    quarter,
    revenue,
    profit: revenue * (0.16 + i * 0.015) + Math.cos(i / 2) * 60,
  }
})

// Map Suggestion.component → renderable React component. Limited to the
// HOCs this post's sample datasets can produce keeps the bundle tight.
const COMPONENT_MAP = {
  LineChart,
  AreaChart,
  StackedAreaChart,
  Scatterplot,
  ConnectedScatterplot,
  BarChart,
  StackedBarChart,
  DotPlot,
  PieChart,
  DonutChart,
  Histogram,
  BoxPlot,
  ViolinPlot,
  SwarmPlot,
  MultiAxisLineChart,
  DifferenceChart,
}

const AUDIENCES = {
  Default: undefined,
  Executive: executivePersona,
  "Data scientist": dataScientistPersona,
}

// Primary-mode chart defaults assume a 600×400 canvas, so their built-in
// margin (~70/60/50/40) eats most of a small preview tile. Override top/left/
// right with compact values; leave bottom unset so the chart's legend-aware
// auto-reserve (80px for bottom legend) still kicks in.
const PREVIEW_MARGIN = { top: 16, left: 40, right: 16 }

function renderSuggestion(suggestion, width = 280, height = 220) {
  const Component = COMPONENT_MAP[suggestion.component]
  if (!Component) {
    return (
      <div style={{ fontSize: 11, color: "var(--text-secondary)", padding: 12 }}>
        {suggestion.component} - preview not embedded
      </div>
    )
  }
  return (
    <Component
      {...suggestion.props}
      width={width}
      height={height}
      margin={PREVIEW_MARGIN}
      legendPosition="bottom"
      responsiveWidth={true}
      animate={false}
      accessibleTable={false}
    />
  )
}

// ─── Fixed before-playground example ───
// One dataset, two intents, two ranked answers each with the verbatim
// reasons string the engine emits. This is the "audit trail" claim made
// concrete before the freeform playground.
const FIXED_INTENTS = [
  {
    intent: "trend",
    question: '"how is revenue moving over time?"',
  },
  {
    intent: "correlation",
    question: '"how do revenue and profit move together?"',
  },
]

function SameDataDifferentIntent() {
  const data = QUARTERLY_KPIS
  const picks = useMemo(
    () =>
      FIXED_INTENTS.map(({ intent, question }) => ({
        intent,
        question,
        suggestion: suggestCharts(data, { intent, maxResults: 1, includeVariants: false })[0],
      })),
    [data],
  )

  return (
    <div style={chartFrame}>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        Same dataset (eight quarters of revenue and profit), two different questions, two different
        chart picks. The <code>reasons</code> string below each chart is what the engine emitted
        same string the LLM, the logs, and a snapshot test would see.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {picks.map(({ intent, question, suggestion }) =>
          suggestion ? (
            <div key={intent} style={suggestionCard}>
              <div style={cardHeader}>
                <span style={intentBadge}>intent: {intent}</span>
                <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                  → {suggestion.component}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                }}
              >
                {question}
              </div>
              <div style={{ minHeight: 220 }}>{renderSuggestion(suggestion)}</div>
              {suggestion.reasons.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.4 }}>
                  <strong>reasons:</strong> {suggestion.reasons.slice(0, 2).join("; ")}
                </div>
              )}
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}

function Playground() {
  const [datasetName, setDatasetName] = useState("Quarterly revenue by region")
  const [audienceName, setAudienceName] = useState("Default")
  const [query, setQuery] = useState("show me the trend")

  const data = SAMPLE_DATASETS[datasetName]
  const audience = AUDIENCES[audienceName]
  const inferred = useMemo(() => inferIntent(query), [query])
  const intent = inferred?.intent

  const top = useMemo(
    () =>
      suggestCharts(data, {
        intent,
        audience,
        maxResults: 3,
        includeVariants: false,
      }),
    [data, intent, audience],
  )

  const stretches = useMemo(
    () =>
      audience
        ? suggestStretchCharts(data, {
            audience,
            intent,
            maxResults: 3,
          })
        : [],
    [data, intent, audience],
  )

  return (
    <div style={playgroundFrame}>
      <div style={controlsRow}>
        <div style={controlGroup}>
          <span style={labelStyle}>Dataset</span>
          <select
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            style={selectStyle}
          >
            {Object.keys(SAMPLE_DATASETS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div style={controlGroup}>
          <span style={labelStyle}>Audience</span>
          <select
            value={audienceName}
            onChange={(e) => setAudienceName(e.target.value)}
            style={selectStyle}
          >
            {Object.keys(AUDIENCES).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ ...controlGroup, flex: 1, minWidth: 240 }}>
          <span style={labelStyle}>Type a question</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "how is the distribution" or "which is biggest"'
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
        {intent ? (
          <>
            <span style={intentBadge}>intent: {intent}</span>
            <span style={{ marginLeft: 10 }}>
              detected by <code>inferIntent</code> from your question.
            </span>
          </>
        ) : (
          <em>
            Type a phrase like "trend over time", "which is biggest", "show the distribution", or
            "is there a correlation&quot; and <code>inferIntent</code> will classify it.
          </em>
        )}
      </div>

      <div style={sectionLabel}>
        <span>★</span> Top picks
        {audience ? (
          <span
            style={{
              color: "var(--text-secondary)",
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            (familiar to {audienceName.toLowerCase()})
          </span>
        ) : null}
      </div>
      <div style={cardGrid}>
        {top.length === 0 && (
          <div
            style={{
              padding: 16,
              border: "1px dashed var(--surface-3)",
              borderRadius: 8,
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            No charts fit this dataset for that intent. Try a different question or audience.
          </div>
        )}
        {top.map((s) => (
          <div key={`${s.component}-${s.variant?.key ?? "base"}`} style={suggestionCard}>
            <div style={cardHeader}>
              <span>{s.component}</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                {s.score.toFixed(1)}/5 · fam {s.rubric.familiarity}
              </span>
            </div>
            <div style={{ minHeight: 220 }}>{renderSuggestion(s)}</div>
            {s.reasons.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {s.reasons.slice(0, 2).join("; ")}
              </div>
            )}
            {s.caveats.length > 0 && (
              <div style={{ fontSize: 11, color: "#c2410c", lineHeight: 1.4 }}>
                ⚠ {s.caveats[0]}
              </div>
            )}
          </div>
        ))}
      </div>

      {stretches.length > 0 && (
        <>
          <div style={stretchLabel}>
            <span>🎓</span> Stretch your literacy
            <span
              style={{
                color: "var(--text-secondary)",
                fontWeight: 400,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              (charts {audienceName.toLowerCase()} doesn't use often, but the data supports)
            </span>
          </div>
          <div style={cardGrid}>
            {stretches.map((s) => (
              <div key={`stretch-${s.suggestion.component}`} style={stretchCard}>
                <div style={cardHeader}>
                  <span>{s.suggestion.component}</span>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                    fam {s.familiarity}/5
                    {s.replacing ? ` · vs ${s.replacing}` : ""}
                  </span>
                </div>
                <div style={{ minHeight: 220 }}>{renderSuggestion(s.suggestion)}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text)",
                    lineHeight: 1.4,
                    fontStyle: "italic",
                  }}
                >
                  {s.rationale}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Chart libraries have historically been told <em>how</em> to render: props in, pixels out.
        Picking <em>which</em> chart to render is someone else's problem: a designer, a BI tool, the
        user, now very often an LLM. Semiotic 3.6.0 shipped a different approach: every chart now
        knows <strong>what data shapes it serves</strong>,{" "}
        <strong>which questions it answers well</strong>, and{" "}
        <strong>how settings change those answers</strong>. Apply a profile of your data and you get
        a ranked list of charts, each with a config and an auditable reason for that chart. Pair it
        with a <em>profile of your audience</em> and the ranking calibrates to the needs of who is
        actually reading.
      </p>

      <h2 id="why-care">Why a recommendation engine, and why now</h2>
      <p>
        "What chart should I use?" has been answered three ways for the last decade, and none of
        them have landed well:
      </p>
      <ul>
        <li>
          <strong>Statistical heuristics</strong> (Voyager, Lux, Vega-Lite's auto-encodings). Picks
          "interesting" axes through statistical tests. Doesn't model human comprehension and
          doesn't recognize that the <em>same chart with different settings</em> answers different
          questions. They are also so tightly wed to libraries with just a handful of charts that
          they completely ignore the value of increasing data literacy through exposure.
        </li>
        <li>
          <strong>Let the LLM decide</strong>. Plausible-looking recommendations, occasionally
          correct, no offline mode, no diagnostic surface, no way to disagree without rewriting the
          prompt.
        </li>
        <li>
          <strong>Schema lookup</strong>. Tells you what's <em>valid</em> ("LineChart needs
          xAccessor + yAccessor") but says nothing about whether a line chart is the right answer
          for what you're trying to show.
        </li>
      </ul>
      <p>
        The new layer takes a fourth position:{" "}
        <strong>
          charts know what they're good for, and we make that knowledge inspectable, composable, and
          overridable
        </strong>
        . The output is an ordinary array of suggestions you can render, log, snapshot-test, diff
        against a previous version, or hand to an LLM as structured context. The engine never calls
        an LLM itself; an LLM can sit on top of the engine but can't replace it.
      </p>

      <h2 id="same-data-different-question">Same data, different question, different chart</h2>
      <p>
        Concretely, here's what "auditable reason" buys you. One quarterly-revenue-by-region
        dataset, fed through <code>suggestCharts</code> twice with different intents. The component
        the engine picks changes, the props it emits change, and the <code>reasons</code> string
        explains why. This is the same output string an LLM or a snapshot test or a log line would
        consume. This is a key point: The things we build for human users like aggregations and
        hints and suggestions are useful for AI and vice versa but also are useful for traditional
        observability and analytics.
      </p>
      <SameDataDifferentIntent />

      <h2 id="playground">A playground for the impatient</h2>
      <p>
        That fixed example only scratches the surface. Pick a dataset, pick an audience, type a
        natural-language question. Each change re-ranks the suggestions live. The "stretch your
        literacy" row shows charts the audience is unfamiliar with but the data actually supports
        and only appears when you've selected an audience that has growth targets.
      </p>
      <Playground />
      <p>
        Notice what changes as you switch audience: under <em>Executive</em>, BoxPlot and ViolinPlot
        drop out of the top picks even when the data favors them, because the descriptor's{" "}
        <code>rubric.familiarity</code> for those charts has been replaced by the executive
        profile's familiarity number ("not familiar"). The same charts then surface in the stretch
        row alongside the rationale "growing distribution literacy" and labeled as opt-in, not
        pushed as defaults. Under <em>Data scientist</em>, the same charts move <em>up</em>
        the main ranking, and PieChart drops because the persona ships a decrease target.
      </p>

      <h2 id="three-primitives">Three primitives compose the whole thing</h2>
      <p>
        The runtime entry points are all in <code>semiotic/ai</code>. They share the same data
        contract (rows in, structured suggestions out) so consumers can pick which surface fits
        their UI.
      </p>
      <h3 id="suggest-charts">suggestCharts - ranked single recommendations</h3>
      <p>Given a dataset and an optional intent, returns the top-ranked charts that fit.</p>
      <pre style={chartFrame}>
        {`import { suggestCharts } from "semiotic/ai"

const suggestions = suggestCharts(data, { intent: "trend" })
// → [
//   { component: "LineChart", variant: { key: "smooth" },
//     score: 4.8, intentScores: { trend: 5, "compare-series": 4, ... },
//     rubric: { familiarity: 5, accuracy: 4, precision: 4 },
//     reasons: ["Strong fit for trend (5/5)", "x = month, y = revenue"],
//     caveats: [],
//     props: { data, xAccessor: "month", yAccessor: "revenue" }
//   },
//   { component: "AreaChart", ... },
// ]`}
      </pre>
      <p>
        Every suggestion has a runnable <code>props</code> object. Drop it into the matching chart
        and it renders. No second pass to derive accessors from the profile.
      </p>

      <h3 id="suggest-dashboard">suggestDashboard - composite, multi-intent views</h3>
      <p>
        Given a dataset, return a set of complementary panels each covering a distinct analytical
        intent, diversified by chart family by default. The "show me a dashboard" function call.
      </p>
      <pre style={chartFrame}>
        {`import { suggestDashboard } from "semiotic/ai"

const { panels, intentsCovered, intentsMissing, stretchPanels } =
  suggestDashboard(data, { maxPanels: 6 })

// panels: [
//   { intent: "trend", suggestion: { component: "LineChart", ... } },
//   { intent: "rank", suggestion: { component: "BarChart", ... } },
//   { intent: "distribution", suggestion: { component: "BoxPlot", ... } },
//   ...
// ]
// intentsMissing: ["geo"]   // honest about what the data can't show`}
      </pre>
      <p>
        Intents the dataset can't honestly cover land in <code>intentsMissing</code> rather than
        getting a forced low-scoring suggestion. Better to say "this data doesn't support geo" than
        to ship a misleading map.
      </p>

      <h3 id="interrogation">useChartInterrogation - the chat surface</h3>
      <p>
        A headless React hook that lets users ask natural-language questions about a chart and get
        back annotations the chart can render. Bring your own LLM via the <code>onQuery</code>{" "}
        callback; the hook supplies the LLM with the same structured suggestion context as the
        library APIs.
      </p>
      <pre style={chartFrame}>
        {`import { useChartInterrogation } from "semiotic/ai"

const { ask, history, annotations, loading } = useChartInterrogation({
  data,
  componentName: "LineChart",
  props: { xAccessor: "month", yAccessor: "revenue" },
  includeSuggestions: true,      // engine context lands in onQuery
  onQuery: async (query, ctx) => {
    // ctx.summary, ctx.profile, ctx.suggestions are all there
    const response = await callYourLLM({
      question: query,
      summary: ctx.summary,
      alternatives: ctx.suggestions,
    })
    return { answer: response.text, annotations: response.highlights }
  },
})

return (
  <>
    <LineChart {...props} annotations={annotations} />
    <YourChatUI history={history} loading={loading} onAsk={ask} />
  </>
)`}
      </pre>

      <h2 id="audience-layer">The audience layer - where this gets interesting</h2>
      <p>
        Every chart's descriptor carries a <code>rubric.familiarity</code> number (1 - 5). That
        number has always been a guess at "what a generic data-literate reader recognizes." In
        practice it's nonsense. A quant fund and a marketing org have completely different
        familiarity baselines. So 3.6.0 adds <strong>AudienceProfile</strong>: a serializable
        artifact your organization produces (through surveys, telemetry, training records, manager
        judgment) and the library consumes:
      </p>
      <pre style={chartFrame}>
        {`const acmeFinanceTeam = {
  name: "Acme Finance",
  familiarity: {
    BarChart: 5, LineChart: 5, PieChart: 5, Histogram: 4,
    BoxPlot: 2, ViolinPlot: 1, Heatmap: 3,
    // ...anything not listed falls back to the descriptor default
  },
  targets: {
    PieChart: {
      direction: "decrease",
      weight: 1,
      reason: "moving from share-by-angle to share-by-length for accuracy",
    },
    BoxPlot: {
      direction: "increase",
      weight: 2,
      reason: "we want the team reading distributions, not just means",
    },
  },
  exposureLevel: 1,  // include stretch picks in a separate surface
}

suggestCharts(data, { audience: acmeFinanceTeam, intent: "rank" })
suggestDashboard(data, { audience: acmeFinanceTeam })
suggestStretchCharts(data, { audience: acmeFinanceTeam })`}
      </pre>
      <p>
        The library does not <em>measure</em> familiarity. That's not its job and it would tempt
        feature creep that's hostile to embedded use. Your organization owns the measurement using
        whatever survey, telemetry, or judgment tool produced the numbers and the library consumes
        the result as data.
      </p>
      <p>
        The bias is meaningful, not cosmetic. A target with weight 2 adds <code>±2.0</code> to the
        chart's composite score, on a scale that normally tops out around 5. Strong enough to
        reorder rankings; small enough that a clearly-wrong chart still loses on data fit. When a
        target fires, the suggestion's <code>reasons[]</code> gains the verbatim rationale string so
        the audience's policy is visible in the UI:{" "}
        <em>"Acme Finance: we want the team reading distributions, not just means."</em>
      </p>

      <h3 id="stretch-picks">Stretch picks - the "yes, and" of data visualization</h3>
      <p>
        You should always give your stakeholders what they want but you can build literacy by giving
        them more complex charts alongside it. This is the literacy-growth mechanic the audience
        layer enables. <code>suggestStretchCharts(data, &#123; audience &#125;)</code> returns
        charts where:
      </p>
      <ol>
        <li>
          The data actually supports it (the chart's <code>fits()</code> gate passes).
        </li>
        <li>The audience's effective familiarity is at or below 3.</li>
        <li>
          Either the audience has flagged it as an <em>increase</em> target, OR its score is within
          reach of the top familiar pick.
        </li>
      </ol>
      <p>
        Each stretch carries a <code>replacing</code> field (which familiar chart it could
        substitute for) and a <code>rationale</code> string. If you render them in their own labeled
        surface, not inline with the default recommendations, then the user gets to see "here's what
        you'd normally pick" alongside "here's a vocabulary expansion opportunity." The playground
        above splits them into two rows for exactly this reason.
      </p>
      <p>
        We deliberately did not collapse stretches into the main ranking. A stretch pick is{" "}
        <em>intentionally not</em> the best familiar choice so surfacing it as "the recommendation"
        would mislead. But it is a viable option that a team or organization might find useful to
        deploy for other reasons in place of the higher-ranked chart.
      </p>

      <h2 id="when-to-reach">When to reach for this, and when not</h2>
      <p>
        <strong>Reach for it</strong> when:
      </p>
      <ul>
        <li>
          You're building any UI that needs to answer "what chart should I use?" (including
          chart-picker dropdowns, dashboard generators, AI assistant plumbing, or any internal-tools
          surface where the user knows their data shape but not the canonical rendering).
        </li>
        <li>
          You want recommendations that work without an LLM <em>and</em> get richer with one. The
          structured context (reasons, caveats, profile, intent scores) is straight prompt input.
        </li>
        <li>
          You're shipping the library to a specific audience whose chart literacy is meaningfully
          different from "generic data-literate user" such as the executive view of an enterprise
          dashboard, a scientific notebook environment, or a teaching tool for students.
        </li>
        <li>
          You want to nudge audience adoption toward more analytically appropriate charts over time.
          The stretch surface gives you a place to surface charts you'd like to see used more,
          without forcing them into defaults. This is key. Your organization might only be
          comfortable with a few charts but you are failing them if you do not help them to grow
          their data visualization literacy further by exposing them to the new patterns (and
          therefore new opportunities) that other charts afford.
        </li>
      </ul>
      <p>
        <strong>Don't reach for it</strong> when:
      </p>
      <ul>
        <li>
          You already know exactly what chart you want. The suggestion engine is for <em>open</em>{" "}
          questions; if you've decided on a BarChart, just render a BarChart.
        </li>
        <li>
          Your data shape doesn't change. The engine's value is recomputing recommendations across
          different data; on a static fixture, you can hardcode the answer.
        </li>
        <li>
          You'd be tempted to use it as a wrapper that replaces user choice. The point of the
          stretch surface is that the user sees both. A default-only recommender that hides the
          familiar pick is the wrong shape.
        </li>
      </ul>

      <h2 id="wiring">Wiring it up</h2>
      <h3 id="wiring-single">Single recommendation</h3>
      <pre style={chartFrame}>
        {`import { suggestCharts, LineChart, BarChart, /* ... */ } from "semiotic/ai"

const COMPONENT_MAP = { LineChart, BarChart, /* ... */ }

function SuggestedChart({ data, intent }) {
  const [top] = suggestCharts(data, { intent, maxResults: 1 })
  if (!top) return <p>No fitting chart.</p>
  const Component = COMPONENT_MAP[top.component]
  return <Component {...top.props} />
}`}
      </pre>

      <h3 id="wiring-dashboard">Dashboard mode</h3>
      <pre style={chartFrame}>
        {`function GeneratedDashboard({ data, audience }) {
  const { panels, intentsMissing, stretchPanels } = suggestDashboard(data, { audience })
  return (
    <>
      <div className="grid">
        {panels.map(({ intent, suggestion }) => {
          const Component = COMPONENT_MAP[suggestion.component]
          return (
            <Panel key={intent} title={intent}>
              <Component {...suggestion.props} />
            </Panel>
          )
        })}
      </div>
      {stretchPanels.length > 0 && (
        <StretchRow stretches={stretchPanels} audience={audience} />
      )}
      {intentsMissing.length > 0 && (
        <p>Not covered: {intentsMissing.join(", ")}</p>
      )}
    </>
  )
}`}
      </pre>

      <h3 id="wiring-nl">Natural-language intent inference</h3>
      <pre style={chartFrame}>
        {`import { inferIntent, suggestCharts } from "semiotic/ai"

function AskTheData({ data, question }) {
  const inferred = inferIntent(question)
  const top = suggestCharts(data, { intent: inferred?.intent, maxResults: 1 })[0]
  if (!top) return null
  const Component = COMPONENT_MAP[top.component]
  return (
    <>
      <p>Detected intent: <code>{inferred?.intent ?? "(none)"}</code></p>
      <Component {...top.props} />
    </>
  )
}`}
      </pre>
      <p>
        <code>inferIntent</code> is a zero-dependency regex-pattern heuristic. It never calls out.
        Wraps cleanly with an LLM-backed alternative if your audience uses jargon the defaults don't
        cover.
      </p>

      <h2 id="elsewhere">Where this pattern shows up next</h2>
      <p>Three near-term applications stand out:</p>
      <ul>
        <li>
          <strong>Authoring assistants.</strong> A natural-language chart editor sitting on top of
          the engine. User types "compare regions over time"; the editor uses{" "}
          <code>inferIntent</code> + <code>suggestCharts</code> to produce a starting config, and
          the user iterates.
        </li>
        <li>
          <strong>Auto-dashboards.</strong> <code>suggestDashboard</code> + a templated panel
          renderer = "drop in a CSV, get a sensible dashboard." Pair with audience profiles and the
          dashboard adapts to who's logged in.
        </li>
        <li>
          <strong>Data-product onboarding.</strong> An organization with a literacy growth program
          can ship two views of the same data: the familiar one as default, the stretch one as
          opt-in, both rendered by the same engine with the same data, audited against the same
          adoption targets.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/intelligence/suggestions">Chart Suggestions</Link> - full reference for{" "}
          <code>suggestCharts</code>, intents, capability descriptors.
        </li>
        <li>
          <Link to="/intelligence/interrogation">Interrogation</Link> -{" "}
          <code>useChartInterrogation</code> with annotation-returning <code>onQuery</code>.
        </li>
        <li>
          <Link to="/intelligence/capabilities">Capability Matrix</Link> - the AI-readable inventory
          of which charts support which features (SSR, push, linked hover, etc.).
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "charts-that-know-what-theyre-for",
  title: "Charts that know what they're for",
  subtitle:
    "A heuristic-first chart recommendation engine with per-audience calibration, a literacy-growth surface, and ready-to-render props.",
  author: "Elijah Meeks",
  date: "2026-05-25",
  tags: ["case-study"],
  excerpt:
    "Semiotic 3.6.0 ships a chart recommendation engine that's heuristic-first, LLM-optional, and audience-aware. Charts now carry descriptors that declare what data shapes they serve and which questions they answer; an AudienceProfile layers per-org familiarity and adoption targets on top; a separate 'stretch' surface grows literacy without forcing it.",
  component: Body,
}
