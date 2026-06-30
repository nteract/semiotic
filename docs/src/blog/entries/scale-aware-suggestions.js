/* eslint-disable react/no-unescaped-entities */
import React, { useMemo } from "react"
import { Link } from "react-router-dom"
import { suggestCharts, GaugeChart, StackedBarChart, Treemap } from "semiotic/ai"

// ─── Shared styling ────────────────────────────────────────────────────────

const sideBySide = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
}

const tierCard = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 12,
  background: "var(--surface-1)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const tierLabel = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-secondary)",
  fontWeight: 700,
}

// ─── Body component ────────────────────────────────────────────────────────

// Region × product × revenue. The engine sees both a flat tabular sample and
// a hierarchy via `rawInput`, so it can pick a treemap when hierarchical
// browsing is what matters and a stacked-bar when density-weighted
// part-to-whole works better.
const SALES = [
  { region: "EU", product: "Widget", revenue: 1200 },
  { region: "EU", product: "Gadget", revenue: 850 },
  { region: "NA", product: "Widget", revenue: 1700 },
  { region: "NA", product: "Gadget", revenue: 1100 },
  { region: "APAC", product: "Widget", revenue: 950 },
  { region: "APAC", product: "Gadget", revenue: 600 },
]

const SALES_HIERARCHY = {
  name: "Revenue",
  children: [
    {
      name: "EU",
      children: [
        { name: "Widget", value: 1200 },
        { name: "Gadget", value: 850 },
      ],
    },
    {
      name: "NA",
      children: [
        { name: "Widget", value: 1700 },
        { name: "Gadget", value: 1100 },
      ],
    },
    {
      name: "APAC",
      children: [
        { name: "Widget", value: 950 },
        { name: "Gadget", value: 600 },
      ],
    },
  ],
}

const COMPONENT_MAP = {
  GaugeChart,
  StackedBarChart,
  Treemap,
}

const BAND_LABEL = {
  tiny: "tiny (≤3)",
  medium: "medium (~140)",
  huge: "huge (>5k)",
}

