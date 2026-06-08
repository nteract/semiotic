/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"
import { Scatterplot } from "semiotic"

const META = {
  slug: "annotations-that-make-room-and-make-sense",
  title: "Annotations That Make Room and Make Sense",
  subtitle:
    "Keep the annotation layer legible: a density budget sheds the lowest-priority notes when a chart gets crowded, and a redundant-cue default ties a colored note to its target with a spatial line instead of color alone.",
  author: "Elijah Meeks",
  date: "2026-06-08",
  tags: ["case-study", "roadmap"],
  excerpt:
    "After hierarchy and placement, the next two annotation milestones handle the failure modes that show up at scale: too many notes, and notes that only connect to their target by color. This is achieved via an opt-in density budget with progressive disclosure and an accessibility audit for color-only association and an opt-in redundant leader-line cue.",
}

const scatter = [
  { x: 12, y: 24, id: "A" },
  { x: 24, y: 34, id: "B" },
  { x: 46, y: 50, id: "C" },
  { x: 50, y: 50, id: "D" },
  { x: 54, y: 50, id: "E" },
  { x: 74, y: 80, id: "F" },
  { x: 80, y: 52, id: "G" },
  { x: 88, y: 46, id: "H" },
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

function DensityDemo() {
  return (
    <div style={chartFrame}>
      <Scatterplot
        width={560}
        height={300}
        data={scatter}
        xAccessor="x"
        yAccessor="y"
        xExtent={[0, 100]}
        yExtent={[0, 100]}
        pointRadius={6}
        pointIdAccessor="id"
        autoPlaceAnnotations={{ density: { maxAnnotations: 3 } }}
        annotations={[
          {
            type: "callout",
            pointId: "F",
            label: "Main claim (kept)",
            emphasis: "primary",
            radius: 14,
          },
          { type: "label", pointId: "A", label: "Note A" },
          { type: "label", pointId: "B", label: "Note B" },
          { type: "label", pointId: "C", label: "Note C" },
          { type: "label", pointId: "G", label: "Note G" },
          { type: "label", pointId: "H", label: "Note H" },
        ]}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        Keep the primary note and sheds the lowest-priority labels once the plot is over its budget.
        The primary note is never dropped.
      </p>
    </div>
  )
}

function AssociationDemo() {
  return (
    <div style={chartFrame}>
      <Scatterplot
        width={560}
        height={300}
        data={scatter}
        xAccessor="x"
        yAccessor="y"
        xExtent={[0, 100]}
        yExtent={[0, 100]}
        pointRadius={6}
        pointIdAccessor="id"
        autoPlaceAnnotations={{ redundantCues: true }}
        annotations={[
          {
            type: "text",
            pointId: "B",
            label: "Echoes the series color",
            color: "#d7263d",
            dx: 44,
            dy: -30,
          },
        ]}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        Give a colored, offset <code>text</code> note a faint leader line back to its anchor to
        provide a spatial cue a color-blind reader can follow, instead of relying on hue matching.
      </p>
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Semiotic accounts for hierarchy and placement in how it renders annotations but it also
        provides support for the failure states when a chart has more than a couple of notes: there
        are <em>too many</em> of them, and some of them tie to their target by <em>color alone</em>.
      </p>

      <h2 id="m3">A density budget, with a floor</h2>
      <p>
        Past a certain count, more annotation is less communication. Semiotic has an opt-in density
        pass: it derives a budget from the plot area (roughly one note per 20,000 px², or an
        explicit <code>maxAnnotations</code> cap) and sheds the lowest-priority notes when the chart
        exceeds it. Priority is not invented for this feature--it reuses the signals already on the
        annotation: <code>emphasis</code> first (a <code>primary</code> note is the floor and is
        never shed), then <code>provenance.confidence</code>, then <code>lifecycle.freshness</code>{" "}
        (an <code>expired</code> note goes first). Reference lines, bands, and statistical overlays
        never count toward the budget.
      </p>
      <DensityDemo />
      <p>
        The switch lives inside the same placement config, because density only makes sense after
        you know where things land:
      </p>

      <pre style={preStyle}>{`<Scatterplot
  data={data}
  xAccessor="x"
  yAccessor="y"
  autoPlaceAnnotations={{ density: { maxAnnotations: 3 } }}
  annotations={[
    { type: "callout", pointId: "peak", label: "Main claim", emphasis: "primary" },
    { type: "label", pointId: "a", label: "Note A" },
    { type: "label", pointId: "b", label: "Note B" },
    // ...lowest-priority notes shed first
  ]}
/>`}</pre>

      <p>
        "Hover is not guaranteed," so dropping notes outright is the default. But when an
        interaction surface exists, <code>progressiveDisclosure: true</code> keeps the shed notes in
        the DOM, hidden until the chart is hovered or focused, and reveals them then. The persistent
        set is always rendered so that a non-hover reader still receives them. The raw split is also
        available as a pure function:
      </p>

      <pre style={preStyle}>{`import { annotationDensity, annotationBudget } from "semiotic/recipes"

const { visible, deferred, budget } = annotationDensity({
  annotations,
  width: 600,
  height: 400,
})`}</pre>

      <p>
        And the diagnostic side: <code>diagnoseConfig</code> raises an advisory{" "}
        <code>ANNOTATION_DENSITY</code> warning when note count exceeds the same budget.
      </p>

      <h2 id="m4">Association you can actually follow</h2>
      <p>
        The correspondence problem is the failure mode when a note connects to its target by color,
        and the reader can't make the match because the colors aren't discriminable, or because the
        reader is color-blind, or because the reader is using a screen reader and never sees color
        at all. Labels and callouts already draw a connector; enclosures wrap their subject;
        reference lines span the plot. The gap is the <code>text</code> note, which draws no
        connector. For instance, a colored, offset <code>text</code> note is the classic color-only
        case.
      </p>
      <AssociationDemo />
      <p>
        For this, we have the audit itself: <code>auditAccessibility</code> emits{" "}
        <code>perceivable.annotation-association</code>, a warning when a colored note has no
        connector, enclosure, or reference-line cue, distilled into capability caveats through the
        existing <code>accessibilityCaveats</code> path. There is also the default behavior via{" "}
        <code>{`autoPlaceAnnotations: { redundantCues: true }`}</code> that gives the colored{" "}
        <code>text</code> note a faint leader line from the note back to its anchor. The cue is{" "}
        <em>spatial</em>, not another color, so it survives color-blindness. The audit treats{" "}
        <code>redundantCues</code> as satisfying the check.
      </p>

      <pre style={preStyle}>{`<Scatterplot
  data={data}
  xAccessor="x"
  yAccessor="y"
  autoPlaceAnnotations={{ redundantCues: true }}
  annotations={[
    { type: "text", pointId: "b", label: "Echoes the series color",
      color: "#d7263d", dx: 44, dy: -30 },
  ]}
/>`}</pre>

      <p>
        Connector-necessity, the inverse smell, was already covered: <code>diagnoseConfig</code>{" "}
        flags a far note with no connector (<code>ANNOTATION_FAR_NO_CONNECTOR</code>) and a very
        long connector whose target could have been adjacent (<code>ANNOTATION_LONG_CONNECTOR</code>
        ) reflect the research position to prefer adjacency and only use connectors that isn't
        possible.
      </p>

      <h2 id="why">Why these two belong together</h2>
      <p>
        Dealing with note density and connector behavior are both about the annotation layer staying
        legible under load. Density keeps the layer from drowning the marks; association keeps each
        surviving note tied to the thing it describes, for every reader. Together with hierarchy and
        placement, they move Semiotic's annotations toward a larger goal: a communicative layer
        engineered with the same care as the data marks. That requires it to not only display nice
        annotations it also means it should degrade gracefully for the readers who can't rely on
        color or hover.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/annotations/overview">Annotations Overview</Link> includes live density,
          progressive-disclosure, and redundant-cue examples.
        </li>
        <li>
          <Link to="/blog/annotations-that-lead-and-land/">Annotations That Lead and Land</Link>{" "}
          covers the hierarchy and placement work these build on.
        </li>
        <li>
          <Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link> explains
          the confidence and freshness signals the density budget reads.
        </li>
      </ul>
    </>
  )
}

export default {
  ...META,
  component: Body,
  ogChart: { component: "Scatterplot" },
  draft: true,
}
