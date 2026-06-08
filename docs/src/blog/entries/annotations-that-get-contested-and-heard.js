/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"
import { LineChart, buildNavigationTree, AccessibleNavTree } from "semiotic"
import { applyAnnotationStatus } from "semiotic/ai"

const META = {
  slug: "annotations-that-get-contested-and-heard",
  title: "Annotations That Get Contested, and Heard",
  subtitle:
    "Editorial status makes a note something a team can dispute, supersede, and retract to become the natural-language bridge that makes every note something a non-visual reader actually encounters, in the description and in the navigation tree.",
  author: "Elijah Meeks",
  date: "2026-06-10",
  tags: ["case-study", "roadmap", "accessibility"],
  excerpt:
    "Annotations need to be well-placed, un-crowded, legibly associated, responsive, and defensible. But they also need to know where they are in the annotation lifecycle: proposed / accepted / disputed / retracted, supersession chains, and conversation-arc events. This way, a note becomes the durable node that captures conversation and meaning-making. Annotations lead the chart description and get their own branch in the navigation tree, so a screen-reader user meets the author's intent head-on.",
}

const data = [
  { month: "Jan", sales: 4200 },
  { month: "Feb", sales: 5100 },
  { month: "Mar", sales: 6800 },
  { month: "Apr", sales: 4600 },
  { month: "May", sales: 5200 },
  { month: "Jun", sales: 7100 },
]

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

const STATUS_ANNOTATIONS = [
  {
    type: "callout",
    x: "Mar",
    y: 6800,
    label: "Confirmed peak",
    dx: -40,
    dy: -30,
    lifecycle: { status: "accepted" },
  },
  {
    type: "callout",
    x: "Apr",
    y: 4600,
    label: "Watcher flagged dip",
    dx: 10,
    dy: 40,
    lifecycle: { status: "proposed" },
  },
  {
    type: "callout",
    x: "Jun",
    y: 7100,
    label: "Spike contested",
    dx: -50,
    dy: -30,
    lifecycle: { status: "disputed" },
  },
  {
    type: "callout",
    x: "Feb",
    y: 5100,
    label: "Withdrawn note",
    dx: 10,
    dy: 40,
    lifecycle: { status: "retracted" },
  },
]

function StatusDemo() {
  const treated = React.useMemo(() => applyAnnotationStatus(STATUS_ANNOTATIONS), [])
  return (
    <div style={chartFrame}>
      <LineChart
        width={560}
        height={300}
        data={data}
        xAccessor="month"
        yAccessor="sales"
        annotations={treated}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        Four notes with four editorial states. The disputed note wears a <code>(?)</code>, the
        proposed watcher note reads provisionally, the retracted note is gone, and the accepted note
        paints at full weight.
      </p>
    </div>
  )
}

const NAV_PROPS = {
  data,
  xAccessor: "month",
  yAccessor: "sales",
  annotations: [
    { type: "callout", x: "Mar", label: "Quarter-end peak" },
    { type: "y-threshold", y: 6000, label: "Target", provenance: { authorKind: "agent" } },
    { type: "callout", x: "Jun", label: "Spike contested", lifecycle: { status: "disputed" } },
  ],
}

