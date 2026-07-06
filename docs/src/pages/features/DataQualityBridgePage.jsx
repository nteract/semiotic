import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { LineChart } from "semiotic"
import {
  fromDbtArtifacts,
  fromGreatExpectations,
  applyAnnotationLifecycle,
  applyAnnotationStatus,
  describeChart,
} from "semiotic/ai"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ── Demo data: daily transaction volume, with an ingestion stall at day 10 ──

const DAY = 24 * 60 * 60 * 1000
const START = Date.parse("2026-06-08T00:00:00Z")
const STALL_AT = START + 10 * DAY // last good load

const VOLUME = Array.from({ length: 14 }, (_, i) => {
  const t = START + i * DAY
  // Healthy volume ~1000, then a sharp drop after the stall (stale pipeline).
  const value = i < 10 ? 980 + Math.round(Math.sin(i * 0.7) * 90) : 230 - i * 4
  return { t, value }
})

// ── The external data-quality artifacts (read-only — we never write back) ───

const DBT_SOURCES = {
  metadata: { generated_at: "2026-06-21T08:00:00Z", invocation_id: "inv-7f3a" },
  results: [
    {
      unique_id: "source.shop.raw.transactions",
      status: "error",
      max_loaded_at: new Date(STALL_AT).toISOString(),
      criteria: { warn_after: { count: 6, period: "hour" }, error_after: { count: 24, period: "hour" } },
    },
  ],
}

const DBT_RUN_RESULTS = {
  metadata: { generated_at: "2026-06-21T08:00:00Z", invocation_id: "inv-7f3a" },
  results: [
    { unique_id: "test.shop.not_null_transactions_id.9c1", status: "fail", failures: 18 },
  ],
}

const GE_VALIDATION = {
  success: false,
  meta: { run_id: { run_name: "nightly", run_time: "2026-06-21T02:00:00Z" } },
  results: [
    {
      success: false,
      expectation_config: {
        expectation_type: "expect_column_values_to_be_between",
        kwargs: { column: "value", min_value: 800, max_value: 1200 },
      },
      result: { observed_value: 210, unexpected_count: 4 },
    },
    {
      success: false,
      expectation_config: {
        expectation_type: "expect_column_values_to_be_unique",
        kwargs: { column: "id" },
      },
      result: { unexpected_count: 2 },
    },
  ],
}

const TTL_HINT = "P2D" // annotations are considered fresh for 2 days

const pretty = (v) => JSON.stringify(v, null, 2)

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
}

const AGE_STEPS = [
  { label: "Just ran", days: 0 },
  { label: "2 days later", days: 2 },
  { label: "4 days later", days: 4 },
  { label: "A week later", days: 7 },
]

