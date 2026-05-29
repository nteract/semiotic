import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  suggestCharts,
  suggestChartsGrouped,
  LineChart,
  AreaChart,
  Scatterplot,
  BubbleChart,
  Heatmap,
  MinimapChart,
  QuadrantChart,
  BarChart,
  GroupedBarChart,
  StackedBarChart,
  DotPlot,
  BoxPlot,
  ViolinPlot,
  RidgelinePlot,
  PieChart,
  DonutChart,
  GaugeChart,
  Treemap,
  CirclePack,
  BigNumber,
} from "semiotic/ai"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

const COMPONENT_MAP = {
  LineChart,
  AreaChart,
  Scatterplot,
  BubbleChart,
  Heatmap,
  MinimapChart,
  QuadrantChart,
  BarChart,
  GroupedBarChart,
  StackedBarChart,
  DotPlot,
  BoxPlot,
  ViolinPlot,
  RidgelinePlot,
  PieChart,
  DonutChart,
  GaugeChart,
  Treemap,
  CirclePack,
  BigNumber,
}

// Three tiers — the most distinct points across the scale spectrum. The middle
// tier intentionally drops out so each card carries its own narrative weight
// instead of fading into a continuum.
const BANDS = ["tiny", "medium", "huge"]

const BAND_LABEL = {
  tiny: "Tiny (≤3)",
  small: "Small (~15)",
  medium: "Medium (~140)",
  large: "Large (~1k)",
  huge: "Huge (>5k)",
}

// effectiveBand can be any of the five ScaleBand values, but only three tiers
// are displayed. Map the in-between bands to the nearest displayed tier so the
// highlight still resolves.
const toDisplayedBand = (band) => (band === "small" ? "tiny" : band === "large" ? "huge" : band)

const DATASETS = {
  layered: {
    label: "Categories × Categories × Value",
    description:
      "Region × product × revenue, exposed both as a flat tabular sample and as a hierarchy. The engine sees both shapes, so it can pick a treemap when the hierarchy is what matters and a heatmap when density does.",
    defaultIntent: "part-to-whole",
    data: [
      { region: "EU", product: "Widget", revenue: 1200 },
      { region: "EU", product: "Gadget", revenue: 850 },
      { region: "NA", product: "Widget", revenue: 1700 },
      { region: "NA", product: "Gadget", revenue: 1100 },
      { region: "APAC", product: "Widget", revenue: 950 },
      { region: "APAC", product: "Gadget", revenue: 600 },
    ],
    rawInput: {
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
    },
  },
  temporal: {
    label: "Time series, single",
    description: "12 monthly observations of one metric.",
    defaultIntent: "trend",
    data: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: 1000 + i * 80 + Math.sin(i / 2) * 100,
    })),
  },
  correlation: {
    label: "x vs y (with magnitude)",
    description:
      "Two numerics for the relationship plus a magnitude per point. Bubble territory at medium density, plain scatter at huge where size encoding becomes overdraw noise.",
    defaultIntent: "correlation",
    data: Array.from({ length: 25 }, () => {
      const x = Math.random() * 100
      return {
        x,
        y: 0.6 * x + (Math.random() - 0.5) * 30,
        magnitude: 10 + Math.random() * 40,
      }
    }),
  },
}

const INTENTS = [
  { id: "", label: "Any intent" },
  { id: "trend", label: "Trend" },
  { id: "compare-categories", label: "Compare categories" },
  { id: "rank", label: "Rank" },
  { id: "part-to-whole", label: "Part to whole" },
  { id: "correlation", label: "Correlation" },
  { id: "distribution", label: "Distribution" },
  { id: "composition-over-time", label: "Composition over time" },
  { id: "hierarchy", label: "Hierarchy" },
]

// ---------------------------------------------------------------------------
// Tier grid — the "graduation of views" surface
// ---------------------------------------------------------------------------

