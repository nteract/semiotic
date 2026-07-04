/* eslint-disable react/no-unescaped-entities */
import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { LineChart } from "semiotic"
import {
  fromDbtArtifacts,
  fromGreatExpectations,
  applyAnnotationLifecycle,
  applyAnnotationStatus,
} from "semiotic/ai"

// ---------------------------------------------------------------------------
// Demo data: daily transaction volume; upstream pipeline stalls on day 10
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000
const START = Date.parse("2026-06-08T00:00:00Z")
const STALL_AT = START + 10 * DAY

const VOLUME = Array.from({ length: 14 }, (_, i) => {
  const t = START + i * DAY
  const value = i < 10 ? 980 + Math.round(Math.sin(i * 0.7) * 90) : 230 - i * 4
  return { t, value }
})

const DBT_SOURCES = {
  metadata: { generated_at: "2026-06-21T08:00:00Z", invocation_id: "inv-7f3a" },
  results: [
    {
      unique_id: "source.shop.raw.transactions",
      status: "error",
      max_loaded_at: new Date(STALL_AT).toISOString(),
    },
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

function BridgeDemo() {
  const [on, setOn] = useState(true)
  const { annotations } = useMemo(() => {
    const opts = { ttlHint: "P2D" }
    const dbt = fromDbtArtifacts({ sources: DBT_SOURCES }, opts)
    const ge = fromGreatExpectations(GE_VALIDATION, opts)
    const merged = [...dbt.annotations, ...ge.annotations]
    const aged = applyAnnotationStatus(
      applyAnnotationLifecycle(merged, { now: Date.parse("2026-06-21T08:00:00Z") }),
    )
    return { annotations: aged }
  }, [])

  return (
    <div style={chartFrame}>
      <LineChart
        data={VOLUME}
        xAccessor="t"
        yAccessor="value"
        xScaleType="time"
        title={on ? "Transaction volume — 1 alert" : "Transaction volume"}
        width={560}
        height={300}
        lineWidth={2}
        annotations={on ? annotations : []}
        margin={{ top: 30, right: 24, bottom: 40, left: 56 }}
        xFormat={(t) =>
          new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        }
      />
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          cursor: "pointer",
          marginTop: 6,
        }}
      >
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
        Bridge the dbt freshness + Great Expectations failures onto the chart
      </label>
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "6px 6px 0" }}>
        Off, it's just a line that drops. On, the dbt freshness failure becomes a danger threshold
        at the last good load and the Great Expectations range check becomes a band marking where
        volume should have been — each with a provenanced, proposed-status label.
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
        A dashboard that silently renders broken data is worse than no dashboard — it launders a
        pipeline failure into a confident-looking chart. The fix isn't a separate "data quality" tab
        nobody opens. It's putting the quality signal where the reader is already looking:{" "}
        <em>on</em> the chart, as an annotation that says who found the problem, how, when, and
        against which data snapshot. Semiotic's new data-truth bridge does that from the artifacts
        your pipeline already produces — a dbt source-freshness result, a Great Expectations
        validation — with no new infrastructure.
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        Every BI tool will generate insight text <em>beside</em> a chart. Almost none put a
        provenance-tracked claim <em>on</em> it — and provenance is the whole game when a chart
        accumulates signals from a deterministic rule, a statistical expectation, and (increasingly)
        an AI guess. A reader needs to tell those apart. A failed <code>not_null</code> test is a
        hard rule (confidence 1). A drift threshold from a model monitor is a probabilistic claim
        (confidence 0.7, and you want to see the 0.7). Collapsing them into one undifferentiated
        "alert" is how dashboards lose trust. The bridge keeps the distinction by stamping each
        annotation with a <code>basis</code> and a <code>confidence</code>, and it keeps alerts from
        crying wolf forever by giving each one a lifecycle, so a week-old freshness warning dims and
        dashes on its own.
      </p>
      <p>
        It's also, deliberately, a <strong>read-only overlay</strong>. The bridge parses what your
        data-quality system emits and never writes back into it. dbt and Great Expectations own the
        checks, the governance, and the execution; Semiotic owns only the visual and its provenance.
        Clicking the chart does not trigger a dbt run.
      </p>

      <h2 id="demo">Report, then alert</h2>
      <BridgeDemo />

      <h2 id="provenance">What the annotation carries</h2>
      <p>
        Each generated annotation is an ordinary Semiotic annotation with two extra blocks.{" "}
        <code>provenance</code> records a system author, a rule basis, and the dbt{" "}
        <code>invocation_id</code> as the <code>dataVersion</code> — so a reader can trace the alert
        back to the exact run that produced it. <code>lifecycle</code> records a{" "}
        <code>proposed</code> status, a TTL, and a <code>semantic</code> anchor so the note
        re-resolves to the right point after the data refreshes.
      </p>
      <pre style={preStyle}>{`import {
  fromDbtArtifacts,
  fromGreatExpectations,
  applyAnnotationLifecycle,
} from "semiotic/ai"

const dbt = fromDbtArtifacts({ sources, runResults }, { ttlHint: "P2D" })
const ge  = fromGreatExpectations(validation, { ttlHint: "P2D" })

const annotations = applyAnnotationLifecycle(
  [...dbt.annotations, ...ge.annotations],
  { now: Date.now() }            // ages the alerts: fresh -> aging -> stale
)`}</pre>

      <h2 id="refuses">What it refuses to place</h2>
      <p>
        Not every check has a place on a chart. A uniqueness expectation or a <code>not_null</code>{" "}
        test asserts a property of a column with no single coordinate. The bridge could drop a
        marker somewhere plausible — and that's exactly the failure mode to avoid, because a
        plausible-but-wrong mark lands right where a non-expert reader will trust it. So instead it
        returns those in an <code>unplaced</code> list <em>with a reason</em>, for the host to
        render as a chart-level badge it has the context to place. A 70%-faithful adapter that
        announces its 30% gap is an asset; a 95%-faithful one that hides its 5% is a liability.
      </p>
      <pre style={preStyle}>{`const { annotations, unplaced } = fromGreatExpectations(validation)

unplaced // [{ result: {...}, reason: "uniqueness check on \\"id\\" has no
         //    single chart coordinate; surface it as a chart-level badge" }]`}</pre>

      <h2 id="when">When to reach for it</h2>
      <p>
        Reach for it when a chart sits downstream of a quality gate and the reader needs to know
        whether to trust what they're seeing: a metrics dashboard fed by dbt, an analytics view
        validated by Great Expectations, a model-monitoring chart where a drift breach should be
        visible and distinct from the hard rules around it. Don't reach for it as a replacement for
        your data-quality system — it has no opinion about <em>what</em> to test, only about how to
        show the result. And don't expect it to place every check; the ones with no coordinate are
        handed back on purpose.
      </p>

      <h2 id="where-this-goes">Where this goes</h2>
      <p>
        The same shape recurs anywhere a chart is downstream of a gate. A SOC dashboard annotates a
        metric the moment a detection rule fires. A financial report marks a figure that failed
        reconciliation, with the reconciliation run id baked in so a regulator can trace it. A
        scientific figure travels into a paper carrying a provenanced caveat that survives the trip.
        In each case the chart stops merely showing the data and starts telling you whether to
        believe it — which is the difference between a chart that renders and a chart that
        communicates.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/data-quality-bridge">Data-Truth Bridge</Link> — the
          interactive page with the freshness-decay control and the full provenance payload.
        </li>
        <li>
          <Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link> — the
          annotation metadata this bridge stamps, and the treatments it composes with.
        </li>
        <li>
          <Link to="/interoperability/portability-spec">Portability Spec</Link> — the
          library-neutral schema that lets this provenance travel beyond Semiotic.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "when-the-pipeline-breaks",
  title: "When the Pipeline Breaks, the Chart Should Say So",
  subtitle:
    "Semiotic's data-truth bridge turns dbt freshness failures and Great Expectations validations into provenanced, lifecycled annotations on the chart — so a stale or out-of-bounds series announces itself instead of laundering a pipeline failure into a confident-looking line.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study", "xy"],
  excerpt:
    "A dashboard that silently renders broken data is worse than none. The data-truth bridge puts the quality signal where the reader is already looking — on the chart, as an annotation carrying who found the problem, how, when, and against which data snapshot — from the dbt and Great Expectations artifacts your pipeline already produces. Read-only, and honest about what it can't place.",
  component: Body,
  ogChart: { component: "LineChart" },
  draft: true,
}
