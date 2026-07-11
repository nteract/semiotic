import React, { useMemo, useState } from "react"
import { BarChart, LineChart, PieChart, Scatterplot } from "semiotic"
import { fromVegaLite } from "semiotic/data"
import { suggestCharts } from "semiotic/ai"
import {
  unstable_toVegaLiteResult as toVegaLiteResult,
  unstable_attachIDID as attachIDID,
  unstable_attachIDIDAnnotations as attachIDIDAnnotations,
  unstable_readIDID as readIDID,
  IDID_SPEC_VERSION,
} from "semiotic/experimental"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// The canonical, published schemas (repo /spec/v0.1) — imported so the page
// shows the real artifact, not a paraphrase.
import capabilitySchema from "../../../../spec/v0.1/chart-capability.schema.json"
import audienceSchema from "../../../../spec/v0.1/audience-profile.schema.json"
import annotationSchema from "../../../../spec/v0.1/annotation-provenance.schema.json"

// ── Preset Vega-Lite specs for the round-trip playground ────────────────────

const PRESETS = {
  "Bar — category comparison": {
    mark: "bar",
    title: "Revenue by region",
    data: {
      values: [
        { region: "North", revenue: 128 },
        { region: "South", revenue: 92 },
        { region: "East", revenue: 145 },
        { region: "West", revenue: 71 },
      ],
    },
    encoding: {
      x: { field: "region", type: "nominal" },
      y: { field: "revenue", type: "quantitative", axis: { title: "Revenue ($k)" } },
    },
  },
  "Line — trend over time": {
    mark: { type: "line", point: true },
    title: "Active users",
    data: {
      values: [
        { week: 1, users: 240 },
        { week: 2, users: 312 },
        { week: 3, users: 287 },
        { week: 4, users: 401 },
        { week: 5, users: 458 },
      ],
    },
    encoding: {
      x: { field: "week", type: "quantitative" },
      y: { field: "users", type: "quantitative" },
    },
  },
  "Scatter — correlation": {
    mark: "point",
    title: "Spend vs. conversion",
    data: {
      values: [
        { spend: 12, conversion: 3.1 },
        { spend: 28, conversion: 4.4 },
        { spend: 41, conversion: 5.0 },
        { spend: 19, conversion: 3.8 },
        { spend: 55, conversion: 6.2 },
      ],
    },
    encoding: {
      x: { field: "spend", type: "quantitative" },
      y: { field: "conversion", type: "quantitative" },
    },
  },
  "Pie — part to whole": {
    mark: "arc",
    title: "Traffic source",
    data: {
      values: [
        { source: "Organic", share: 48 },
        { source: "Paid", share: 27 },
        { source: "Referral", share: 15 },
        { source: "Direct", share: 10 },
      ],
    },
    encoding: {
      theta: { field: "share", type: "quantitative" },
      color: { field: "source", type: "nominal" },
    },
  },
}

const CHART_COMPONENTS = { BarChart, LineChart, Scatterplot, PieChart }

// Hand-authored capability descriptors per preset component, expressed in the
// portable shape. A real host pulls these from its capability registry.
const CAPABILITIES = {
  BarChart: {
    component: "BarChart",
    family: "ordinal",
    importPath: "semiotic/ordinal",
    rubric: { familiarity: 5, accuracy: 5, precision: 4 },
    intentScores: { "compare-categories": 5, rank: 4 },
  },
  LineChart: {
    component: "LineChart",
    family: "xy",
    importPath: "semiotic/xy",
    rubric: { familiarity: 5, accuracy: 4, precision: 3 },
    intentScores: { trend: 5, "change-detection": 4 },
  },
  Scatterplot: {
    component: "Scatterplot",
    family: "xy",
    importPath: "semiotic/xy",
    rubric: { familiarity: 4, accuracy: 5, precision: 4 },
    intentScores: { correlation: 5, "outlier-detection": 4 },
  },
  PieChart: {
    component: "PieChart",
    family: "ordinal",
    importPath: "semiotic/ordinal",
    rubric: { familiarity: 5, accuracy: 2, precision: 2 },
    intentScores: { "part-to-whole": 4 },
  },
}

