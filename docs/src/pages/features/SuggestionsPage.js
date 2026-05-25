import React, { useState } from "react"
import {
  useChartSuggestions,
  LineChart,
  AreaChart,
  StackedAreaChart,
  Scatterplot,
  ConnectedScatterplot,
  BubbleChart,
  QuadrantChart,
  MultiAxisLineChart,
  MinimapChart,
  DifferenceChart,
  CandlestickChart,
  Heatmap,
  BarChart,
  GroupedBarChart,
  StackedBarChart,
  DotPlot,
  Histogram,
  BoxPlot,
  SwarmPlot,
  ViolinPlot,
  RidgelinePlot,
  PieChart,
  DonutChart,
  FunnelChart,
  GaugeChart,
  LikertChart,
  SwimlaneChart,
} from "semiotic/ai"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// Comprehensive map of HOC chart names → React components. Realtime,
// network, and geo families are intentionally omitted — the SuggestionsPage
// demo datasets are all row-shaped tabular data that won't trigger those.
// If the engine recommends a chart not listed here, the demo falls back to
// the next renderable suggestion (with a note that the top pick wasn't
// available in this surface).
const COMPONENT_MAP = {
  LineChart,
  AreaChart,
  StackedAreaChart,
  Scatterplot,
  ConnectedScatterplot,
  BubbleChart,
  QuadrantChart,
  MultiAxisLineChart,
  MinimapChart,
  DifferenceChart,
  CandlestickChart,
  Heatmap,
  BarChart,
  GroupedBarChart,
  StackedBarChart,
  DotPlot,
  Histogram,
  BoxPlot,
  SwarmPlot,
  ViolinPlot,
  RidgelinePlot,
  PieChart,
  DonutChart,
  FunnelChart,
  GaugeChart,
  LikertChart,
  SwimlaneChart,
}

const DATASETS = {
  temporal: {
    label: "Temporal multi-series",
    description: "Two regions, six months of revenue. Time x-axis, categorical series.",
    data: [
      ...[1200, 1400, 1100, 1700, 1900, 2200].map((revenue, i) => ({ month: i + 1, revenue, region: "EU" })),
      ...[900, 1100, 1500, 1300, 1700, 2000].map((revenue, i) => ({ month: i + 1, revenue, region: "NA" })),
    ],
  },
  categorical: {
    label: "Categorical totals",
    description: "Four products, one numeric. Classic bar-chart shape.",
    data: [
      { product: "Widget", units: 30 },
      { product: "Gadget", units: 50 },
      { product: "Sprocket", units: 20 },
      { product: "Whatsit", units: 45 },
    ],
  },
  distribution: {
    label: "Distribution",
    description: "100 numeric observations — best read as a distribution.",
    data: Array.from({ length: 100 }, (_, i) => ({
      observation: 50 + Math.sin(i / 7) * 18 + (i % 5 === 0 ? 25 : 0) + Math.random() * 6,
    })),
  },
  scatter: {
    label: "Two-numeric relationship",
    description: "x and y are both numeric without time semantics.",
    data: Array.from({ length: 60 }, () => {
      const x = Math.random() * 100
      return { x, y: x * 0.6 + Math.random() * 25 }
    }),
  },
}

const INTENTS = [
  { id: "", label: "Any intent" },
  { id: "trend", label: "Trend" },
  { id: "compare-categories", label: "Compare categories" },
  { id: "rank", label: "Rank" },
  { id: "part-to-whole", label: "Part to whole" },
  { id: "distribution", label: "Distribution" },
  { id: "correlation", label: "Correlation" },
  { id: "composition-over-time", label: "Composition over time" },
]

