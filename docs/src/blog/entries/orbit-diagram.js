import React from "react"
import { Link } from "react-router-dom"
import { OrbitDiagram, ThemeProvider } from "semiotic"

// Solar system — depth = orbit, leaf value = relative mass (log-
// scaled to keep the dots in a readable range). The metaphor IS
// the layout, which is exactly the case OrbitDiagram is good at.
// Each planet's moons (a few of them, anyway) ride along on a
// second-level orbit, so the chart actually has the hierarchy
// the visual implies — not just decorative rings.
const SOLAR_SYSTEM = {
  id: "Sun",
  value: 333000, // ~earth-masses; gets a huge center dot
  children: [
    { id: "Mercury", value: 0.055 },
    { id: "Venus",   value: 0.815 },
    {
      id: "Earth", value: 1.0,
      children: [{ id: "Moon", value: 0.012 }],
    },
    {
      id: "Mars", value: 0.107,
      children: [
        { id: "Phobos", value: 0.001 },
        { id: "Deimos", value: 0.001 },
      ],
    },
    {
      id: "Jupiter", value: 318,
      children: [
        { id: "Io",       value: 0.015 },
        { id: "Europa",   value: 0.008 },
        { id: "Ganymede", value: 0.025 },
        { id: "Callisto", value: 0.018 },
      ],
    },
    {
      id: "Saturn", value: 95,
      children: [
        { id: "Titan",    value: 0.023 },
        { id: "Rhea",     value: 0.0004 },
        { id: "Iapetus",  value: 0.0003 },
      ],
    },
    {
      id: "Uranus", value: 14.5,
      children: [
        { id: "Titania", value: 0.0006 },
        { id: "Oberon",  value: 0.0005 },
      ],
    },
    {
      id: "Neptune", value: 17.1,
      children: [{ id: "Triton", value: 0.004 }],
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
        The solar system, because the metaphor IS the layout. Sun
        at the center, eight planets on the first orbit out, the
        named moons of each planet on a second orbit ring around
        their planet. Sizes are scaled (log) earth-masses, so
        Jupiter and Saturn dominate their inner-system neighbors
        and the Moon is a recognizable dot next to Earth.
      </p>
      <div style={chartFrame}>
        <ThemeProvider theme="carbon-dark">
          <OrbitDiagram
            data={SOLAR_SYSTEM}
            childrenAccessor="children"
            valueAccessor="value"
            colorByDepth
            width={700}
            height={560}
            orbitMode="flat"
            speed={0.08}
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

      <h2 id="streaming">Streaming / push mode</h2>
      <p>
        OrbitDiagram is the one chart family in Semiotic where{" "}
        <strong>push mode doesn't apply.</strong> The hierarchy
        layout has to consider the whole tree at once — sibling
        positions on each orbit depend on how many children each
        parent has, the orbit radii depend on tree depth, the
        animation speed reads against the full ring. There's no
        "push one more leaf" that has a sensible meaning;
        appending a node restructures the layout.
      </p>
      <p>
        The supported pattern when the underlying hierarchy
        changes is: keep your tree in state, mutate it,{" "}
        pass the new tree as the <code>data</code> prop. The
        chart's animated transitions still pick up: orbit radii
        ease, nodes that survive between trees keep their angular
        position, new nodes fade in, removed nodes fade out.
        Same visual result as push for charts that support it;
        just a different mechanism under the hood.
      </p>
      <pre style={{ background: "var(--surface-1)", padding: 12, borderRadius: 6, fontSize: 13, overflowX: "auto" }}>
{`const [tree, setTree] = useState(initialTree)

// Adding a moon to Saturn —
setTree((root) => structuredClone(root, (...) => /* mutate */))

<OrbitDiagram data={tree} childrenAccessor="children" valueAccessor="mass" />`}
      </pre>
      <p>
        Same family applies to{" "}
        <Link to="/charts/tree-diagram">TreeDiagram</Link>,{" "}
        <Link to="/charts/treemap">Treemap</Link>, and{" "}
        <Link to="/charts/circle-pack">CirclePack</Link>: all
        hierarchy HOCs are state-prop driven rather than
        push-driven. Flat-data chart families (XY, ordinal,
        network with explicit edges, geo) all support push.
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