function NavDemo() {
  const tree = React.useMemo(() => buildNavigationTree("LineChart", NAV_PROPS), [])
  return (
    <div style={chartFrame}>
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 8px 8px" }}>
        Expand <strong>Annotations</strong> to hear the notes the way a screen-reader user would
        with provenance and status read aloud.
      </p>
      <AccessibleNavTree
        tree={tree}
        label="Monthly sales with author notes exposing a navigable structure"
        visible
      />
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Semiotic's annotation layer is well-placed, un-crowded, legibly associated to its target,
        responsive to space and reader, and defensible when the chart travels. That's all about
        display. But annotations are durable artifacts of meaning and that requires a way to treat
        them not just as marks but also as units of conversation: a note you can{" "}
        <em>argue about</em>, and a note a non-visual reader can <em>actually receive</em>.
      </p>

      <h2 id="m7">The editorial half of the lifecycle</h2>
      <p>
        Semiotic already modeled the <em>temporal</em> lifecycle (does this note still apply as the
        data ages (<code>freshness</code>)?) but we also need to treat the orthogonal{" "}
        <em>editorial</em> lifecycle. Is this note still believed? The two are independent: a note
        can be fresh-but-disputed or stale-but-accepted. Status moves through a small state machine
        through <code>proposed</code> (a watcher placed it, unreviewed) → <code>accepted</code> /{" "}
        <code>disputed</code> → <code>retracted</code> and finally <code>supersedes</code> links a
        revision to the note it replaces.
      </p>
      <p>
        <code>applyAnnotationStatus</code> turns that standing into a default visual treatment, the
        editorial companion to <code>applyAnnotationLifecycle</code>'s temporal one. Crucially the
        opacity <em>multiplies</em> in, so freshness, importance (<code>emphasis</code>), and status
        compose as three independent dims of one render.
      </p>
      <StatusDemo />
      <pre
        style={preStyle}
      >{`import { applyAnnotationStatus, applyAnnotationLifecycle } from "semiotic/ai"

// Temporal first, then editorial.
const treated = applyAnnotationStatus(
  applyAnnotationLifecycle(annotations, { dataExtent })
)`}</pre>
      <p>
        It also resolves supersession (a note replaced by a present, non-retracted revision is
        hidden), and the transitions are <em>observable</em>:{" "}
        <code>recordAnnotationStatusChange("disputed", {"{ annotationId, fromStatus }"})</code>{" "}
        drops an event into the <Link to="/intelligence/conversation-arc">conversation arc</Link>.
        That's the point where an annotation stops being chart decoration and becomes the durable
        node the arc is <em>about</em>.
      </p>

      <h2 id="natural-language-bridge">The natural-language bridge</h2>
      <p>
        An author-placed annotation is intent in its purest form. It should be the first thing a
        reader who can't see the chart hears, not an afterthought. That's why Semiotic wires
        annotations into the two surfaces that speak to non-visual and agent readers.
      </p>
      <p>
        First, the <strong>description</strong>:{" "}
        <Link to="/accessibility/descriptions">
          <code>describeChart</code>
        </Link>{" "}
        now <em>leads</em> with the author's notes: "The author has marked 2 features on this chart:
        a callout labeled 'Quarter-end peak', and an AI-suggested threshold line labeled 'Target'."
        . It does this ahead of the encoding, statistics, and trend. Provenance shapes the phrasing:
        an agent- or watcher-authored note reads as such.
      </p>
      <p>
        Second, the <strong>navigation tree</strong>:{" "}
        <Link to="/accessibility/navigation">
          <code>buildNavigationTree</code>
        </Link>{" "}
        adds an Annotations branch, so a screen-reader user <em>encounters</em> the notes while
        traversing the structure. This is the same way we expose the axes and series. Each node
        reuses the description's vocabulary and surfaces its editorial status inline.
      </p>
      <NavDemo />
      <pre
        style={preStyle}
      >{`buildNavigationTree("LineChart", { data, xAccessor, yAccessor, annotations })
// → root
//   ├ X axis / Value axis / data points…
//   └ Annotations: 3 marked features.
//       ├ A callout labeled "Quarter-end peak".
//       ├ An AI-suggested threshold line labeled "Target".
//       └ A callout labeled "Spike contested" (disputed).`}</pre>
      <p>
        It works on every chart family, including network, hierarchy, and geo charts that otherwise
        return a root-only node. They still get their annotations branch, so the author's intent is
        always reachable.
      </p>

      <h2 id="why">Contested, and heard</h2>
      <p>
        Every annotation needs to address two halves of the same question: does this note still
        carry weight, and does it reach the reader? Editorial status makes a note something a team
        can dispute, supersede, and retract, with every move recorded. Making them accessible makes
        sure that whatever survives that process is delivered to the readers who can't rely on
        pixels. Together they make annotations into first-class, data-bound, well-crafted,
        audience-aware, contestable, and receivable objects. Annotations should be the
        conversational substrate and meaning layer of a chart, not just decoration.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link> — the
          status treatment, supersession, and the arc-event helper, with live examples.
        </li>
        <li>
          <Link to="/accessibility/navigation">Structured Navigation</Link> — the annotations branch
          in the navigation tree.
        </li>
        <li>
          <Link to="/blog/annotations-that-adapt-and-travel/">
            Annotations That Adapt and Travel
          </Link>{" "}
          — the responsive, cohesion, audience, and defensive work these build on.
        </li>
      </ul>
    </>
  )
}

export default {
  ...META,
  component: Body,
  ogChart: { component: "LineChart" },
  draft: true,
}
