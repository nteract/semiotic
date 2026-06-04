import React from "react"
import { LineChart } from "semiotic"
import { applyAnnotationStatus } from "semiotic/ai"

import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { week: 1, score: 12 },
  { week: 2, score: 18 },
  { week: 3, score: 15 },
  { week: 4, score: 24 },
  { week: 5, score: 20 },
  { week: 6, score: 28 },
  { week: 7, score: 32 },
  { week: 8, score: 27 },
  { week: 9, score: 35 },
  { week: 10, score: 30 },
]

// ---------------------------------------------------------------------------
// Table styles (matches the Annotations overview page)
// ---------------------------------------------------------------------------

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  borderBottom: "1px solid var(--surface-3)",
  fontWeight: 600,
}
const tdStyle = { padding: "8px 16px", borderBottom: "1px solid var(--surface-3)" }
const tdCodeStyle = {
  ...tdStyle,
  fontFamily: "var(--font-code)",
  fontSize: "0.9em",
}

function Table({ head, rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
      <thead>
        <tr style={{ background: "var(--surface-2)" }}>
          {head.map((h) => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} style={{ background: i % 2 ? "var(--surface-1)" : "transparent" }}>
            {cells.map((c, j) => (
              <td key={j} style={j === 0 ? tdCodeStyle : tdStyle}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnnotationProvenancePage() {
  return (
    <PageLayout
      title="Provenance & Lifecycle"
      breadcrumbs={[
        { label: "Annotations", path: "/annotations" },
        { label: "Provenance & Lifecycle", path: "/annotations/provenance-lifecycle" },
      ]}
      prevPage={{ title: "Advanced Annotations", path: "/annotations/advanced" }}
      nextPage={{ title: "Observation Hooks", path: "/intelligence/observation-hooks" }}
    >
      <p>
        Once an annotation is a first-class object, it can carry <em>who wrote
        it, on what basis, and how it ages</em>. Two optional blocks attach to
        any annotation — <code>provenance</code> and <code>lifecycle</code> —
        without disturbing its existing fields. Existing annotation arrays keep
        working unchanged. The helpers live in <code>semiotic/ai</code>; the
        types are re-exported from the main <code>semiotic</code> entry.
      </p>

      <p>
        This matters most when an annotation is left by an AI or an autonomous
        watcher rather than a person, and when the chart is a durable, shared
        surface that accumulates interpretation over time — the conversational
        substrate described in{" "}
        <Link to="/intelligence/interrogation">Interrogation</Link> and{" "}
        <Link to="/intelligence/conversation-arc">Conversation Arc</Link>. The
        schema is the union of Semiotic's shipped fields and the{" "}
        <code>ChartAnnotationProvenance</code> shape from the Intent-Driven
        Information Design framework.
      </p>

      <CodeBlock
        language="jsx"
        code={`import { withProvenance } from "semiotic/ai"

const annotated = withProvenance(
  { type: "callout", x: "2026-W14", y: 9, label: "Deploy-correlated spike" },
  {
    provenance: {
      authorKind: "watcher",        // who: human | agent | watcher | system
      author: "latency-detector",
      basis: "statistical-test",    // how it was derived (distinct from "who")
      confidence: 0.78,
      createdAt: "2026-04-02T14:32:00Z",
      dataVersion: "2026-W14",
    },
    lifecycle: {
      ttlHint: "P14D",              // fresh for two weeks, then ages
      status: "proposed",           // editorial standing (unreviewed)
      anchor: "semantic",           // re-resolve by stableId on data refresh
    },
  }
)`}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="provenance">Provenance — where a note came from</h2>

      <p>
        Provenance answers three separate questions that the field often
        collapses into one: <strong>who</strong> created the annotation
        (<code>authorKind</code>), <strong>how</strong> its claim was derived
        (<code>basis</code>), and a coarse <strong>origin</strong> label
        (<code>source</code>). A <code>"human"</code> author can relay a
        <code> "statistical-test"</code> basis, so keeping the actor and the
        evidence-type separate lets a reader — or an agent — weight a note by
        the strength of its evidence, not just who left it.
      </p>

      <Table
        head={["Field", "Type", "Meaning"]}
        rows={[
          ["author", "string", "Display name or id of the creator."],
          ["authorKind", `"human" | "agent" | "watcher" | "system" | …`, "The actor category (open union)."],
          ["source", `"user" | "ai" | "import" | …`, "Coarse origin label, kept for back-compat."],
          ["basis", `"human-note" | "statistical-test" | "rule" | "llm-inference" | "external-source" | …`, "Evidence type — how the claim was derived."],
          ["confidence", "number (0–1)", "Confidence in the assertion. Hand-placed ≈ 1; LLM-suggested often < 0.8."],
          ["createdAt", "ISO 8601 string", "When the annotation was created (drives freshness)."],
          ["dataVersion", "string", "The data snapshot the note was made against."],
          ["stableId", "string", "Opaque id that survives data refresh; target of semantic anchoring and supersedes."],
        ]}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="two-axes">Lifecycle has two orthogonal axes</h2>

      <p>
        "How does this note age?" is two questions, not one, and they are
        independent — a note can be <em>fresh but disputed</em>, or{" "}
        <em>stale but accepted</em>. Semiotic models both on the{" "}
        <code>lifecycle</code> block.
      </p>

      <Table
        head={["Axis", "Field", "Question it answers", "Driven by"]}
        rows={[
          ["Temporal", "freshness", "Does this note still apply as the data ages?", "createdAt + ttlHint"],
          ["Editorial", "status", "Is this note accepted or contested by the people and agents arguing about it?", "the accept / dispute / retract flow"],
        ]}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="freshness">Temporal freshness</h2>

      <p>
        <code>computeAnnotationFreshness</code> classifies each annotation into
        a band from its <code>createdAt</code> and <code>ttlHint</code> relative
        to "now"; <code>applyAnnotationLifecycle</code> does that and applies a
        default visual treatment in one pass. Both are pure and SSR-safe. For
        streaming / time-series charts, pass <code>dataExtent</code> so the
        latest data point becomes "now" — freshness then tracks chart-time, not
        wall-clock.
      </p>

      <Table
        head={["Band", "Threshold (× TTL)", "Default visual treatment"]}
        rows={[
          ["fresh", "< 1×", "no change"],
          ["aging", "1× – 1.5×", "opacity 0.55"],
          ["stale", "1.5× – 3×", "opacity 0.35 + dashed (4 4)"],
          ["expired", "≥ 3×", "filtered out (or opacity 0.2 + dashed 2 4 with showExpiredAnnotations)"],
        ]}
      />

      <CodeBlock
        language="jsx"
        code={`import { applyAnnotationLifecycle, currentTimestamp, withCurrentProvenance } from "semiotic/ai"

// Stamp the moment a watcher adds a note…
const note = withCurrentProvenance(
  { type: "y-threshold", value: 90, label: "Latency SLA" },
  { authorKind: "watcher", basis: "rule" }
)

// …then age the whole array against the chart's current time extent.
const treated = applyAnnotationLifecycle([note], {
  dataExtent: data.map(d => d.time),   // latest point becomes "now"
})

<LineChart data={data} xAccessor="time" yAccessor="value" annotations={treated} />`}
      />

      <p>
        Per-band defaults are overridable (pass <code>opacity</code>,{" "}
        <code>strokeDasharray</code>, or <code>labelSuffix</code> maps; set a
        band to <code>null</code> to disable its default). An annotation's own{" "}
        <code>opacity</code> / <code>strokeDasharray</code> always win over the
        treatment.
      </p>

      <p style={{ fontSize: "0.95em", color: "var(--text-secondary)" }}>
        This is one of three temporal systems in Semiotic — see{" "}
        <Link to="/intelligence/temporal-lifecycle">Temporal Lifecycle</Link>{" "}
        for how annotation freshness relates to streaming <code>decay</code> and{" "}
        <code>staleness</code>. They share the <code>bandFromAge</code>{" "}
        primitive but act on different time axes.
      </p>

      {/* ----------------------------------------------------------------- */}
      <h2 id="status">Editorial status</h2>

      <p>
        A conversational chart accumulates truth, error, speculation, and
        institutional folklore. <code>status</code> is the mechanism for
        contesting a note: a watcher leaves it <code>"proposed"</code>, a human
        marks it <code>"accepted"</code> or <code>"disputed"</code>, and{" "}
        <code>"retracted"</code> withdraws it. <code>supersedes</code> links a
        revision to the <code>stableId</code> of the note it replaces, forming a
        revision chain.
      </p>

      <Table
        head={["status", "Meaning"]}
        rows={[
          [`"proposed"`, "Placed but unreviewed (e.g. an autonomous watcher's note)."],
          [`"accepted"`, "Confirmed by a human or agent."],
          [`"disputed"`, "Contested; under review."],
          [`"retracted"`, "Withdrawn; treated like an expired note."],
        ]}
      />

      <p>
        <code>applyAnnotationStatus</code> turns that editorial standing into a
        default visual treatment — the orthogonal companion to{" "}
        <code>applyAnnotationLifecycle</code>'s temporal one. Freshness,
        importance (M1 <code>emphasis</code>), and editorial status are three
        independent dimensions of the same render: a note can be
        stale-and-disputed. Run freshness first, then status, and the opacity
        composes (it multiplies in).
      </p>

      <Table
        head={["status", "Default visual treatment"]}
        rows={[
          [`"accepted"`, "no change (full weight)"],
          [`"proposed"`, "opacity ×0.7 + dashed (3 3) + label suffix “ (proposed)”"],
          [`"disputed"`, "opacity ×0.7 + dashed (2 3) + label suffix “ (?)” — the query affordance"],
          [`"retracted"`, "filtered out (or opacity ×0.25 with showRetractedAnnotations)"],
        ]}
      />

      <p>
        It also resolves <strong>supersession</strong>: a note whose{" "}
        <code>stableId</code> is the <code>supersedes</code> target of another
        present, non-retracted note is hidden — the revision replaced it —
        unless you pass <code>showSupersededAnnotations</code>.
      </p>

      <CodeBlock
        language="jsx"
        code={`import { applyAnnotationStatus, applyAnnotationLifecycle } from "semiotic/ai"

// Temporal first, then editorial — opacity composes (multiplies) across both.
const treated = applyAnnotationStatus(
  applyAnnotationLifecycle(annotations, { dataExtent: data.map(d => d.time) })
)

<LineChart data={data} xAccessor="time" yAccessor="value" annotations={treated} />`}
      />

      <p>
        Below, four notes carry four statuses. The disputed note wears its{" "}
        <code>(?)</code> query affordance, the proposed watcher note reads
        provisionally, the retracted note is gone, and the accepted note paints
        at full weight.
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "week",
          yAccessor: "score",
          xLabel: "Week",
          yLabel: "Score",
          annotations: applyAnnotationStatus([
            { type: "callout", x: 4, y: 24, label: "Confirmed peak", lifecycle: { status: "accepted" } },
            { type: "callout", x: 6, y: 28, label: "Watcher flagged", dx: 20, dy: -36, lifecycle: { status: "proposed" } },
            { type: "callout", x: 7, y: 32, label: "Spike contested", dx: 30, dy: -30, lifecycle: { status: "disputed" } },
            { type: "callout", x: 9, y: 35, label: "Withdrawn note", lifecycle: { status: "retracted" } },
          ]),
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          annotations: `applyAnnotationStatus([
  { type: "callout", x: 4, y: 24, label: "Confirmed peak",
    lifecycle: { status: "accepted" } },
  { type: "callout", x: 6, y: 28, label: "Watcher flagged", dx: 20, dy: -36,
    lifecycle: { status: "proposed" } },   // → "Watcher flagged (proposed)", dimmed
  { type: "callout", x: 7, y: 32, label: "Spike contested", dx: 30, dy: -30,
    lifecycle: { status: "disputed" } },   // → "Spike contested (?)", dimmed
  { type: "callout", x: 9, y: 35, label: "Withdrawn note",
    lifecycle: { status: "retracted" } },  // → filtered out
])`,
        }}
        hiddenProps={{}}
      />

      <p style={{ fontSize: "0.95em", color: "var(--text-secondary)" }}>
        Accept / dispute / retract / propose transitions are also{" "}
        <em>observable</em>: call{" "}
        <code>recordAnnotationStatusChange(toStatus, {`{ annotationId, fromStatus }`})</code>{" "}
        from your review UI and the move lands in the{" "}
        <Link to="/intelligence/conversation-arc">conversation arc</Link> — the
        annotation becomes the durable node the arc is about, not chart chrome.
      </p>

      {/* ----------------------------------------------------------------- */}
      <h2 id="anchors">Anchor modes</h2>

      <p>
        <code>lifecycle.anchor</code> controls how a note re-resolves its
        position as data changes. Mirror it onto the annotation's top-level{" "}
        <code>anchor</code> field (or let <code>applyAnnotationLifecycle</code>{" "}
        do it) so the streaming resolver picks it up.
      </p>

      <Table
        head={["anchor", "Behavior"]}
        rows={[
          [`"fixed"`, "Default. Anchored to fixed data coordinates; disappears when out of view."],
          [`"latest"`, "Re-pins to the most recent datum each frame."],
          [`"sticky"`, "Stays at its last known pixel position after the target scrolls off."],
          [`"semantic"`, "Re-resolves via provenance.stableId when new data arrives, falling back to the recorded coordinate (runtime support landing incrementally)."],
        ]}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="example">Provenance is invisible, but it travels</h2>

      <p>
        Provenance and lifecycle are metadata — the chart below looks like any
        annotated line chart — but they ride along in the config, survive{" "}
        <code>toConfig</code> / <code>fromConfig</code> round-trips, and are
        exactly what an agent or a non-visual reader reads to interpret the note
        faithfully.
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "week",
          yAccessor: "score",
          xLabel: "Week",
          yLabel: "Score",
          annotations: [
            { type: "y-threshold", y: 25, label: "Target (set by analytics)", color: "#22c55e" },
          ],
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          annotations: `[
  {
    type: "y-threshold",
    y: 25,
    label: "Target (set by analytics)",
    color: "#22c55e",
    // provenance / lifecycle ride along invisibly:
    provenance: { authorKind: "agent", basis: "rule", confidence: 0.9 },
    lifecycle: { ttlHint: "P30D", status: "accepted" }
  }
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="helpers">Helpers</h2>

      <ul>
        <li><code>withProvenance(annotation, {`{ provenance?, lifecycle? }`})</code> — attach the blocks (pure).</li>
        <li><code>withCurrentProvenance(annotation, rest?)</code> — stamp <code>createdAt = now</code> unless already set.</li>
        <li><code>currentTimestamp()</code> — ISO 8601 "now" for <code>createdAt</code>.</li>
        <li><code>computeAnnotationFreshness(annotations, options?)</code> — populate <code>lifecycle.freshness</code>.</li>
        <li><code>annotationFreshnessFor(annotation, nowMs, thresholds?)</code> — classify a single annotation.</li>
        <li><code>applyAnnotationLifecycle(annotations, options?)</code> — freshness + default visual treatment.</li>
        <li><code>bandFromAge(ageMs, ttlMs, thresholds?)</code> — the shared lifecycle-band primitive.</li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li><Link to="/annotations/overview">Annotations Overview</Link> — the annotation type catalog, emphasis, and connectors.</li>
        <li><Link to="/intelligence/temporal-lifecycle">Temporal Lifecycle</Link> — decay, staleness, and freshness across three time axes.</li>
        <li><Link to="/intelligence/conversation-arc">Conversation Arc</Link> — the session-arc store annotations become nodes in.</li>
        <li><Link to="/accessibility/navigation">Structured Navigation</Link> — how an anchored note becomes reachable by a non-visual reader.</li>
      </ul>
    </PageLayout>
  )
}