function TierCard({ band, suggestion, highlighted }) {
  const Component = suggestion ? COMPONENT_MAP[suggestion.component] : null
  return (
    <div
      style={{
        border: highlighted ? "2px solid var(--semiotic-primary)" : "1px solid var(--surface-3)",
        borderRadius: 12,
        padding: 12,
        background: highlighted ? "var(--surface-2)" : "var(--surface-1)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 240,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: 13 }}>{BAND_LABEL[band]}</strong>
        {highlighted && (
          <span style={{ fontSize: 11, color: "var(--semiotic-primary)", fontWeight: 600 }}>
            your data
          </span>
        )}
      </div>
      {suggestion ? (
        <>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {suggestion.component}
            {suggestion.variant ? ` · ${suggestion.variant.label}` : ""} ·{" "}
            {suggestion.score.toFixed(1)}/5
          </div>
          <div style={{ flex: 1 }}>
            {Component ? (
              // mode="context" keeps the chart compact — axes, labels, and
              // margins shrink so the tiny preview tile doesn't blow up its
              // own scales relative to the data.
              <Component {...suggestion.props} mode="context" width={220} height={140} />
            ) : (
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                ({suggestion.component} not in this page's preview map)
              </div>
            )}
          </div>
          {suggestion.reasons[0] && (
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {suggestion.reasons[0]}
            </div>
          )}
          {suggestion.caveats[0] && (
            <div style={{ fontSize: 11, color: "#a86f00" }}>{suggestion.caveats[0]}</div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: 12 }}>
          No fitting chart for this band.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

function ScaleAwareDemo() {
  const [datasetKey, setDatasetKey] = useState("layered")
  const [intent, setIntent] = useState(DATASETS.layered.defaultIntent ?? "")
  const [declaredRows, setDeclaredRows] = useState("") // "" = use measured, else band string
  const [declaredCardinality, setDeclaredCardinality] = useState("")
  const dataset = DATASETS[datasetKey]

  // When the user switches datasets, snap the intent to that dataset's
  // natural default. Otherwise the engine returns wrong-family top picks
  // (e.g. asking for "compare-categories" on time-series data) and the
  // tier cards collapse to "no fit" because the picks aren't even in
  // the preview map.
  useEffect(() => {
    if (dataset.defaultIntent !== undefined) setIntent(dataset.defaultIntent)
  }, [datasetKey, dataset.defaultIntent])

  const scale = useMemo(() => {
    const s = {}
    if (declaredRows) s.rows = declaredRows
    if (declaredCardinality) s.typicalCardinality = declaredCardinality
    return Object.keys(s).length > 0 ? s : undefined
  }, [declaredRows, declaredCardinality])

  const baseOptions = useMemo(
    () => ({
      intent: intent || undefined,
      rawInput: dataset.rawInput,
      scale,
    }),
    [intent, dataset.rawInput, scale],
  )

  const grouped = useMemo(() => {
    return suggestChartsGrouped(dataset.data, { ...baseOptions, maxPerBand: 1 })
  }, [dataset.data, baseOptions])

  const topAtEffective = useMemo(() => {
    return suggestCharts(dataset.data, { ...baseOptions, maxResults: 5 })
  }, [dataset.data, baseOptions])

  const effectiveBand = grouped.effective.rowBand

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, gap: 4 }}>
          <span>Dataset</span>
          <select
            value={datasetKey}
            onChange={(e) => setDatasetKey(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            {Object.entries(DATASETS).map(([k, d]) => (
              <option key={k} value={k}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, gap: 4 }}>
          <span>Intent</span>
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            {INTENTS.map((i) => (
              <option key={i.id || "any"} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, gap: 4 }}>
          <span>Declared production rows</span>
          <select
            value={declaredRows}
            onChange={(e) => setDeclaredRows(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            <option value="">(use measured: {dataset.data.length})</option>
            {BANDS.map((b) => (
              <option key={b} value={b}>
                {BAND_LABEL[b]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, gap: 4 }}>
          <span>Declared cardinality</span>
          <select
            value={declaredCardinality}
            onChange={(e) => setDeclaredCardinality(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            <option value="">(measured)</option>
            <option value="low">Low (≤7)</option>
            <option value="medium">Medium (8–25)</option>
            <option value="high">High (&gt;25)</option>
          </select>
        </label>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        {dataset.description}
      </p>

      <h3 style={{ margin: "8px 0 0", fontSize: 14 }}>Graduation across scales</h3>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        Same data, same intent, evaluated at each row band. The card outlined in primary is the band
        your declared (or measured) data falls into.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {BANDS.map((band) => (
          <TierCard
            key={band}
            band={band}
            suggestion={grouped[band][0]}
            highlighted={toDisplayedBand(effectiveBand) === band}
          />
        ))}
      </div>

      <h3 style={{ margin: "8px 0 0", fontSize: 14 }}>Top suggestions at effective scale</h3>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        Full ranked list for {grouped.effective.rows} rows ({BAND_LABEL[effectiveBand]})
        {scale ? " — declared scale applied" : " — measured from data"}.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {topAtEffective.map((s, i) => (
          <div
            key={`${s.component}-${s.variant?.key ?? "base"}-${i}`}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--surface-3)",
              borderRadius: 8,
              fontSize: 13,
              background: i === 0 ? "var(--surface-2)" : "transparent",
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
            >
              <strong>
                {s.component}
                {s.variant ? ` · ${s.variant.label}` : ""}
              </strong>
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                {s.score.toFixed(2)}/5
              </span>
            </div>
            {s.scaleRange && (
              <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 2 }}>
                scale band: {s.scaleRange.band} ({s.scaleRange.rowsSource})
                {s.scaleRange.cardinalityBand
                  ? ` · cardinality: ${s.scaleRange.cardinalityBand}`
                  : ""}
              </div>
            )}
            {s.reasons.length > 0 && (
              <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 4 }}>
                {s.reasons.join("; ")}
              </div>
            )}
            {s.caveats.length > 0 && (
              <div style={{ color: "#a86f00", fontSize: 11, marginTop: 4 }}>
                {s.caveats.join("; ")}
              </div>
            )}
          </div>
        ))}
      </div>

      <details style={{ fontSize: 13 }}>
        <summary style={{ cursor: "pointer" }}>Declared schema</summary>
        <CodeBlock language="json">{JSON.stringify(scale ?? {}, null, 2)}</CodeBlock>
      </details>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ScaleAwarePage() {
  return (
    <PageLayout
      title="Scale-Aware Suggestions"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence" },
        { label: "Scale-Aware Suggestions", path: "/intelligence/scale" },
      ]}
      prevPage={{ title: "Chart Suggestions", path: "/intelligence/suggestions" }}
      nextPage={{ title: "Interrogation", path: "/intelligence/interrogation" }}
    >
      <p>
        Suggestions usually answer the question <em>"what chart for this data?"</em> But the data
        you pass to <code>suggestCharts()</code> is often a sample — a few hundred rows pulled from
        a production dataset that has tens or hundreds of thousands. The right chart for the sample
        is almost never the right chart for production. <strong>Scale-aware suggestions</strong>
        let you declare what the production data actually looks like — and get back a graduation of
        views that work at each band.
      </p>

      <h2>Why declare scale instead of measuring it</h2>
      <p>
        Semiotic doesn't profile the data to figure out its production scale, the same way it
        doesn't profile your team to figure out their chart literacy. Both are descriptive, not
        observational. Three reasons it matters:
      </p>
      <ul>
        <li>
          <strong>Samples lie.</strong> A 100-row sample of a million-row table picks a bar chart; a
          million rows wants a heatmap.
        </li>
        <li>
          <strong>Forward-looking.</strong> "We're shipping a dashboard that will run on a windowed
          view of the last 30 days, ~50k rows" — that's what to plan for, not the seed fixture.
        </li>
        <li>
          <strong>Org-level standardization.</strong> Your shop's definition of "small" might be 10k
          rows. The thresholds are overridable per profile.
        </li>
      </ul>

      <h2>Interactive demo</h2>
      <p>
        Pick a dataset, set an intent, and declare what the production scale will look like. The
        graduation row shows the top recommendation at every band; the panel below is the full
        ranked list at the band your declared (or measured) data lives in.
      </p>

      <ScaleAwareDemo />

      <h2>The schema</h2>
      <CodeBlock language="ts">
        {`import type { DataScaleProfile, DataQualityProfile } from "semiotic/ai"

const scale: DataScaleProfile = {
  // Production row count — declared, not measured. Accepts a band string
  // ("medium") or an exact number.
  rows: 50_000,

  // Per-field cardinality. Key for categorical charts: bar at 5 categories
  // vs treemap at 500.
  cardinality: { region: 12, status: "low" },

  // How does the data grow? Affects streaming recommendations.
  growth: "windowed",

  // Org-level overrides — what counts as "small" / "medium" / "large".
  thresholds: { rows: { small: 1_000, medium: 100_000 } },

  // Per-chart preferences. Like AudienceProfile.targets, but for scale.
  charts: {
    Heatmap: { minBand: "medium", reason: "cells dominate noise below 50 rows" },
    PieChart: { maxBand: "small", reason: "pie at large scale is just noise" },
  },
}

const quality: DataQualityProfile = {
  completeness: { revenue: 0.98, cohort: 0.62 },
  outliers: { revenue: 0.04 },
}`}
      </CodeBlock>

      <h2>The graduation surface</h2>
      <p>
        <code>suggestChartsGrouped(data, options)</code> returns suggestions tiered by row band. It
        runs the engine once per band, pinning the row count to that band's representative midpoint,
        then returns the per-band ranked lists plus the effective scale view.
      </p>
      <CodeBlock language="ts">
        {`import { suggestChartsGrouped } from "semiotic/ai"

const grouped = suggestChartsGrouped(data, {
  intent: "trend",
  scale: { rows: 50_000 },
})

// Render the tier for the user's actual band, plus a "what about at 10×?" peek
const todayTier = grouped[grouped.effective.rowBand][0]
const tomorrowTier = grouped.huge[0]`}
      </CodeBlock>

      <h2>How the bias composes</h2>
      <ol>
        <li>
          <code>profileData(data)</code> measures the sample (row count, distinct counts, field
          types).
        </li>
        <li>
          <code>computeEffectiveScale(profile, scale)</code> merges declared scale with measured
          fallbacks.
        </li>
        <li>
          For each capability: <code>fits()</code> still hard-gates first.
        </li>
        <li>
          <code>intentScores</code> evaluate against the profile.
        </li>
        <li>
          <code>applyAudienceBias()</code> shifts score by familiarity and adoption targets.
        </li>
        <li>
          <code>applyScaleBias()</code> calls{" "}
          <code>capability.scaleFit(profile, effectiveScale, scale)</code>, applies per-chart
          preferences, and adds caveats from <code>qualityFit()</code>.
        </li>
        <li>
          Suggestions sort by the final composite. Each suggestion carries a <code>scaleRange</code>{" "}
          tag.
        </li>
      </ol>

      <h2>Declaring a chart's scale fit</h2>
      <p>
        Capability authors expose <code>scaleFit</code> on their descriptor. The
        <code>scaleHints()</code> helper covers the simple "sweet spot" case; for more nuanced
        logic, write the function yourself.
      </p>
      <CodeBlock language="ts">
        {`import { scaleHints } from "semiotic/ai"

export const BarChartCapability: ChartCapability = {
  // ...
  scaleFit: scaleHints({
    cardinality: { sweetSpot: [3, 15], caveatAbove: 25 },
    rows: { sweetSpot: [3, 200] },
  }),
}

// Or with explicit logic:
export const ForceDirectedGraphCapability: ChartCapability = {
  // ...
  scaleFit: (profile) => {
    const n = profile.network?.nodes.length ?? 0
    if (n < 5) return { delta: -0.4, caveats: [\`only \${n} nodes — overkill\`] }
    if (n <= 100) return { delta: 0.5, reason: \`\${n} nodes — readable\` }
    if (n <= 300) return { delta: 0 }
    return { delta: -0.8, caveats: [\`\${n} nodes — hairball; filter first\`] }
  },
}`}
      </CodeBlock>

      <h2>Thresholds and where they came from</h2>
      <p>
        The default row breakpoints sit at 3 / 25 / 250 / 5,000. They're starting points grounded in
        the visualization-perception literature:
      </p>
      <ul>
        <li>
          <strong>tiny ≤ 3</strong> — single-value territory; recommendation often "a value, not a
          chart."
        </li>
        <li>
          <strong>small ≤ 25</strong> — Miller's 7±2 plus a comfortable buffer; bar/pie/dot legible.
        </li>
        <li>
          <strong>medium ≤ 250</strong> — Cleveland-McGill sweet spot for position-encoded marks.
        </li>
        <li>
          <strong>large ≤ 5,000</strong> — Munzner ch. 10 quantitative encoding; dense
          scatter/heatmap/ridgeline still legible.
        </li>
        <li>
          <strong>huge &gt; 5,000</strong> — aggregation, sampling, density reduction required.
        </li>
      </ul>
      <p>
        Override per profile with <code>DataScaleProfile.thresholds</code>. The defaults can — and
        should — bend to your shop's conventions.
      </p>

      <h2>The single-value gap (now filled)</h2>
      <p>
        At <strong>tiny</strong> scale, the engine used to only have{" "}
        <code>GaugeChart</code>, and a gauge is misleading without an explicit
        min / max. <code>BigNumber</code> (under <code>semiotic/value</code>)
        ships as the honest answer for unbounded single-value data — and the
        capability layer wires it into <code>suggestCharts</code> /{" "}
        <code>suggestChartsGrouped</code> with a <code>scaleFit</code> boost
        that puts it ahead of <code>GaugeChart</code> at the{" "}
        <strong>tiny</strong> band. See{" "}
        <Link to="/charts/big-number">/charts/big-number</Link> for the full
        component, and the roadmap entry for <code>SingleValueFrame</code> for
        what a future frame-backed version would inherit.
      </p>
      <p>
        Next iteration: <strong>composition suggestions</strong> — sets of N
        charts where a <code>BigNumber</code> can host the others via its{" "}
        <code>trendSlot</code> / <code>chartSlot</code> rather than the
        dashboard rendering them as peer cards. Documented in the roadmap;
        not part of this PR.
      </p>
    </PageLayout>
  )
}