function ScaleGraduationDemo() {
  // Three independent calls — one per declared band. maxResults: 1 returns
  // the engine's single best fit at each band so the three cards represent
  // three independent rankings, not three positions in the same list.
  const tiers = useMemo(() => {
    const bands = ["tiny", "medium", "huge"]
    return bands.map((band) => {
      const [top] = suggestCharts(SALES, {
        intent: "part-to-whole",
        rawInput: SALES_HIERARCHY,
        scale: { rows: band },
        maxResults: 1,
      })
      return { band, top }
    })
  }, [])

  return (
    <div style={sideBySide}>
      {tiers.map(({ band, top }) => {
        const Component = top ? COMPONENT_MAP[top.component] : null
        return (
          <div key={band} style={tierCard}>
            <div style={tierLabel}>declared: {BAND_LABEL[band]}</div>
            <div style={{ fontSize: 13, color: "var(--text)" }}>
              <strong>{top?.component ?? "no fit"}</strong>
              {top?.variant ? ` · ${top.variant.label}` : ""}
              {top ? ` · ${top.score.toFixed(2)}/5` : ""}
            </div>
            {Component && (
              <div style={{ marginTop: 4 }}>
                <Component {...top.props} mode="context" width={240} height={140} />
              </div>
            )}
            {top?.reasons?.[0] && (
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{top.reasons[0]}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Hand <code>suggestCharts()</code> a hundred rows and it'll happily pick the right chart —
        for the hundred rows. The production dataset is a million rows. The chart it picked is wrong
        for the data the user will actually see. The library knows nothing about the gap because it
        only sees what's been passed to it, and the rows it's been passed lied about scale.
      </p>

      <p>
        <strong>Scale-aware suggestions</strong> close that gap. You declare the scale of the
        production dataset — row count, cardinality, completeness — and the engine returns
        recommendations biased toward what works at the declared scale rather than the sample size.
        No profiling, no measurement, no statistics on the sample standing in for the population.
        Pure declaration, applied through the same composable bias layer that{" "}
        <code>AudienceProfile</code> uses for chart literacy.
      </p>

      <h2>Why we don't measure scale</h2>

      <p>
        The same argument that ruled out measuring audience familiarity rules out measuring scale.
        Three reasons:
      </p>

      <ul>
        <li>
          <strong>Samples lie.</strong> A hundred-row sample of a million-row table picks a bar
          chart. The million wants a heatmap. The library can't see the discrepancy.
        </li>
        <li>
          <strong>Forward-looking.</strong> "We're shipping a dashboard that will run on a windowed
          view of the last 30 days, ~50k rows" — that's what to design for, not the seed fixture in
          the unit tests.
        </li>
        <li>
          <strong>Standardization.</strong> Your shop's definition of "small" might be 10k rows.
          Whoever's writing the chart-recommendation engine has no way to know that. Declarative
          overrides are the only honest answer.
        </li>
      </ul>

      <p>
        Semiotic's contract becomes <em>describe your data, we'll suggest for it</em>. Profile the
        sample if you want — <code>profileData</code> still does — but nothing in the suggestion
        engine pretends the sample is the population unless you say so.
      </p>

      <h2>The same data, three declared scales</h2>

      <p>
        Below: a six-row sample of region × product revenue, evaluated three times with only the
        declared scale changing. At tiny scale the engine recommends a gauge — single-value
        summaries are the honest part-to-whole at that magnitude. At medium scale a treemap takes
        over because the hierarchy structure is what's worth browsing. At huge scale the hierarchy
        decays in favor of an aggregated stacked bar, since at that density browsing is no longer
        competitive with weighted comparison.
      </p>

      <ScaleGraduationDemo />

      <p>
        Each card is the same call —{" "}
        <code>
          suggestCharts(rows, &#123; intent: "part-to-whole", rawInput: hierarchy, scale: &#123;
          rows: "tiny" | "medium" | "huge" &#125; &#125;)
        </code>{" "}
        — only the declared <code>rows</code> band changes. The engine doesn't see different rows;
        it sees a different declaration about what those rows represent.
        <code>fits()</code> evaluates against the declared row count too, so charts can be excluded
        entirely at the wrong scale — not just downranked.
      </p>

      <h2>Two profiles, not one</h2>

      <p>
        The first design decision: <strong>scale and quality are separate schemas</strong>. Both are
        optional. Both compose with <code>AudienceProfile</code>. Neither tries to cover the other.
      </p>

      <p>
        Scale answers "how big?" — rows, cardinality, fields, growth mode. Quality answers "how
        clean?" — completeness, outlier prevalence, type heterogeneity. The temptation to merge them
        was strong: both are descriptions of the dataset, both come from the same place
        organizationally, both bias the same suggestion score. The reason they're split:{" "}
        <strong>they affect chart choice differently</strong>. Scale changes which chart wins;
        quality changes which <em>treatment</em> of the chart wins. A missing-data dataset doesn't
        need a smaller chart — it needs a broken-line variant, or a "missing" annotation channel, or
        a quality caveat attached to the recommendation. That's a structural concern, not a size
        one, and squashing them into one knob makes both schemas worse.
      </p>

      <h2>The graduation surface</h2>

      <p>
        The second design decision: what shape the response takes. The natural impulse is to wrap
        suggestions in a new shape —{" "}
        <code>&#123; tiny: [...], small: [...], large: [...] &#125;</code> — but that's redundant
        with what's already there. Every suggestion already knows which scale it was scored at.
        Exposing that as a <code>scaleRange</code> tag on the existing Suggestion shape gives
        callers everything they need, and grouping into tiers becomes a derived view.
      </p>

      <p>
        The grouped surface that <em>is</em> exposed —<code>suggestChartsGrouped()</code> — is sugar
        over running the engine once per band. The use case is the "now → at 10× → at 100×"
        narrative card. You'd build it by hand from the tagged primitives if you needed something
        custom; the grouped surface is the shortcut for the common case.
      </p>

      <h2>Breakpoints aren't global</h2>

      <p>
        The third design decision: <strong>where do the breakpoints live?</strong> The instinct says
        "global config" — one place to define what tiny / small / medium / large / huge mean, and
        every chart inherits. The instinct is wrong. Heatmap is great at 100×100. Bar chart fails at
        20 bars. A heatmap can be a sweet-spot chart at the same row count where a bar chart is past
        its limits. A global breakpoint loses that.
      </p>

      <p>
        So breakpoints live on the capability descriptors. Each chart declares its own sweet-spot
        band via <code>scaleFit</code>. The default thresholds — 3 / 25 / 250 / 5,000 — are the
        abstraction that lets callers <em>group</em>, but the actual scoring is per-chart. The
        defaults come from Miller (1956) on category comprehension limits, Cleveland-McGill (1984)
        on position-encoded perception, Munzner (2014) on quantitative encoding density, and Few
        (2009) on dashboard cognitive load. They're starting points; they're overridable per
        profile.
      </p>

      <h2>The single-value gap</h2>

      <p>
        Doing this honestly surfaced a coverage gap. At declared row counts of 1–3, the right
        recommendation is often <em>not a chart</em>. A revenue total wants a BigNumber with a delta
        and trend context, not a bar chart with one bar. The catalog's only single-value chart today
        is <code>GaugeChart</code>, and gauges only work when the value has a meaningful min and
        max. Most single values don't.
      </p>

      <p>
        Rather than ship a half-built <code>BigNumber</code> just to fill the tier, the roadmap
        sketches a <code>SingleValueFrame</code> — a peer to <code>XYFrame</code>,{" "}
        <code>OrdinalFrame</code>, <code>NetworkFrame</code>, and <code>GeoFrame</code> — that would
        own the rendering primitives for the single-value family (focal value + adornments,
        threshold zones, format cascade, density modes, streaming KPIs). Whether the frame
        abstraction earns its infrastructure cost for a 4–6-HOC family is an empirical question the
        next six months will answer; the alternative is plain React components and accepting the
        duplication. Both are explicitly open. The scale work doesn't pretend the gap is closed.
      </p>

      <h2>When to declare scale, and when not</h2>

      <ul>
        <li>
          <strong>Reach for it when</strong> the data you pass to the suggestion engine is a sample,
          a stub, or a forward projection of a dataset that will be materially larger in production.
        </li>
        <li>
          <strong>Reach for it when</strong> the recommendation needs to be honest about what the
          user will <em>actually see</em>, not what fits the demo data.
        </li>
        <li>
          <strong>Reach for it when</strong> your shop has opinions about what scale means — a BI
          environment where 10k rows is "small," a streaming dashboard where 100k rows arrive per
          minute, an embedded analytics tool that needs to ship the same chart across customers with
          100× variance in volume.
        </li>
        <li>
          <strong>Skip it when</strong> the data you pass is the data you'll render. The engine's
          measurement of the sample is the right answer when the sample is the population.
        </li>
      </ul>

      <h2>Wiring</h2>

      <pre
        style={{
          background: "var(--surface-2)",
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          overflow: "auto",
        }}
      >
        {`import { suggestCharts, suggestChartsGrouped } from "semiotic/ai"
import type { DataScaleProfile, DataQualityProfile } from "semiotic/ai"

const scale: DataScaleProfile = {
  rows: 50_000,
  cardinality: { region: 12, status: "low" },
  growth: "windowed",
}

const quality: DataQualityProfile = {
  completeness: { revenue: 0.98, cohort: 0.62 },
}

// Single recommendation at the declared scale.
const [top] = suggestCharts(sampleRows, { intent: "trend", scale, quality })

// All five tiers for a "now → at 10×" narrative.
const grouped = suggestChartsGrouped(sampleRows, { intent: "trend", scale })
const today = grouped[grouped.effective.rowBand][0]
const tomorrow = grouped.huge[0]`}
      </pre>

      <h2>Where this same pattern shows up</h2>

      <p>
        Sample-vs-population mismatch is everywhere in software, and most of the time the answer is
        the same:{" "}
        <em>
          let the caller describe what's coming, and don't infer it from what's currently in hand
        </em>
        .
      </p>

      <ul>
        <li>
          <strong>Database query planners</strong> use declared cardinality hints when statistics on
          the actual table are stale or expensive to gather.
        </li>
        <li>
          <strong>Browser responsive design</strong> works because authors declare breakpoints in
          advance, not because the browser measures user behavior and adjusts. Media queries are the
          right metaphor: the data has breakpoints, just like a layout does.
        </li>
        <li>
          <strong>Load testing</strong> declares expected throughput rather than measuring it from a
          10-second smoke test.
        </li>
        <li>
          <strong>Build systems</strong> ship <code>--release</code> flags because the dev profile
          of an application isn't the production profile.
        </li>
      </ul>

      <p>
        In each case, the system isn't dumber for not measuring — it's more honest for accepting
        that the answer to "what's the scale of this thing?" lives outside the immediately
        observable code.
      </p>

      <p>
        The interactive surface lives at <Link to="/intelligence/scale">/intelligence/scale</Link>;
        the schema reference sits next to <code>AudienceProfile</code> in <code>semiotic/ai</code>.
      </p>
    </>
  )
}

const entry = {
  slug: "scale-aware-suggestions",
  title: "Your sample lies about your data",
  subtitle:
    "Scale-aware chart suggestions: declare what the production dataset actually looks like, and get back recommendations that work at that scale instead of at the size of the sample you happened to pass.",
  author: "Elijah Meeks",
  date: "2026-06-30",
  tags: ["case-study", "ai"],
  excerpt:
    "Hand `suggestCharts()` a hundred rows and it'll pick the right chart for the hundred. The production dataset is a million rows and the choice is wrong. Scale-aware suggestions close the gap by accepting a declared `DataScaleProfile` — what scale the data actually has, not what the sample looked like. With the design decisions behind it: split scale from quality, breakpoints per-chart not global, and the single-value gap the work surfaced.",
  component: Body,
}

export default entry