function SuggestionsDemo() {
  const [datasetKey, setDatasetKey] = useState("temporal")
  const [intent, setIntent] = useState("")
  const dataset = DATASETS[datasetKey]

  const { suggestions, profile } = useChartSuggestions(dataset.data, {
    intent: intent || undefined,
    maxResults: 6,
    includeVariants: true,
  })

  // Find the highest-ranked suggestion this surface can render. The engine's
  // actual top pick is shown in the "All suggestions" sidebar regardless;
  // the rendered preview falls back to the next renderable one if the very
  // top isn't in this demo's COMPONENT_MAP.
  const Top = suggestions.find((s) => COMPONENT_MAP[s.component]) ?? null
  const Component = Top && COMPONENT_MAP[Top.component]
  const trueTop = suggestions[0]
  const topNotRenderable = trueTop && Top && trueTop.component !== Top.component

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
              <option key={k} value={k}>{d.label}</option>
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
              <option key={i.id || "any"} value={i.id}>{i.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{dataset.description}</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24 }}>
        <div style={{
          border: "1px solid var(--surface-3)",
          borderRadius: 12,
          padding: 16,
          background: "var(--surface-1)",
        }}>
          {Component && Top ? (
            <>
              <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
                {topNotRenderable ? "Top renderable suggestion: " : "Top suggestion: "}
                {Top.component}{Top.variant ? ` · ${Top.variant.label}` : ""}
              </div>
              {topNotRenderable && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                  Engine's actual top pick was <strong>{trueTop.component}</strong> — not included
                  in this demo's render map. See the all-suggestions sidebar for the full ranking.
                </div>
              )}
              <Component {...Top.props} width={520} height={300} />
            </>
          ) : (
            <div style={{ padding: 24, color: "var(--text-secondary)" }}>No fitting chart for this profile.</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
            All suggestions (ranked)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {suggestions.map((s, i) => (
              <div key={`${s.component}-${s.variant?.key ?? "base"}-${i}`} style={{
                padding: "8px 12px",
                border: "1px solid var(--surface-3)",
                borderRadius: 8,
                fontSize: 13,
                background: i === 0 ? "var(--surface-2)" : "transparent",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong>{s.component}{s.variant ? ` · ${s.variant.label}` : ""}</strong>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{s.score.toFixed(1)}/5</span>
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 4 }}>
                  fam {s.rubric.familiarity} · acc {s.rubric.accuracy} · prec {s.rubric.precision}
                </div>
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
        </div>
      </div>

      <details style={{ fontSize: 13 }}>
        <summary style={{ cursor: "pointer" }}>Shape profile</summary>
        <pre style={{
          fontSize: 12,
          background: "var(--surface-2)",
          padding: 12,
          borderRadius: 8,
          overflow: "auto",
        }}>{JSON.stringify({
          rowCount: profile.rowCount,
          primary: profile.primary,
          categoryCount: profile.categoryCount,
          seriesCount: profile.seriesCount,
          uniqueXCount: profile.uniqueXCount,
          hasRepeatedX: profile.hasRepeatedX,
          monotonicX: profile.monotonicX,
          hasTimeAxis: profile.hasTimeAxis,
        }, null, 2)}</pre>
      </details>
    </div>
  )
}

export default function SuggestionsPage() {
  return (
    <PageLayout
      title="Chart Suggestions"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence" },
        { label: "Chart Suggestions", path: "/intelligence/suggestions" },
      ]}
      prevPage={{ title: "Capability Matrix", path: "/intelligence/capabilities" }}
      nextPage={{ title: "Interrogation", path: "/intelligence/interrogation" }}
    >
      <p>
        Semiotic charts ship <strong>capability descriptors</strong> alongside their components.
        Each chart declares what data shapes it serves, which intents it answers, what variants
        change those answers, and which props to use for a given dataset. The{" "}
        <code>useChartSuggestions</code> hook walks the registry and returns a ranked, ready-to-render
        list. <strong>Heuristic only — no LLM call.</strong> Pair with{" "}
        <code>useChartInterrogation</code> to let an LLM re-rank or narrate.
      </p>

      <h2>Interactive demo</h2>
      <p>
        Pick a dataset and (optionally) an intent. The same profile is evaluated against every
        registered capability and its variants. The top suggestion's <code>props</code> drop straight
        into the matching chart.
      </p>

      <SuggestionsDemo />

      <h2>How it composes</h2>
      <ol>
        <li><code>profileData(data)</code> infers candidate x/y/series/category fields, distinct counts, monotonicity, and structure (hierarchy/network/geo).</li>
        <li>For each capability: <code>fits(profile)</code> is a hard gate (returns <code>null</code> to pass).</li>
        <li><code>intentScores</code> are evaluated (numbers or profile-aware functions).</li>
        <li>Variants apply additive <code>intentDeltas</code> and <code>rubricDeltas</code>.</li>
        <li>Suggestions are sorted by the requested intent (or mean across intents).</li>
        <li><code>buildProps(profile, variant)</code> returns spreadable props for the chart.</li>
      </ol>

      <h2>Implementation</h2>
      <CodeBlock language="jsx">
{`import { useChartSuggestions, LineChart, BarChart, /* ... */ } from "semiotic/ai"

const COMPONENT_MAP = { LineChart, BarChart, /* ... */ }

function SuggestedChart({ data, intent }) {
  const { suggestions } = useChartSuggestions(data, { intent })
  const top = suggestions[0]
  if (!top) return <p>No fitting chart for this data.</p>
  const Component = COMPONENT_MAP[top.component]
  return <Component {...top.props} />
}`}
      </CodeBlock>

      <h2>Charts know what they're good for</h2>
      <p>
        Each chart's capability lives next to its TSX file (e.g.{" "}
        <code>LineChart.capability.ts</code>). It declares <code>fits</code>,{" "}
        <code>intentScores</code>, <code>variants</code>, <code>caveats</code>, and{" "}
        <code>buildProps</code>. Variants encode the idea that{" "}
        <em>settings change what a chart is good for</em> — a stacked area with the{" "}
        <code>streamgraph</code> variant boosts <code>trend</code> readability but penalizes{" "}
        <code>part-to-whole</code> (because totals become unreadable). Those tradeoffs surface in the
        suggestion's <code>intentScores</code>, <code>caveats</code>, and{" "}
        <code>reasons</code>.
      </p>

      <h2>Tying in interrogation</h2>
      <p>
        Set <code>includeSuggestions: true</code> on <code>useChartInterrogation</code> and the same
        ranked list lands in the LLM's <code>context.suggestions</code>. Use it to answer
        questions like <em>"would another chart show this better?"</em> without re-deriving rules.
      </p>

      <h2>Adding a custom capability</h2>
      <CodeBlock language="ts">
{`import { registerChartCapability } from "semiotic/ai"

registerChartCapability({
  component: "MyDomainChart",
  family: "categorical",
  importPath: "semiotic",
  rubric: { familiarity: 2, accuracy: 4, precision: 4 },
  fits: (profile) => profile.primary.category ? null : "needs a category field",
  intentScores: { "compare-categories": 5, "rank": 4 },
  buildProps: (profile) => ({
    data: profile.data,
    categoryAccessor: profile.primary.category,
    valueAccessor: profile.primary.y,
  }),
})`}
      </CodeBlock>
    </PageLayout>
  )
}
