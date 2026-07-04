/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"
import { Scatterplot } from "semiotic"

// ---------------------------------------------------------------------------
// Demo data + frame
// ---------------------------------------------------------------------------

const scatter = [
  { x: 10, y: 20, id: "A" },
  { x: 25, y: 35, id: "B" },
  { x: 40, y: 18, id: "C" },
  { x: 55, y: 46, id: "D" },
  { x: 70, y: 30, id: "E" },
  { x: 85, y: 52, id: "F" },
]

const chartFrame = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 12,
  margin: "20px 0",
  background: "var(--surface-1)",
}

function EmphasisDemo() {
  return (
    <div style={chartFrame}>
      <Scatterplot
        width={560}
        height={300}
        data={scatter}
        xAccessor="x"
        yAccessor="y"
        pointRadius={5}
        pointIdAccessor="id"
        annotations={[
          { type: "callout", pointId: "B", label: "Secondary context", emphasis: "secondary", radius: 12, dx: 28, dy: 36 },
          { type: "callout", pointId: "F", label: "Primary insight", emphasis: "primary", radius: 14, dx: -96, dy: -18 },
        ]}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        Two callouts, one <code>emphasis: "primary"</code> and one{" "}
        <code>"secondary"</code>. The secondary note dims and yields z-order; the
        primary paints at full weight, on top.
      </p>
    </div>
  )
}

