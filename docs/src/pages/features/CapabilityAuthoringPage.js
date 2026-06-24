import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

export default function CapabilityAuthoringPage() {
  return (
    <PageLayout
      title="Capability Authoring"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence/observation-hooks" },
        { label: "Capability Authoring", path: "/intelligence/capability-authoring" },
      ]}
      prevPage={{ title: "Variant Discovery", path: "/intelligence/variant-discovery" }}
      nextPage={{ title: "Audience Profiles", path: "/intelligence/audience-profiles" }}
    >
      <p>
        Everything the intelligence layer knows about a chart —{" "}
        <Link to="/intelligence/suggestions">suggestions</Link>, the{" "}
        <Link to="/intelligence/capabilities">capability matrix</Link>,{" "}
        <Link to="/intelligence/variant-discovery">variant discovery</Link>, and
        repair — reads from a <strong>capability descriptor</strong>: a
        structured artifact that declares what a chart is <em>for</em>, what data
        it fits, what it's good and bad at, and how to instantiate it. Built-in
        charts ship descriptors; a custom chart registers its own so the engine
        can reason about it like any first-class component.
      </p>

      <h2 id="descriptor">The descriptor</h2>
      <p>
        A <code>ChartCapability</code> is both data and API — readable by the
        recommender, an agent, a snapshot test, or a human reviewer. By
        convention it lives in a <code>*.capability.ts</code> next to the
        component.
      </p>
      <CodeBlock language="ts">{`import type { ChartCapability } from "semiotic/ai"

export const lineChartCapability: ChartCapability = {
  component: "LineChart",
  family: "time-series",        // ChartFamily taxonomy
  importPath: "semiotic/xy",    // so generators emit the right import

  // Rubric — 1..5 each. Familiarity = how well-known to a general
  // audience; accuracy = how faithfully it represents the data;
  // precision = how readable individual values are.
  rubric: { familiarity: 5, accuracy: 4, precision: 3 },

  // Hard requirements gate: return null if the chart can render this
  // data profile, or a human-readable reason why not.
  fits: (profile) =>
    profile.primary.x ? null : "needs an x field (temporal or ordered)",

  // Per-intent suitability, 0..5. Missing intents default to 0.
  // A value may be a function for profile-aware scoring.
  intentScores: {
    trend: 5,
    "compare-series": (p) => ((p.seriesCount ?? 1) > 1 ? 5 : 3),
    "change-detection": 4,
    distribution: 1,
    "part-to-whole": 0,
  },

  // Build a runnable config for a given dataset (+ chosen variant).
  buildProps: (profile, variant) => ({
    xAccessor: profile.primary.x,
    yAccessor: profile.primary.y,
    ...(variant?.props ?? {}),
  }),
}`}</CodeBlock>

      <h2 id="fields">Field by field</h2>
      <ul>
        <li><code>component</code> / <code>family</code> / <code>importPath</code> — identity and where it's imported from (drives generated import lines).</li>
        <li><code>rubric</code> — <code>{`{ familiarity, accuracy, precision }`}</code>, each 1–5. The audience layer can override <code>familiarity</code> per-reader (see <Link to="/intelligence/audience-profiles">Audience Profiles</Link>).</li>
        <li><code>fits(profile)</code> — the gate. <code>null</code> means "can render this"; a string is a human-readable reason it can't, surfaced verbatim by repair and suggestions.</li>
        <li><code>intentScores</code> — a <code>Partial&lt;Record&lt;IntentId, number | (profile) =&gt; number&gt;&gt;</code>. The composite suggestion score reasons over these.</li>
        <li><code>variants?</code> — see below.</li>
        <li><code>caveats?(profile)</code> — strings describing what the chart hides, distorts, or demands; surfaced in <code>suggestion.caveats</code>.</li>
        <li><code>buildProps(profile, variant?)</code> — produce a spreadable, runnable config (<code>&lt;Component {`{...props}`} /&gt;</code>).</li>
      </ul>

      <h2 id="intents">The intent taxonomy</h2>
      <p>
        <code>intentScores</code> keys come from the built-in intent vocabulary —
        13 communicative/analytical acts:
      </p>
      <CodeBlock language="ts">{`type BuiltInIntentId =
  | "trend" | "compare-series" | "compare-categories" | "rank"
  | "part-to-whole" | "distribution" | "correlation" | "flow"
  | "hierarchy" | "geo" | "outlier-detection"
  | "composition-over-time" | "change-detection"

// IntentId = BuiltInIntentId | (string & {}) — open for extension.`}</CodeBlock>
      <p>
        Extend the taxonomy with <code>registerIntent</code> when your domain has
        an act the built-ins don't capture:
      </p>
      <CodeBlock language="ts">{`import { registerIntent } from "semiotic/ai"

registerIntent({
  id: "forecast-vs-actual",
  label: "Forecast vs. actual",
  description: "Compare a projected series against realized values.",
  familyHint: "time-series",
})
// Capabilities can now score the "forecast-vs-actual" intent.`}</CodeBlock>

      <h2 id="variants">Variants</h2>
      <p>
        A <code>ChartVariant</code> encodes that a <em>setting</em> changes what a
        chart is good for. The suggestion engine emits one suggestion per
        (capability × variant) pair; <code>intentDeltas</code> are added to the
        base <code>intentScores</code> (clamped 0–5).
      </p>
      <CodeBlock language="ts">{`variants: [
  {
    key: "smooth",
    label: "Smooth trend",
    props: { curve: "monotoneX" },
    intentDeltas: { trend: 1, "outlier-detection": -2 },
    rubricDeltas: { precision: -1 },        // smoothing trades precision
    caveats: ["smoothing can hide individual outliers"],
    tags: ["smoothed"],
  },
]`}</CodeBlock>
      <p>
        For proposing variants <em>beyond</em> this hand-curated list, see{" "}
        <Link to="/intelligence/variant-discovery">Variant Discovery &amp; Repair</Link>.
      </p>

      <h2 id="register">Registering a custom chart</h2>
      <p>
        Authoring a <Link to="/custom-charts/overview">custom chart</Link>?
        Register its descriptor at runtime so it joins suggestions, the matrix,
        and repair alongside the built-ins.
      </p>
      <CodeBlock language="ts">{`import { registerChartCapability, unregisterChartCapability } from "semiotic/ai"

registerChartCapability(myWaffleCapability)
// … myWaffle now appears in suggestCharts / proposeVariant / repairChartConfig
unregisterChartCapability("WaffleChart") // remove it again`}</CodeBlock>

      <h2 id="profile">What fits() and intentScores receive</h2>
      <p>
        Both receive a <code>ChartDataProfile</code> from{" "}
        <code>profileData(data)</code> — the structural read of the dataset:
        per-role field candidates (<code>primary.x/y/size/category/series/time</code>),
        distinct counts (<code>categoryCount</code>, <code>seriesCount</code>),
        and shape flags (<code>hasTimeAxis</code>, <code>monotonicX</code>,
        <code>hasHierarchy</code>, …). Reason against the profile, never the raw
        rows.
      </p>
      <CodeBlock language="ts">{`import { profileData } from "semiotic/ai"

const profile = profileData(data)
lineChartCapability.fits(profile)              // null | string
lineChartCapability.intentScores.trend         // 5 (or a fn of profile)`}</CodeBlock>

      <p>
        Related: <Link to="/intelligence/suggestions">Chart Suggestions</Link>{" "}
        ·{" "}
        <Link to="/intelligence/capabilities">Capability Matrix</Link> ·{" "}
        <Link to="/intelligence/variant-discovery">Variant Discovery &amp; Repair</Link>{" "}
        · <Link to="/custom-charts/overview">Custom Charts</Link>
      </p>
    </PageLayout>
  )
}
