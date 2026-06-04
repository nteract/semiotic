/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"
import { Scatterplot } from "semiotic"

const META = {
  slug: "annotations-that-adapt-and-travel",
  title: "Annotations That Adapt and Travel",
  subtitle:
    "M5 and M6 make the annotation layer responsive to its container and its reader, and let a note defend itself once the chart leaves the page: responsive shedding, cohesion modes, audience-scaled amount, and defensive traveling notes that carry their provenance visibly.",
  author: "Elijah Meeks",
  date: "2026-06-04",
  tags: ["case-study", "roadmap"],
  excerpt:
    "Placement (M2) and density (M3) decided where notes land and how many fit. M5 makes that adapt to space and house style — shed secondary notes as the plot narrows, and choose whether notes blend into the chart or read as a distinct editorial layer. M6 adapts to the reader and to reuse: scale annotation amount by audience familiarity, and mark a note defensive so it survives every export with its source and confidence baked in.",
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

const responsiveAnnotations = [
  { type: "callout", pointId: "F", label: "Primary (kept)", emphasis: "primary", radius: 12 },
  { type: "label", pointId: "B", label: "Secondary B", emphasis: "secondary" },
  { type: "label", pointId: "D", label: "Secondary D", emphasis: "secondary" },
  { type: "label", pointId: "H", label: "Unmarked (kept)" },
]

function ResponsiveDemo() {
  return (
    <div style={chartFrame}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Scatterplot
          width={340}
          height={240}
          data={scatter}
          xAccessor="x"
          yAccessor="y"
          pointRadius={5}
          pointIdAccessor="id"
          autoPlaceAnnotations={{ responsive: true }}
          annotations={responsiveAnnotations}
        />
        <Scatterplot
          width={520}
          height={240}
          data={scatter}
          xAccessor="x"
          yAccessor="y"
          pointRadius={5}
          pointIdAccessor="id"
          autoPlaceAnnotations={{ responsive: true }}
          annotations={responsiveAnnotations}
        />
      </div>
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        Same annotations, two widths. Below the breakpoint (left) the two
        secondary notes are shed; primary and unmarked notes stay.
      </p>
    </div>
  )
}

function CohesionDemo() {
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
        autoPlaceAnnotations={{ cohesion: "layer" }}
        annotations={[
          { type: "label", pointId: "F", label: "Editorial note", dx: -70, dy: -20 },
          { type: "label", pointId: "B", label: "Reads as commentary", dx: 30, dy: 30 },
        ]}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        <code>cohesion: "layer"</code> presents notes as a distinct editorial
        layer — the annotation color and an italic editorial face.
      </p>
    </div>
  )
}

function DefensiveDemo() {
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
        autoPlaceAnnotations={{ density: { maxAnnotations: 2 } }}
        annotations={[
          { type: "label", pointId: "A", label: "Note A" },
          { type: "label", pointId: "C", label: "Note C" },
          { type: "label", pointId: "E", label: "Note E" },
          {
            type: "callout",
            pointId: "F",
            label: "Spike may be a sensor glitch",
            radius: 12,
            dx: -90,
            dy: -24,
            defensive: true,
            provenance: { source: "ai", confidence: 0.62 },
          },
        ]}
      />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        The tight budget sheds the ordinary notes, but the defensive AI caveat
        stays — and renders its source and confidence inline.
      </p>
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        The first four annotation milestones built a layer that is data-bound
        (representation), ordered (M1 hierarchy), well-placed (M2), un-crowded
        (M3 density), and legibly associated to its target (M4). M5 and M6 ask
        two more questions a production chart can&apos;t avoid: does the layer
        adapt to the space and the reader it lands in, and what happens to a note
        once the chart leaves the page it was made on?
      </p>

      <h2 id="responsive">M5: responsive shedding</h2>
      <p>
        Density sheds by <em>count</em> against the plot area, and because
        placement already runs with the chart&apos;s live dimensions, that budget
        already tightens as a responsive chart shrinks. M5 adds the{" "}
        <em>importance</em> axis: <code>{`{ responsive: true }`}</code> (or{" "}
        <code>{`{ minWidth }`}</code>, default 480px) sheds{" "}
        <code>secondary</code>-emphasis notes once the plot narrows past the
        breakpoint, while <code>primary</code> and unmarked notes stay. It pools
        its verdict with the density pass, and under{" "}
        <code>progressiveDisclosure</code> the shed notes are deferred rather
        than dropped.
      </p>
      <ResponsiveDemo />

      <h2 id="cohesion">M5: cohesion modes</h2>
      <p>
        Should a note blend into the chart or stand apart from it? That used to
        be implicit; M5 makes it a choice. <code>cohesion: "blended"</code> (the
        default look) lets notes adopt the chart&apos;s mark colors and
        typography. <code>cohesion: "layer"</code> presents them as a distinct
        editorial layer — the theme&apos;s annotation color and an italic
        editorial face — so commentary reads as commentary. Set it per
        annotation, or chart-wide; a per-annotation value wins.
      </p>
      <CohesionDemo />

      <h2 id="audience">M6: amount adapts to the reader</h2>
      <p>
        The same <code>AudienceProfile</code> that biases chart{" "}
        <em>suggestion</em> can bias annotation <em>amount</em>. Pass it through
        the density pass and the budget scales by the audience&apos;s aggregate
        familiarity: a low-familiarity audience keeps more orienting notes, an
        expert audience fewer. It is the annotation analogue of the orienting
        nudge <code>describeChart</code> already adds to its L4 sentence for
        low-familiarity readers.
      </p>
      <pre style={preStyle}>{`autoPlaceAnnotations={{
  density: true,
  audience: { familiarity: { Scatterplot: 5 } }, // experts → fewer notes
}}`}</pre>

      <h2 id="defensive">M6: defensive, traveling annotations</h2>
      <p>
        The paper&apos;s sharpest practitioner insight is that charts circulate
        as screenshots, stripped of provenance, and good authors anticipate that
        reuse by embedding caveats directly on the chart. A{" "}
        <code>defensive</code> note operationalizes this: it is never shed by the
        density budget or responsive shedding — it joins the floor — so it
        survives into every export path. And when it carries{" "}
        <code>provenance</code>, the layout pass bakes the source and confidence
        visibly into its label, so a stray screenshot still says who made the
        note and how sure they were.
      </p>
      <DefensiveDemo />
      <pre style={preStyle}>{`{
  type: "callout",
  pointId: "F",
  label: "Spike may be a sensor glitch",
  defensive: true,                              // never shed; always exported
  provenance: { source: "ai", confidence: 0.62 } // rendered as "(AI · 62%)"
}`}</pre>

      <h2 id="why">Adapt, then defend</h2>
      <p>
        M5 makes the annotation layer behave well in the container it&apos;s
        given and the house style it&apos;s asked to match. M6 makes individual
        notes behave well for the reader in front of them — and for the reader
        who will see this chart months later, out of context, in someone
        else&apos;s deck. Together they push the communicative layer past
        "renders correctly" toward "survives contact with the real world."
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/annotations/overview">Annotations Overview</Link> has live
          responsive, cohesion, and defensive examples.
        </li>
        <li>
          <Link to="/blog/annotations-that-make-room-and-make-sense/">Annotations That Make Room and Make Sense</Link>{" "}
          covers the density (M3) and association (M4) work these build on.
        </li>
        <li>
          <Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link>{" "}
          explains the provenance a defensive note renders visibly.
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