function ConnectorDemo() {
  return (
    <div style={chartFrame}>
      <Scatterplot
        width={560}
        height={300}
        data={scatter}
        xAccessor="x"
        yAccessor="y"
        pointRadius={5}
        pointIdAccessor="id"
        annotations={[
          { type: "callout", pointId: "C", label: "Straight", radius: 10, dx: 55, dy: 45, connector: { end: "arrow" } },
          { type: "callout", pointId: "D", label: "Curved", radius: 10, dx: 64, dy: -46, connector: { type: "curve", end: "arrow" } },
        ]}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        The same callout with a default straight connector and an opt-in{" "}
        <code>{`connector: { type: "curve" }`}</code>. The arrowhead re-aligns to
        the curve's tangent.
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
        Nine years ago I argued that annotations should be first-class citizens
        in data visualization — produced with the same rigor as the marks they
        sit on, not hand-drawn in Illustrator after the chart is "done." That
        argument didn't fully land at the time, because reading a chart was
        treated as a solitary act. It isn't anymore. An AI is always on, always
        ready to mark a point and tell you why. The moment a chart becomes a
        surface that an agent, a watcher, and a human all write to, the
        annotation stops being decoration and becomes the unit of the
        conversation. This release gives annotations what that role requires:
        hierarchy, better connectors, and — most importantly — a record of where
        a note came from and how it ages.
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        In the{" "}
        <Link to="/intelligence/interrogation">conversational substrate</Link>{" "}
        an annotation is the thing that persists. A user clicks a mark and asks
        "why did this spike?"; an answer comes back <em>and a callout is added to
        the chart</em>. A latency watcher flags an anomaly at 2 a.m. and leaves a
        note. The next reader opens a chart that has accumulated interpretive
        history. That history is only trustworthy if each note carries its
        provenance — who wrote it, on what basis, with what confidence — and its
        lifecycle — whether it still applies as the data moves, and whether the
        team still believes it. Without that, a conversational chart accumulates
        truth, error, speculation, and institutional folklore in one
        undifferentiated pile. First-class annotations are the precondition for
        telling them apart.
      </p>
      <p>
        None of the additions below are breaking. Every existing annotation
        array renders exactly as before; the new capabilities are opt-in fields
        that ride along on the annotation objects you already pass.
      </p>

      <h2 id="hierarchy">Hierarchy: one note leads</h2>
      <p>
        When a chart carries several annotations, they shouldn't all shout at the
        same volume. Any annotation now accepts{" "}
        <code>emphasis: "primary" | "secondary"</code> — the same token charts
        already use for dashboard hierarchy, now per-note. A <code>secondary</code>{" "}
        annotation dims and drops behind; a <code>primary</code> one paints at
        full weight and on top. It's applied type-agnostically, so it works for
        every annotation type, and the dim composes with the freshness treatment
        — a stale, secondary note becomes the quietest thing on the chart.
      </p>
      <EmphasisDemo />

      <h2 id="connectors">Connectors that swoop</h2>
      <p>
        Connectors were straight lines only. They're still the default, but you
        can now opt into a curved, swoopy connector — the kind hand-drawn
        annotation layers have always reached for — with{" "}
        <code>{`connector: { type: "curve" }`}</code>. The <code>curve</code>{" "}
        value controls how far it bows; the arrowhead follows the curve's
        tangent so it still points cleanly at its subject.
      </p>
      <ConnectorDemo />

      <h2 id="provenance">Where a note came from</h2>
      <p>
        The bigger change is metadata. An annotation can now carry a{" "}
        <code>provenance</code> block that separates three things the field
        usually collapses: <strong>who</strong> made it
        (<code>authorKind</code>: human, agent, watcher, system),{" "}
        <strong>how</strong> its claim was derived (<code>basis</code>: a hand
        note, a statistical test, a rule, an LLM inference, an external source),
        and a coarse origin label (<code>source</code>). A human can relay a
        statistical-test basis; an agent can relay a human note. Keeping the
        actor and the evidence separate lets a reader — or another agent — weight
        a note by the strength of its evidence, not just by who left it.
      </p>
      <pre style={preStyle}>{`import { withProvenance } from "semiotic/ai"

const note = withProvenance(
  { type: "callout", x: "2026-W14", y: 9, label: "Deploy-correlated spike" },
  {
    provenance: {
      authorKind: "watcher",
      basis: "statistical-test",
      confidence: 0.78,
      createdAt: "2026-04-02T14:32:00Z",
      dataVersion: "2026-W14",
    },
  }
)`}</pre>
      <p>
        This is the schema from the Intent-Driven Information Design framework's{" "}
        <code>ChartAnnotationProvenance</code>, now shipping in the reference
        implementation — so a reviewer who clones the repo finds what the paper
        describes.
      </p>

      <h2 id="lifecycle">Two ways a note ages</h2>
      <p>
        "How does this note age?" turns out to be two independent questions. The{" "}
        <strong>temporal</strong> axis — <code>freshness</code>, derived from{" "}
        <code>createdAt</code> + <code>ttlHint</code> — answers <em>does this
        still apply as the data moves?</em> Aging notes dim, stale notes dash,
        expired notes drop out. The <strong>editorial</strong> axis —{" "}
        <code>status</code>: proposed, accepted, disputed, retracted, with a{" "}
        <code>supersedes</code> link — answers <em>do we still believe it?</em>{" "}
        A note can be fresh but disputed, or stale but accepted; the two don't
        collapse into one. A watcher leaves a note <code>"proposed"</code>; a
        human accepts or disputes it; a revision supersedes it. That's how a
        conversational chart's accumulated notes stay legible instead of turning
        into sediment.
      </p>

      <h2 id="binding">Notes stay bound to their data</h2>
      <p>
        Underneath all of this is the promise that makes annotations worth
        treating as first-class: a note is bound to its <em>data</em>, not to a
        position or an array index. Sort the data, filter it, stream new points
        past it, zoom the axis — a value-anchored annotation resolves through the
        scale every render and lands on the same data point. That guarantee is
        now locked by a regression test, because it's the one property we most
        want to never silently break.
      </p>

      <h2 id="where-this-goes">Where this goes</h2>
      <p>
        The same pattern shows up well beyond a single dashboard. An incident
        timeline accumulates on-call annotations that later feed a postmortem. A
        financial chart carries analyst notes that must be distinguishable from
        model output when the chart is forwarded to a board. A scientific figure
        travels into a paper stripped of its original context — and a defensive,
        provenanced caveat is what survives the trip. In every case the question
        is the same: when a note outlives the moment it was made, what does it
        need to carry to still be trustworthy? Hierarchy, lifecycle, and
        provenance are the start of that answer.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/annotations/overview">Annotations Overview</Link> — the
          type catalog, plus the new emphasis and curved-connector sections.
        </li>
        <li>
          <Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link>{" "}
          — the full field reference, freshness treatment, and anchor modes.
        </li>
        <li>
          <Link to="/annotations/advanced">Advanced Annotations</Link> — widget
          annotations and interactive in-data-space content.
        </li>
        <li>
          <Link to="/intelligence/conversation-arc">Conversation Arc</Link> — the
          session-arc store that anchored notes become nodes in.
        </li>
      </ul>
    </>
  )
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

export default {
  slug: "what-an-annotation-should-carry",
  title: "What an Annotation Should Carry",
  subtitle:
    "Annotations become first-class objects: a hierarchy token, curved connectors, and — the real change — provenance and a two-axis lifecycle so a note records who made it, on what basis, and whether it still holds.",
  author: "Elijah Meeks",
  date: "2026-07-03",
  tags: ["case-study"],
  excerpt:
    "Once a chart is a surface that agents, watchers, and humans all write to, the annotation becomes the unit of the conversation. This is the release that gives annotations what that role requires: emphasis hierarchy, swoopy connectors, and provenance + lifecycle metadata aligned with the IDID conversational substrate.",
  component: Body,
  ogChart: { component: "Scatterplot" },
}