export default function DataQualityBridgePage() {
  const [bridgeOn, setBridgeOn] = useState(true)
  const [ageDays, setAgeDays] = useState(0)

  // Build provenanced annotations from the two artifact sources, then merge.
  const { annotations, unplaced, dbtResult } = useMemo(() => {
    const opts = { ttlHint: TTL_HINT }
    const dbt = fromDbtArtifacts({ sources: DBT_SOURCES, runResults: DBT_RUN_RESULTS }, opts)
    const ge = fromGreatExpectations(GE_VALIDATION, opts)
    return {
      dbtResult: dbt,
      geResult: ge,
      annotations: [...dbt.annotations, ...ge.annotations],
      unplaced: [...dbt.unplaced, ...ge.unplaced],
    }
  }, [])

  // Age the annotations against a simulated "now" using the shipped treatments —
  // freshness decay (dimming/dashing) + the proposed-status treatment.
  const displayedAnnotations = useMemo(() => {
    if (!bridgeOn) return []
    const now = Date.parse("2026-06-21T08:00:00Z") + ageDays * DAY
    const aged = applyAnnotationLifecycle(annotations, { now })
    // Put the freshness line's label along the bottom so it doesn't pile up with
    // the band label and the chart title at the top.
    return applyAnnotationStatus(aged).map((a) =>
      a.type === "x-threshold" ? { ...a, labelPosition: "bottom" } : a
    )
  }, [bridgeOn, ageDays, annotations])

  // How an agent reads the chart: with the provenanced alert annotation present,
  // describeChart's communicative act flips from a trend "report" to "alerting".
  const l4 = useMemo(() => {
    const result = describeChart(
      "LineChart",
      { data: VOLUME, xAccessor: "t", yAccessor: "value", annotations: bridgeOn ? annotations : [] },
      bridgeOn ? {} : { capability: { family: "time-series", intentScores: { trend: 5 } } }
    )
    return result.levels.l4
  }, [bridgeOn, annotations])

  return (
    <PageLayout
      title="Data-Truth Bridge"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "Data-Truth Bridge", path: "/interoperability/data-quality-bridge" },
      ]}
      prevPage={{ title: "Apache Arrow Adapter", path: "/interoperability/arrow" }}
      nextPage={{ title: "Generative-UI Trust Layer", path: "/interoperability/generative-ui" }}
    >
      <p>
        Every BI tool generates insight text <em>beside</em> a chart. None puts a
        provenance-tracked claim <em>on</em> it. The data-truth bridge does exactly
        that: it ingests data-quality results — a failed dbt source-freshness
        check, a Great Expectations validation — and paints them as annotations
        that carry <strong>who</strong> found the problem, <strong>how</strong>,{" "}
        <strong>when</strong>, and against <strong>which data snapshot</strong>.
        The same chart, a new communicative act: <em>report</em> becomes{" "}
        <em>alert</em>, driven entirely by external metadata.
      </p>

      <h2>Why this matters</h2>
      <p>
        A dashboard that silently renders stale or out-of-bounds data is worse than
        no dashboard — it launders a pipeline failure into a confident-looking
        chart. The fix isn't a separate "data quality" tab nobody opens; it's
        putting the quality signal where the reader is already looking, with enough
        provenance that they can tell a hard rule from a statistical expectation
        from an AI guess. Because the annotations carry a lifecycle, a week-old
        freshness alert dims and dashes on its own instead of crying wolf forever.
        And because the bridge is a read-only overlay, it never reaches back into
        your warehouse — the data-quality system owns the checks; Semiotic owns only
        the visual and its provenance.
      </p>

      <h2>Report, then alert</h2>
      <p>
        Below is a daily transaction-volume series whose upstream pipeline stalled
        on day 10. On its own it's just a line that drops. Toggle the bridge on and
        the dbt freshness failure becomes a danger threshold at the last good load,
        the Great Expectations range check becomes a band marking where volume
        <em>should</em> have been, and each carries a provenanced label.
      </p>

      <div style={{ margin: "12px 0", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={bridgeOn} onChange={(e) => setBridgeOn(e.target.checked)} />
          Bridge data-quality results onto the chart
        </label>
      </div>

      <div style={panelStyle}>
        <LineChart
          data={VOLUME}
          xAccessor="t"
          yAccessor="value"
          xScaleType="time"
          title="Transaction volume"
          height={300}
          lineWidth={2}
          annotations={displayedAnnotations}
          yExtent={[0, 1250]}
          margin={{ top: 28, right: 24, bottom: 40, left: 56 }}
          xFormat={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        />
      </div>

      {l4 && (
        <div style={{ ...panelStyle, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            How an agent or screen-reader reads it — <code>describeChart</code> L4
          </div>
          <p style={{ fontSize: 14, margin: 0 }}>{l4}</p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, marginBottom: 0 }}>
            {bridgeOn
              ? "The provenanced threshold flips the communicative act from report to alert — same chart, new act, driven by external metadata. (No capability hint passed; the annotation alone does it.)"
              : "Without an alert annotation the chart simply reports a trend. Toggle the bridge on to watch the act flip."}
          </p>
        </div>
      )}

      {bridgeOn && (
        <div style={{ ...panelStyle, marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Freshness decay — how the alert ages
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 0 }}>
            The annotations were stamped with a {TTL_HINT} TTL. Advance the clock and
            the shipped <code>applyAnnotationLifecycle</code> dims and dashes them as
            they pass fresh → aging → stale, so an old alert quiets itself instead of
            shouting indefinitely.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {AGE_STEPS.map((step) => (
              <button
                key={step.days}
                onClick={() => setAgeDays(step.days)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 14,
                  border: "1px solid var(--surface-3)",
                  background: step.days === ageDays ? "var(--accent)" : "var(--surface-2)",
                  color: step.days === ageDays ? "white" : "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <h2>The provenance the chart now carries</h2>
      <p>
        Each generated annotation is an ordinary Semiotic annotation with two extra
        blocks: <code>provenance</code> (a system author, a rule basis, the dbt
        invocation id as <code>dataVersion</code>) and <code>lifecycle</code> (a
        proposed status, the TTL, a semantic anchor so it re-resolves on refresh).
        Here is the freshness alert the dbt artifact produced:
      </p>
      <CodeBlock language="json" wrap>{pretty(dbtResult.annotations[0])}</CodeBlock>

      <h2>What it refuses to place</h2>
      <p>
        A <code>not_null</code> dbt test and a uniqueness expectation assert a
        property of a column with no single chart coordinate. Rather than fabricate
        a position — which would put a plausible-but-wrong mark exactly where a
        non-expert reader would trust it — the bridge returns them in{" "}
        <code>unplaced</code> with a reason, for the host to render as a chart-level
        badge it has the context to place. Announcing the gap is the feature:
      </p>
      <CodeBlock language="json" wrap>{pretty(unplaced.map((u) => ({ id: u.result.id, reason: u.reason })))}</CodeBlock>

      <h2>Wiring it up</h2>
      <CodeBlock language="ts">
{`import {
  fromDbtArtifacts,
  fromGreatExpectations,
  applyAnnotationLifecycle,
} from "semiotic/ai"

// Read-only: parse the artifacts your CI already produces.
const dbt = fromDbtArtifacts(
  { sources: sourcesJson, runResults: runResultsJson },
  { ttlHint: "P2D" }
)
const ge = fromGreatExpectations(validationJson, { ttlHint: "P2D" })

// Merge, age against the chart's "now", and render.
const annotations = applyAnnotationLifecycle(
  [...dbt.annotations, ...ge.annotations],
  { now: Date.now() }
)

<LineChart data={volume} xAccessor="t" yAccessor="value"
  xScaleType="time" annotations={annotations} />

// dbt.unplaced / ge.unplaced hold the checks with no chart coordinate.`}
      </CodeBlock>

      <h2>Where this goes</h2>
      <p>
        The same shape recurs anywhere a chart sits downstream of a quality gate. A
        SOC dashboard annotates a metric the moment a detection rule fires. A
        financial report marks a figure that failed reconciliation, with the
        reconciliation run id baked in so a regulator can trace it. A model-monitoring
        view flags a drift threshold breach with a confidence below 1, distinct from
        the deterministic rules around it. In every case the value is the same: the
        chart stops merely showing the data and starts telling you whether to trust it.
      </p>

      <h2>Related</h2>
      <ul>
        <li>
          <Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link>{" "}
          — the annotation metadata this bridge stamps, and the freshness/status
          treatments it composes with.
        </li>
        <li>
          <Link to="/intelligence/data-pitfalls">Experimental Data Pitfalls Bridge</Link> — the
          sibling adapter that turns data-viz pitfalls into a reasoning chain.
        </li>
        <li>
          <Link to="/interoperability/portability-spec">Portability Spec</Link> — the
          library-neutral schema that lets this provenance travel beyond Semiotic.
        </li>
      </ul>
    </PageLayout>
  )
}
