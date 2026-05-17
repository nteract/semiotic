import React from "react"
import { Link } from "react-router-dom"
import { OrbitDiagram, ThemeProvider } from "semiotic"

// Small hierarchy to demo: a fake org chart, three levels.
const ORG = {
  id: "CEO",
  children: [
    {
      id: "VP Engineering",
      children: [
        { id: "Platform", value: 12 },
        { id: "Product Eng", value: 18 },
        { id: "Infra", value: 9 },
        { id: "Security", value: 6 },
      ],
    },
    {
      id: "VP Sales",
      children: [
        { id: "NA Enterprise", value: 14 },
        { id: "EMEA", value: 8 },
        { id: "APAC", value: 5 },
      ],
    },
    {
      id: "VP Marketing",
      children: [
        { id: "Brand", value: 4 },
        { id: "Growth", value: 7 },
        { id: "Content", value: 3 },
      ],
    },
    {
      id: "COO",
      children: [
        { id: "Finance", value: 5 },
        { id: "People", value: 6 },
        { id: "Legal", value: 3 },
      ],
    },
  ],
}

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

function Body() {
  return (
    <>
      <p>
        <Link to="/charts/orbit-diagram">OrbitDiagram</Link>{" "}
        renders a hierarchy as concentric rings around a center
        — root at the middle, depth-1 children on the first
        orbit, depth-2 on the next, and so on. Children rotate
        around their parent slowly enough to read; the
        composition is part network diagram, part planetary
        animation, intentionally evocative. The chart is more
        decorative than analytic, and that's the point: it works
        when the goal is to make the existence of structure feel
        like something a viewer wants to spend time with, not
        when the goal is to deliver a specific number.
      </p>

      <h2 id="why-care">Why this exists</h2>
      <p>
        Most hierarchy charts (
        <Link to="/charts/tree-diagram">TreeDiagram</Link>,{" "}
        <Link to="/charts/treemap">Treemap</Link>,{" "}
        <Link to="/charts/circle-pack">CirclePack</Link>) are
        analytic: tree for path-and-depth questions, treemap for
        "which subtree is the biggest," circle pack for
        size-with-hierarchy. OrbitDiagram is the answer to a
        different question — <em>"how do I show off that this
        thing has structure, without making my audience read a
        spreadsheet?"</em> Org charts in conference talks, system
        architecture diagrams in product launches, taxonomy
        explorations on landing pages, the kind of executive-
        report visual where the reader is meant to nod and feel
        oriented rather than make a decision.
      </p>
      <p>
        The animation isn't gratuitous. A static radial layout
        leaves the viewer wondering whether the spatial position
        of any specific node matters. The slow rotation tells the
        eye: position is decorative; ring membership is the
        encoding.
      </p>

      <h2 id="demo">Live demo</h2>
      <p>
        A fake four-VP org. Three levels of hierarchy; depth
        renders as ring radius. The size of each leaf encodes
        headcount.
      </p>
      <div style={chartFrame}>
        <ThemeProvider theme="carbon-dark">
          <OrbitDiagram
            data={ORG}
            childrenAccessor="children"
            valueAccessor="value"
            colorByDepth
            width={600}
            height={520}
            orbitMode="flat"
            speed={0.15}
            showLabels
          />
        </ThemeProvider>
      </div>

      <h2 id="how-to-read">How to read it</h2>
      <ul>
        <li>
          <strong>Rings</strong> — each concentric ring is one
          depth level of the hierarchy. Depth-1 children sit on
          the first orbit out from center, depth-2 on the next,
          etc.
        </li>
        <li>
          <strong>Rotation</strong> — children rotate around
          their parent at <code>speed</code> radians per second
          (default: 0.2). Slow enough to read labels; fast
          enough to feel alive.
        </li>
        <li>
          <strong>Size</strong> — <code>valueAccessor</code>{" "}
          controls leaf circle radius. Internal nodes inherit
          sum-of-children if not provided directly.
        </li>
        <li>
          <strong>Color</strong> —{" "}
          <code>colorByDepth</code> tints each ring; otherwise{" "}
          <code>colorBy</code> reads a categorical field. Both
          are useful; the first is decorative, the second is
          semantic.
        </li>
      </ul>

      <h2 id="when-to-reach-for-it">When to reach for it</h2>
      <p>Reach for OrbitDiagram when:</p>
      <ul>
        <li>
          The audience needs to <em>feel oriented</em>, not make
          a decision. Showcase pages, intro slides, "here's the
          shape of our org" briefings.
        </li>
        <li>
          The hierarchy is small enough that labels stay
          readable (≤30 leaves works; beyond that they overlap).
        </li>
        <li>
          The chart's job is "look, structure" rather than
          "answer this question."
        </li>
      </ul>
      <p>Reach for something else when:</p>
      <ul>
        <li>
          The audience needs to compare sizes precisely —{" "}
          <Link to="/charts/treemap">Treemap</Link> is
          unbeatable for "which subtree is biggest."
        </li>
        <li>
          Path-from-root matters — a{" "}
          <Link to="/charts/tree-diagram">TreeDiagram</Link>{" "}
          shows lineage explicitly.
        </li>
        <li>
          The hierarchy is deep (5+ levels) or wide (50+ leaves)
          — OrbitDiagram's rings get crowded, and{" "}
          <Link to="/charts/circle-pack">CirclePack</Link>{" "}
          handles deep nesting better.
        </li>
        <li>
          The audience will see the chart in a printed report or
          a screenshot, where the animation is lost.
        </li>
      </ul>

      <h2 id="wiring">Wiring it up</h2>
      <pre style={{ background: "var(--surface-1)", padding: 12, borderRadius: 6, fontSize: 13, overflowX: "auto" }}>
{`import { OrbitDiagram } from "semiotic"

<OrbitDiagram
  data={root}                  // hierarchical { id, children: [...] }
  childrenAccessor="children"
  valueAccessor="value"
  colorByDepth
  orbitMode="flat"             // or "tilted"
  speed={0.2}                  // radians/sec
  animated
  showLabels
/>`}
      </pre>
      <p>
        Two layout modes:{" "}
        <code>orbitMode="flat"</code> (concentric rings,
        2-D) and <code>orbitMode="tilted"</code> (rings tilted
        toward the viewer, faux-3-D). Both rotate continuously
        unless <code>animated={"{false}"}</code> is set —
        useful for screenshot snapshots.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/orbit-diagram">
            OrbitDiagram — full prop reference
          </Link>
        </li>
        <li>
          <Link to="/charts/tree-diagram">TreeDiagram</Link> —
          for analytical hierarchy
        </li>
        <li>
          <Link to="/charts/circle-pack">CirclePack</Link> —
          for nested-size hierarchy
        </li>
        <li>
          <Link to="/charts/treemap">Treemap</Link> — for "which
          subtree is biggest"
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "orbit-diagram",
  title: "OrbitDiagram, explained",
  subtitle:
    "A hierarchy rendered as concentric rotating orbits — more landing-page than analytics. When the goal is to make structure feel like something worth looking at.",
  author: "Elijah Meeks",
  date: "2026-02-18",
  tags: ["chart-explainer", "network", "hierarchy"],
  excerpt:
    "OrbitDiagram is the chart for when the audience needs to feel oriented, not make a decision. Concentric rings, slow rotation, depth-as-radius. The animation isn't gratuitous — it tells the eye that ring membership is the encoding and angular position is decorative.",
  component: Body,
  ogChart: {
    component: "OrbitDiagram",
  },
}
