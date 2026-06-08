/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"
import { Scatterplot } from "semiotic"

const META = {
  slug: "annotations-that-lead-and-land",
  title: "Annotations That Lead and Land",
  subtitle:
    "Move annotations from first-class objects toward design assistance: hierarchy gives notes a reading order, and opt-in placement chooses sensible offsets without taking control away from authors.",
  author: "Elijah Meeks",
  date: "2026-06-07",
  tags: ["case-study", "roadmap"],
  excerpt:
    "Semiotic already treated annotations as data-bound objects. Now it helps authors make design decisions with those objects: primary and secondary notes, inferred reading order from confidence, an accessibility audit hook, and an opt-in annotationLayout recipe that places notes near their targets while avoiding obvious collisions.",
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

function HierarchyDemo() {
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
          {
            type: "callout",
            pointId: "B",
            label: "Useful context",
            emphasis: "secondary",
            radius: 12,
            dx: 34,
            dy: 36,
          },
          {
            type: "callout",
            pointId: "F",
            label: "Main claim",
            emphasis: "primary",
            radius: 14,
            dx: -88,
            dy: -24,
          },
        ]}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        Makes annotation hierarchy explicit: the primary note leads, the secondary note stays
        available without competing for attention.
      </p>
    </div>
  )
}

function PlacementDemo() {
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
        autoPlaceAnnotations={{ defaultOffset: 40, notePadding: 10, connectorThreshold: 55 }}
        annotations={[
          { type: "label", pointId: "D", label: "Shared anchor A" },
          { type: "label", pointId: "D", label: "Shared anchor B" },
          { type: "label", pointId: "H", label: "Edge note" },
          { type: "label", pointId: "A", label: "Manual offset", dx: 30, dy: -24 },
        ]}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        Keep authored offsets fixed, then choose offsets for the remaining note-like annotations
        based on nearby marks, existing notes, and plot edges.
      </p>
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Semiotic's annotation story started from a structural claim: annotations should be
        data-bound objects, not artwork pasted on after the chart is finished. That part has been
        true for a long time. Now, annotations have moved from representation to design assistance.
        The library now helps answer two questions authors usually answer by hand: which annotation
        should lead, and where should the note land?
      </p>

      <p>
        The work is intentionally additive. Existing annotation arrays render as before. Authors opt
        into hierarchy with <code>emphasis</code>, opt into placement with{" "}
        <code>autoPlaceAnnotations</code>, and can still take over with manual offsets or{" "}
        <code>svgAnnotationRules</code>.
      </p>

      <h2 id="m1">Hierarchy is part of rendering</h2>
      <p>
        A chart with several notes needs a reading order. Now you can add
        <code>emphasis: "primary" | "secondary"</code> to individual annotations, reusing the same
        token Semiotic already uses for chart hierarchy. A primary annotation renders at full weight
        and later z-order; a secondary one dims and yields. When no explicit emphasis is present but
        annotations carry <code>provenance.confidence</code>, the renderer can infer a subtle order
        from confidence descending, then authored array order.
      </p>
      <HierarchyDemo />
      <p>
        The important part is where this happens. Hierarchy is not a special case inside one
        annotation type. It runs through the shared annotation pass, so default rules, custom SVG
        rules, streaming overlays, and static SVG output all get the same wrapper. The accessibility
        audit now credits charts that declare hierarchy and warns when several annotations have no
        reading-order signal.
      </p>

      <pre style={preStyle}>{`annotations={[
  { type: "callout", pointId: "B", label: "Useful context", emphasis: "secondary" },
  { type: "callout", pointId: "F", label: "Main claim", emphasis: "primary" }
]}`}</pre>

      <h2 id="m2">Placement becomes a recipe</h2>
      <p>
        Manual <code>dx</code>/<code>dy</code> is still the floor, but it is not enough when labels
        move with filtered, sorted, streamed, or resized data. Now Semiotic has an opt-in placement
        pass for note-like annotations. It estimates note bounds, tries adjacent candidate offsets,
        penalizes overlap with already placed notes and point marks, penalizes plot-edge overflow,
        and preserves manual offsets by default.
      </p>
      <PlacementDemo />
      <p>
        The public switch is <code>autoPlaceAnnotations</code>. Pass <code>true</code> for defaults,
        or an object to tune the recipe. The pure function is also exported from{" "}
        <code>semiotic/recipes</code> as <code>annotationLayout</code>, so authors can run the
        geometry pass themselves and still use their own rendering layer.
      </p>

      <pre style={preStyle}>{`import { annotationLayout } from "semiotic/recipes"

<Scatterplot
  data={data}
  xAccessor="x"
  yAccessor="y"
  autoPlaceAnnotations={{
    defaultOffset: 40,
    notePadding: 10,
    routeLongConnectors: true,
    connectorThreshold: 55,
  }}
  annotations={[
    { type: "label", pointId: "edge", label: "Edge note" },
    { type: "label", pointId: "center", label: "Center A" },
    { type: "label", pointId: "center", label: "Center B" },
    { type: "label", pointId: "manual", label: "Manual", dx: 30, dy: -24 },
  ]}
/>`}</pre>

      <h2 id="routing">Connectors only get louder when they need to</h2>
      <p>
        Placement and connector routing are linked. Semiotic does not turn every connector into a
        swoop. Short, nearby connectors stay quiet. When the placement pass has to route a note
        farther away, it can set a curved connector so the association remains legible without
        requiring the author to hand-route the line.
      </p>

      <h2 id="limits">What is deliberately constrained</h2>
      <p>
        This is not a magic label engine, and it is not the new default yet. The shipped layout is
        deterministic and greedy, which makes it SSR-safe and testable, but it is still an estimate
        of rendered note geometry. The visual regression fixture covers the overlapping-label path
        before the behavior graduates from opt-in. Authors who need exact control still set
        <code>dx</code>/<code>dy</code>, disable manual-offset preservation, or replace the
        rendering pass with <code>svgAnnotationRules</code>.
      </p>

      <h2 id="why-it-matters">Why these two milestones belong together</h2>
      <p>
        Hierarchy and placement solve different parts of the same production problem. Hierarchy says
        which note should be read first. Placement keeps that note close enough to its target that
        the association is legible. The combination moves Semiotic closer to the annotation
        strategy's larger goal: charts whose communicative layer is engineered with the same care as
        their marks.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/annotations/overview">Annotations Overview</Link> includes the hierarchy,
          auto-placement, and curved-connector examples.
        </li>
        <li>
          <Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link> explains
          the confidence and freshness signals.
        </li>
        <li>
          <Link to="/blog/what-an-annotation-should-carry/">What an Annotation Should Carry</Link>{" "}
          covers the broader provenance and lifecycle work around annotations.
        </li>
      </ul>
    </>
  )
}

export default {
  ...META,
  component: Body,
  ogChart: { component: "Scatterplot" },
}
