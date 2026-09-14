import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { LineChart } from "semiotic/line"
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
  const { annotations, unplaced } = useMemo(() => {
    const opts = { ttlHint: "P2D" }
    const dbt = fromDbtArtifacts({ sources: DBT_SOURCES }, opts)
    const ge = fromGreatExpectations(GE_VALIDATION, opts)
    const merged = [...dbt.annotations, ...ge.annotations]
    const aged = applyAnnotationStatus(
      applyAnnotationLifecycle(merged, { now: Date.parse("2026-06-21T08:00:00Z") }),
    )
    return { annotations: aged, unplaced: [...dbt.unplaced, ...ge.unplaced] }
  }, [])

  return (
    <div style={chartFrame}>
      <LineChart
        data={VOLUME}
        xAccessor="t"
        yAccessor="value"
        xScaleType="time"
        title="Daily transaction volume"
        description="Fourteen synthetic daily readings. Volume drops after the tenth reading; the sample quality checks report stale data and values outside the expected range."
        summary={
          on
            ? "The vertical marker identifies the last load. The shaded band spans 800 to 1,200 transactions. A duplicate-ID check is listed below the chart."
            : "Annotations are hidden. The quality warnings remain listed below the chart."
        }
        accessibleTable
        responsiveWidth
        height={300}
        lineWidth={2}
        annotations={on ? annotations : []}
        margin={{ top: 30, right: 24, bottom: 40, left: 56 }}
        xFormat={(t) =>
          new Date(t).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
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
      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 6px 0" }}>
        {on ? `${annotations.length} annotations shown.` : "Annotations hidden."} The source checks
        report a stale feed and a value outside the expected range. The drop alone cannot establish
        why either condition occurred.
      </p>
      <p>
        <strong>Checks without a chart coordinate</strong>
      </p>
      <ul>
        {unplaced.map(({ reason }, index) => (
          <li key={index}>{reason}</li>
        ))}
      </ul>
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
        The transaction line drops sharply. Did customers stop buying, or did the data stop
        arriving? The numbers alone cannot answer that. A data-quality annotation puts a known
        problem beside the values it affects, so the reader can investigate before interpreting the
        drop as a change in the business.
      </p>
      <h2 id="why-care">Why this matters</h2>
      <p>
        A dashboard and its data pipeline are often checked in different places. The person reading
        the dashboard may never see a failed freshness check. Semiotic's data-quality bridge reads
        dbt and Great Expectations results and turns supported checks into chart annotations,
        preserving the system and run that reported them.
      </p>
      <h2 id="demo">Read the drop with its context</h2>
      <p>
        This synthetic example has fourteen daily readings. The vertical threshold marks the last
        recorded load; the horizontal band marks the expected range of 800–1,200 transactions.
        Toggle the annotations to compare the line on its own with the line and those
        qualifications. The data stays the same.
      </p>
      <BridgeDemo />
      <h2 id="provenance">How the alert stays attached to its source</h2>
      <p>
        Each annotation carries provenance: who reported the check, its basis, and an available run
        identifier. Lifecycle metadata records a proposed status and a time-to-live hint. Calling{" "}
        <code>applyAnnotationLifecycle</code> with a later time changes the treatment of an aging
        note. The host must refresh that time; the metadata does not start a clock by itself. This
        demo fixes the clock so its historical sample remains reproducible.
      </p>
      <p>
        A failed rule is evidence about that rule, not proof of the cause of a business change. The
        bridge also does not run checks, repair data, or write back to either quality system. Those
        responsibilities remain with the pipeline and its owner.
      </p>
      <h2 id="unplaced">Some failures belong beside the chart</h2>
      <p>
        A duplicate-ID check has no single time or value to point to. The bridge returns it in
        <code> unplaced</code>, with a reason, instead of inventing a coordinate. The demo shows
        that warning in text below the plot. A complete host should display these results too; an
        empty annotation list does not mean the source passed every check.
      </p>
      <h2 id="wiring">Wiring it up</h2>
      <pre style={preStyle}>{`import {
  fromDbtArtifacts, fromGreatExpectations, applyAnnotationLifecycle,
} from "semiotic/ai"

const dbt = fromDbtArtifacts({ sources }, { ttlHint: "P2D" })
const ge = fromGreatExpectations(validation, { ttlHint: "P2D" })
const annotations = applyAnnotationLifecycle(
  [...dbt.annotations, ...ge.annotations], { now: Date.now() },
)
const unplaced = [...dbt.unplaced, ...ge.unplaced]
// Pass annotations to the chart; show unplaced as text alongside it.`}</pre>
      <h2 id="when">When to reach for it</h2>
      <p>
        Use the bridge when a known quality result helps a reader interpret a dashboard or report.
        Check that its time and value fields match the chart's accessors. For a result that
        describes the whole dataset, use a visible status message or table. Keep your existing
        data-quality system to define and execute the tests.
      </p>
      <h2 id="other-domains">Other places this helps</h2>
      <p>
        A delayed sensor, a failed financial reconciliation, and a laboratory value awaiting review
        all change how a number should be read. A dated, attributable note lets the next reader see
        the qualification even when they were not present for the original check.
      </p>
      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/data-quality-bridge">Data-quality bridge reference</Link>
        </li>
        <li>
          <Link to="/annotations/provenance-lifecycle">Annotation provenance and lifecycle</Link>
        </li>
        <li>
          <Link to="/interoperability/portability-spec">Portable metadata</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "when-the-pipeline-breaks",
  title: "When the Pipeline Breaks, the Chart Should Say So",
  subtitle:
    "Put a known data-quality problem beside the values it affects, with its source, date, and limits intact.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study", "xy"],
  excerpt:
    "A falling line could describe a business change or a broken feed. Toggle annotations from sample dbt and Great Expectations results to see how a reader can tell what needs investigation.",
  component: Body,
  ogChart: { component: "LineChart" },
}