const AUDIENCE = {
  name: "Quarterly exec review",
  familiarity: { BoxPlot: 2, ViolinPlot: 1 },
  targets: { PieChart: { direction: "decrease", weight: 2, reason: "we want exact comparison, not slices" } },
  receptionModality: "visual",
}

const PRESET_INTENT = {
  "Bar — category comparison": "compare-categories",
  "Line — trend over time": "trend",
  "Scatter — correlation": "correlation",
  "Pie — part to whole": "part-to-whole",
}

const pretty = (v) => JSON.stringify(v, null, 2)

function supportedVegaLiteSpec(config) {
  const result = toVegaLiteResult(config)
  if (!result.spec) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join(" "))
  return result.spec
}

// ── Small UI atoms ──────────────────────────────────────────────────────────

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
}

function PrimitiveCard({ name, schemaTitle, answers, fields }) {
  return (
    <div style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>{name}</h3>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-code)" }}>{schemaTitle}</div>
      <p style={{ fontSize: 13, margin: "2px 0 6px" }}>{answers}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {fields.map((f) => (
          <code
            key={f}
            style={{
              fontSize: 11,
              background: "var(--surface-2)",
              border: "1px solid var(--surface-3)",
              borderRadius: 4,
              padding: "1px 6px",
            }}
          >
            {f}
          </code>
        ))}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PortabilitySpecPage() {
  const [presetName, setPresetName] = useState(Object.keys(PRESETS)[0])
  const [enriched, setEnriched] = useState(false)

  const vegaSpec = PRESETS[presetName]

  // The full inbound → outbound round trip, recomputed on selection.
  const { config, roundTrip, dataValues } = useMemo(() => {
    const cfg = fromVegaLite(vegaSpec)
    const back = supportedVegaLiteSpec(cfg)
    return { config: cfg, roundTrip: back, dataValues: vegaSpec.data.values }
  }, [vegaSpec])

  const Chart = CHART_COMPONENTS[config.component] || BarChart

  // IDID enrichment: attach the chart's capability + the audience profile, then
  // carry one provenanced annotation alongside the spec.
  const capability = CAPABILITIES[config.component]
  const annotation = useMemo(
    () => ({
      type: "y-threshold",
      value: 100,
      label: "Target",
      provenance: {
        author: "forecast-watcher",
        authorKind: "watcher",
        source: "ai",
        basis: "statistical-test",
        confidence: 0.72,
        createdAt: "2026-06-20T14:00:00Z",
      },
      lifecycle: { ttlHint: "P7D", status: "proposed", anchor: "semantic" },
    }),
    []
  )

  const enrichedSpec = useMemo(() => {
    let spec = supportedVegaLiteSpec(config)
    spec = attachIDID(spec, { capability, audience: AUDIENCE })
    spec = attachIDIDAnnotations(spec, [annotation])
    return spec
  }, [config, capability, annotation])

  // Route the carried audience profile through the suggestion engine — proof
  // that the metadata is actionable, not decorative.
  const suggestions = useMemo(() => {
    const meta = readIDID(enrichedSpec)
    return suggestCharts(dataValues, {
      intent: PRESET_INTENT[presetName],
      audience: meta?.audience,
      maxResults: 3,
    })
  }, [enrichedSpec, dataValues, presetName])

  const displayedSpec = enriched ? enrichedSpec : roundTrip

  return (
    <PageLayout
      title="Portability Spec"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "Portability Spec", path: "/interoperability/portability-spec" },
      ]}
      prevPage={{ title: "Overview", path: "/interoperability/overview" }}
      nextPage={{ title: "Vega-Lite", path: "/interoperability/vega-lite" }}
    >
      <p>
        A chart that an AI can pick correctly, that a screen-reader user can
        receive, and that carries its own provenance is more useful than one
        that merely looks right. Those properties are <em>metadata</em>, not
        pixels — and metadata is portable in a way a rendering engine is not.
        The <strong>IDID portability spec</strong> writes three of them down as
        library-neutral JSON Schemas so they can travel into ecosystems that
        have no concept of a Semiotic chart.
      </p>

      <p>
        The payoff: a format adapter (Vega-Lite&nbsp;→&nbsp;chart,
        dbt&nbsp;test&nbsp;→&nbsp;annotation) stops being just a parser and
        becomes an <em>export of these ideas</em>. It doesn't reproduce a
        source's appearance — it carries the capability, audience, and
        provenance metadata the source never had. That's the difference between
        a chart that renders and a chart that <em>communicates</em>.
      </p>

      <h2>The three primitives</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, margin: "16px 0" }}>
        <PrimitiveCard
          name="Chart Capability"
          schemaTitle="chart-capability.schema.json"
          answers="What is this chart good at? — declaratively, so a heuristic or an LLM can rank it against a dataset and a goal without running a chart library."
          fields={["component", "rubric", "intentScores", "variants", "caveats"]}
        />
        <PrimitiveCard
          name="Audience Profile"
          schemaTitle="audience-profile.schema.json"
          answers="Who is reading, and what is the org trying to grow? — so a suggestion is calibrated to a real audience, not a generic baseline."
          fields={["familiarity", "targets", "exposureLevel", "receptionModality"]}
        />
        <PrimitiveCard
          name="Annotation Provenance & Lifecycle"
          schemaTitle="annotation-provenance.schema.json"
          answers="Where did this note come from, how much do we trust it, and how does it age? — so a claim on a chart carries its own evidence and expiry."
          fields={["author", "basis", "confidence", "freshness", "status", "anchor"]}
        />
      </div>

      <p>
        Public domain fields are labelled with <code>x-idid-status</code> so a reader can
        tell what's real today (<code>shipped</code> — Semiotic ships all v0.1
        fields) from what the spec reserves for the future (<code>proposed</code>).
        Open string unions (e.g. <code>provenance.source</code>) stay open with a
        recognized-values list; genuinely closed unions
        (<code>lifecycle.freshness</code>, <code>status</code>, <code>anchor</code>)
        use a strict <code>enum</code>. Current spec version:{" "}
        <code>{IDID_SPEC_VERSION}</code>.
      </p>

      <details style={{ ...panelStyle, marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          View the published schemas ({capabilitySchema.$id ? "packed with semiotic under /spec/v0.1" : ""})
        </summary>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <CodeBlock language="json">{pretty(capabilitySchema.$defs.rubric)}</CodeBlock>
          <CodeBlock language="json">{pretty(audienceSchema.properties.receptionModality)}</CodeBlock>
          <CodeBlock language="json">{pretty(annotationSchema.$defs.lifecycle.properties)}</CodeBlock>
        </div>
      </details>

      <h2>Bidirectional Vega-Lite — the portability proof</h2>

      <p>
        Vega-Lite is the closest thing the ecosystem has to a neutral chart
        interchange format. Semiotic already reads it
        (<code>fromVegaLite</code>); the spec adds the inverse
        (<code>toVegaLiteResult</code>), so the tested supported single-view
        subset round-trips through the dominant format. Unsupported semantics
        return a typed refusal rather than a plausible fallback. Pick a spec and
        watch it travel in and back out:
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => setPresetName(name)}
            style={{
              padding: "5px 12px",
              borderRadius: 14,
              border: "1px solid var(--surface-3)",
              background: name === presetName ? "var(--accent)" : "var(--surface-2)",
              color: name === presetName ? "white" : "var(--text-primary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>1 · Vega-Lite spec (input)</div>
          <CodeBlock language="json" wrap>{pretty(vegaSpec)}</CodeBlock>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            2 · Semiotic ChartConfig — <code>fromVegaLite()</code>
          </div>
          <CodeBlock language="json" wrap>{pretty({ component: config.component, props: config.props })}</CodeBlock>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            3 · Back to Vega-Lite — <code>toVegaLiteResult()</code>
          </div>
          <CodeBlock language="json" wrap>{pretty({ mark: roundTrip.mark, encoding: roundTrip.encoding })}</CodeBlock>
        </div>
      </div>

      <div style={{ ...panelStyle, marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>4 · Rendered Semiotic chart (from the ChartConfig)</div>
        <Chart {...config.props} height={260} />
      </div>

      <h2>Carrying the IDID metadata on the spec</h2>

      <p>
        The supported round trip above preserves its tested data, mark, and
        encoding subset — but plain
        Vega-Lite has no place for capability, audience, or provenance. The
        binding rides them under <code>usermeta.idid</code> (which every
        Vega-Lite renderer ignores) so the spec and its meaning travel together.
        Toggle enrichment to see the metadata appear on the round-tripped spec:
      </p>

      <div style={{ margin: "12px 0" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={enriched} onChange={(e) => setEnriched(e.target.checked)} />
          Attach capability + audience + a provenanced annotation
        </label>
      </div>

      <CodeBlock language="json" wrap>
        {pretty(enriched ? { usermeta: displayedSpec.usermeta } : { usermeta: "// toggle above to attach IDID metadata" })}
      </CodeBlock>

      <CodeBlock language="ts">
{`import {
  unstable_toVegaLiteResult as toVegaLiteResult,
  unstable_attachIDID as attachIDID,
  unstable_attachIDIDAnnotations as attachIDIDAnnotations,
} from "semiotic/experimental"

const result = toVegaLiteResult(config)                 // chart → Vega-Lite
if (result.status === "refused") throw new Error(result.diagnostics[0].message)
let spec = result.spec
spec = attachIDID(spec, { capability, audience })       // ride under usermeta.idid
spec = attachIDIDAnnotations(spec, [provenancedNote])   // + a note with its evidence

// A plain Vega-Lite renderer ignores usermeta and still draws the chart.
// An IDID-aware host reads readIDID(spec) and acts on it — see below.`}
      </CodeBlock>

      <h2>The metadata is actionable, not decorative</h2>

      <p>
        Because the audience profile travels on the spec, any IDID-aware host can
        read it back and route it through the suggestion engine — the same audience
        that shipped with the chart now calibrates what else to recommend. Here the
        carried <strong>{AUDIENCE.name}</strong> profile (which de-prioritizes pie
        charts in favor of exact comparison) is read off the enriched spec and fed to{" "}
        <code>suggestCharts</code> for the intent{" "}
        <code>{PRESET_INTENT[presetName]}</code>:
      </p>

      <div style={{ ...panelStyle }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
          <code>suggestCharts(data, {"{"} intent, audience: readIDID(spec).audience {"}"})</code>
        </div>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {suggestions.map((s, i) => (
            <li key={s.component + i} style={{ marginBottom: 8 }}>
              <strong>{s.component}</strong>{" "}
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                score {typeof s.score === "number" ? s.score.toFixed(2) : s.score}
              </span>
              {Array.isArray(s.reasons) && s.reasons.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {s.reasons.slice(0, 2).join(" · ")}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <h2>What this enables</h2>

      <ul>
        <li>
          <strong>Adapters export ideas, not just formats.</strong> A
          Vega-Lite, Mermaid, or dbt adapter that targets these schemas carries
          legibility/receivability/provenance the source format lacks.
        </li>
        <li>
          <strong>Tested supported-subset round trip.</strong>{" "}
          <code>fromVegaLite</code> ⇄ <code>toVegaLiteResult</code> proves a chart can
          pass through the dominant interchange format with its IDID metadata
          intact under <code>usermeta</code>; unsupported constructs refuse with
          diagnostics instead of rendering an approximation.
        </li>
        <li>
          <strong>Implementable without this library.</strong> The schemas are
          plain JSON Schema 2020-12, and a <strong>zero-dependency reference
          binding</strong> ships at <code>/spec/bindings/vega-lite.mjs</code> — it
          carries the IDID metadata on a Vega-Lite spec without importing
          Semiotic, and its output is byte-compatible with the helpers above. A
          Python notebook, a BI tool, or a competing chart library can copy it (or
          the schemas) and have it all mean the same thing.
        </li>
      </ul>

      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        The runtime helpers above ship behind the <code>unstable_</code> prefix in{" "}
        <code>semiotic/experimental</code> while the surface is proven against real
        consumers; the JSON Schemas themselves are the stable artifact. The canonical
        copies ship in the npm package under <code>/spec/v0.1</code> and live in
        the repository at the same path.
      </p>
    </PageLayout>
  )
}
