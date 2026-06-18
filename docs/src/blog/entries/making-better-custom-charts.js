/* eslint-disable react/no-unescaped-entities */
import React, { useMemo } from "react"
import { Link } from "react-router-dom"
import { XYCustomChart } from "semiotic/xy"
import { unstable_fromGofishIR, unstable_gofishFlowerIR } from "../../../../src/components/semiotic-experimental"

// Entry metadata first so the sync check reads the canonical strings
// before any UI-string literals.
const META = {
  slug: "making-better-custom-charts",
  title: "Making Better Custom Charts",
  subtitle:
    "The custom-chart escape hatch grew up: a scene-node/overlay contract, a real Kafka Streams lineage view that lets your pipeline own layout, and a GoFish IR interpreter that executes a foreign grammar instead of recognizing it.",
  author: "Elijah Meeks",
  date: "2026-06-17",
  tags: ["case-study", "network", "ai"],
  excerpt:
    "Every charting library hits the wall where the catalog runs out. This is about what's on the other side of that wall in Semiotic — a custom-layout surface principled enough to host a domain pipeline's lineage DAG and to interpret another library's serialized grammar, escape hatches and all.",
}

const card = {
  background: "var(--surface-1)",
  borderRadius: 10,
  padding: 18,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

const chartFrame = {
  background: "#ffffff",
  borderRadius: 10,
  padding: 12,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

const inlineCode = {
  fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
  fontSize: "0.9em",
}

const pre = {
  background: "var(--surface-2)",
  padding: 12,
  borderRadius: 6,
  fontSize: 13,
  overflowX: "auto",
}

const tag = (color) => ({
  display: "inline-block",
  background: color,
  color: "white",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 999,
  marginRight: 6,
})

// ─── Live demo: a flower chart INTERPRETED from a GoFish IR document ───────
//
// No flower-specific recipe runs here. `unstable_fromGofishIR` walks the spec and
// executes its operators; XYCustomChart hosts the result.
const FLOWER_IR_SNIPPET = `{
  "ir": "gofish-frontend",
  "root": {
    "type": "chart",
    "data": { "type": "inline", "rows": [ /* seafood catch by lake */ ] },
    "operators": [{ "type": "scatter", "by": "lake", "x": { "type": "field", "name": "x" } }],
    "mark": { "type": "layer", "__combinator": true, "children": [
      { "type": "rect", "w": 5, "h": { "type": "field", "name": "count" }, "fill": "#2f8f46" },
      { "type": "layer", "__combinator": true, "options": { "coord": { "type": "polar" } },
        "children": [
          { "type": "stack", "__combinator": true, "options": { "dir": "x", "by": "species" },
            "children": [{ "type": "petal", "h": { "type": "field", "name": "count" },
                          "fill": { "type": "field", "name": "species" } }] }
        ] }
    ] }
  }
}`

function FlowerFromIR() {
  const cfg = useMemo(() => unstable_fromGofishIR(unstable_gofishFlowerIR), [])
  return (
    <div style={chartFrame}>
      <XYCustomChart
        data={cfg.data}
        layout={cfg.layout}
        width={680}
        height={360}
        responsiveWidth
        margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
        frameProps={{ background: "#ffffff" }}
      />
    </div>
  )
}

// ─── Body ─────────────────────────────────────────────────────────────────

function Body() {
  return (
    <article style={{ lineHeight: 1.65 }}>
      <p>
        <span style={tag("#6a52d9")}>draft</span>
      </p>

      <p>
        Every charting library has a catalog, and every catalog has an edge. Past the edge is the
        chart your data actually needs and the library doesn't have: a Kafka Streams topology, a
        memory diagram, a bubble-tea cup. Semiotic's answer to the edge is the{" "}
        <Link to="/features/custom-charts">Custom Charts</Link> surface — a layout function that emits
        scene primitives and gets the frame's runtime for free. This post is about three rounds of
        making that surface good enough to trust: a clear contract for what a custom layout owns, a
        real-world lineage view that hands layout back to the domain, and an interpreter that runs an
        entirely different library's serialized grammar.
      </p>

      <h2>Why a custom-chart surface is the interesting part</h2>

      <p>
        Most "extensibility" in charting libraries is a theming API and a slot for a tooltip. The hard
        version of the problem is: let someone draw a shape you've never heard of, and still give them
        hit-testing, transitions, decay, staleness, SSR, and accessibility — the things that take
        months to build and that nobody wants to reimplement per chart. If the escape hatch makes you
        give those up, it isn't an escape hatch; it's a second, worse library bolted to the side of
        the first.
      </p>

      <p>
        Semiotic's bet is a <strong>scene-node / overlay split</strong>. A custom layout returns two
        things: <em>scene nodes</em> (rects, points, areas) that flow through the same canvas pipeline
        the built-in charts use — so they get hit-testing, transitions, decay, and SSR evidence — and{" "}
        <em>overlays</em> (arbitrary SVG) for the chrome that doesn't need to be a first-class datum:
        labels, connectors, decorative glyph detail. The rule that emerged is worth stating plainly:{" "}
        <strong>never let chrome replace data.</strong> A pretty glyph is fine, but the thing the user
        hovers, the thing a screen reader announces, the thing SSR can prove rendered — that stays a
        scene node.
      </p>

      <h2>Letting the domain own layout: Kafka Streams lineage</h2>

      <p>
        The first real test was a Kafka Streams topology viewer (
        <Link to="/recipes/kstreams">/recipes/kstreams</Link>). A streaming topology is a layered DAG
        with source/sink topics, processors, state stores, repartition bridges, and the occasional
        reconciliation cycle. The layout for that is a <em>domain</em> problem — your pipeline already
        knows the layers and rows — so the recipe doesn't compute layout at all. It reads
        pre-computed logical coordinates (<code style={inlineCode}>x</code> = layer,{" "}
        <code style={inlineCode}>y</code> = row) and maps them into the plot. Semiotic positions
        nothing; it <em>renders</em> what the pipeline already decided.
      </p>

      <p>
        That inversion is the point. <code style={inlineCode}>lineageDagLayout</code> stays
        domain-agnostic — the app supplies the glyph vocabulary (a topic gets a log/store glyph, a
        processor gets a colored chip) through a <code style={inlineCode}>renderIcon</code> callback —
        and each node is a <strong>composite glyph</strong>: one transparent hit-rect in the scene
        graph carrying the node's datum, with the icon, label, and store-chips as overlay chrome on
        top. Level-of-detail collapses the glyph (full → compact → icon → dot) as the graph scales,
        and back-edges render as distinct dashed curves.
      </p>

      <p>
        Because the hit target is a real scene node, the interaction story is the normal one:{" "}
        <code style={inlineCode}>LinkedCharts</code> drives a shared selection across a detail view{" "}
        <em>and</em> a level-of-detail minimap, hover computes a downstream-reachability set and dims
        everything else in both views, and click locks a selection. None of that is custom code — it's
        the same selection + observation plumbing the catalog charts use, reaching a custom layout
        because the custom layout plays by the scene-node contract.
      </p>

      <pre style={pre}>{`// Your pipeline owns layout; the recipe only READS logical x/y.
<NetworkCustomChart
  nodes={view.nodes} edges={view.edges}
  layout={lineageDagLayout}
  layoutConfig={{ reachableIds, selectedId, renderIcon, partitionColors }}
  selection={{ name: "kstreams" }}   // shared store → selection ring
  onObservation={onHover}            // hover → downstream reach preview
  onClick={onPick}
/>`}</pre>

      <h2>Interpreting a foreign grammar: GoFish IR</h2>

      <p>
        The harder test came from the other direction. <a href="https://gofish.graphics/">GoFish</a>{" "}
        is a research visualization grammar (MIT) that formalizes Gestalt relations — spacing,
        containment, connection — as composable operators, and reclaims charts that fall outside the
        classic Grammar of Graphics: mosaics, waffles, ribbons, nested glyphs. It serializes specs to
        a JSON <strong>intermediate representation</strong> (<code style={inlineCode}>to_ir</code>).
        The question: can you export <em>anything</em> from GoFish and render it in Semiotic?
      </p>

      <p>
        The first attempt was a <em>recognizer</em> — match the IR's shape ("this has a petal mark →
        run the flower recipe") and dispatch to a hand-written layout. It looked declarative and was a
        lie: only the handful of archetypes we'd coded would ever render. The honest version is an{" "}
        <strong>interpreter</strong>. <code style={inlineCode}>unstable_fromGofishIR</code> hands the spec to a
        small layout engine that walks <code style={inlineCode}>data → operators → mark</code> and{" "}
        <em>executes</em> the grammar: <code style={inlineCode}>group</code> /{" "}
        <code style={inlineCode}>spread</code> / <code style={inlineCode}>stack</code> /{" "}
        <code style={inlineCode}>scatter</code> / <code style={inlineCode}>treemap</code> /{" "}
        <code style={inlineCode}>layer</code>, the <code style={inlineCode}>polar</code> coordinate
        transform, mark channels through value scales, and{" "}
        <code style={inlineCode}>connect</code> / <code style={inlineCode}>ref</code> relations. Any
        spec built from that grammar renders; it is not limited to known charts.
      </p>

      <p>
        The flower below is not produced by a flower recipe. It's the GoFish IR document on the right,
        run through <code style={inlineCode}>unstable_fromGofishIR</code> and mounted on{" "}
        <code style={inlineCode}>XYCustomChart</code>. A <code style={inlineCode}>scatter</code> places
        one stem per lake at its x; each stem is a value-scaled <code style={inlineCode}>rect</code>
        bar; a <code style={inlineCode}>polar</code> layer stacks one <code style={inlineCode}>petal</code>{" "}
        per species around the angle axis, anchored to the top of the stem.
      </p>

      <FlowerFromIR />

      <pre style={pre}>{FLOWER_IR_SNIPPET}</pre>

      <h2>Escape hatches, honored — not assumed</h2>

      <p>
        A grammar can't express everything, and pretending otherwise is how you get the recognizer
        back. GoFish has two sanctioned escape hatches — <code style={inlineCode}>derive</code> (a data
        transform) and <code style={inlineCode}>mark-fn</code> (a bespoke per-datum glyph) — that
        serialize as a <code style={inlineCode}>lambdaId</code> resolved through a bridge. The
        interpreter honors that exactly: a lambda registry resolves the id, and an{" "}
        <em>unregistered</em> id produces a warning, not a crash.
      </p>

      <p>
        That's what made the bubble-tea menu (the sixth example, derived from Krist Wongsuphasawat's
        "Boba Science" notebook) tractable on principle rather than by cheating. It's a row of
        data-driven drinks: each cup's tea + tapioca + ice volumes (plus its cup-size parameters) add
        up to a total volume that sets the drink height, so "Extra Boba" grows a taller pearl bed and
        "Light Ice" reads as mostly tea. The cup, tea, straw, and lid are real{" "}
        <code style={inlineCode}>polygon</code> / <code style={inlineCode}>line</code> marks; the
        pearls and ice are real <code style={inlineCode}>circle</code> /{" "}
        <code style={inlineCode}>rect</code> marks. The one genuinely non-grammar step — the
        frustum-volume → drink-height solve and the tapioca/ice packing — lives in a single{" "}
        <code style={inlineCode}>derive</code> lambda, which also emits a shared aspect box so an
        aspect-preserving <code style={inlineCode}>unit</code> fit lets the cups share one scale and a
        baseline. The spec follows the grammar as far as it reaches and escape-hatches only the
        irreducible math.
      </p>

      <p>
        Six examples ride this interpreter at{" "}
        <Link to="/features/gofish-layouts">/features/gofish-layouts</Link>, across three frames:
        flower / bottle / polar-ribbon / circle-treemap on the XY frame, the boba cups on the ordinal
        frame (one cup per category), and the Python Tutor memory diagram on the network frame (kept
        as a chart-level escape hatch — a memory diagram is genuinely beyond the grammar).
      </p>

      <h2>The honest boundary</h2>

      <p>
        The interpreter is a real layout engine, but it is <em>not</em> GoFish's. GoFish elaborates{" "}
        <code style={inlineCode}>spread</code> into a constraint system over a linear-system bounding
        box; we implement the deterministic allocation/accumulation model that the common, acyclic
        specs reduce to. That covers every operator the examples use and the large majority of gallery
        charts — and it is forthright about the rest. Constructs outside the model (
        <code style={inlineCode}>table</code>, <code style={inlineCode}>cut</code>, free-form{" "}
        <code style={inlineCode}>.constrain</code>) record a warning and fall back rather than
        silently mis-rendering. The interpreted charts render the grammar faithfully without being
        pixel-equal to a bespoke recipe. That's the trade a translator makes, and naming it is part of
        the contract.
      </p>

      <h2>When to reach for a custom chart — and when not</h2>

      <ul>
        <li>
          <strong>Reach for it</strong> when the catalog genuinely doesn't have the shape: a
          domain-specific diagram (lineage, memory, state machine), a pictorial glyph, a nested or
          relational layout, or hosting another tool's output.
        </li>
        <li>
          <strong>Reach for it</strong> when an external system already computes positions and you
          only need a renderer with interaction — hand the layout back to the domain, as the kstreams
          recipe does.
        </li>
        <li>
          <strong>Don't reach for it</strong> when a catalog chart fits with props. A custom layout is
          more surface area to own; the built-ins carry their encodings, legends, and a11y defaults
          for free.
        </li>
        <li>
          <strong>Don't reach for it</strong> to escape one inconvenient default — that's usually a{" "}
          <code style={inlineCode}>frameProps</code> or a style function, not a new layout.
        </li>
      </ul>

      <h2>Where this same pattern shows up</h2>

      <p>
        The "domain owns layout, the library renders + interacts" split isn't a streaming-topology
        quirk. It's the right shape any time positions come from somewhere authoritative: build/CI
        dependency graphs, supply-chain and logistics routes, org and reporting hierarchies, model and
        data lineage in ML pipelines, and call graphs in observability tooling. And the "interpret a
        serialized spec" half generalizes to any design tool or grammar that emits an IR — the work
        here is a template for hosting one inside a runtime that brings interaction, streaming, and
        accessibility the source format never had.
      </p>

      <h2>Related</h2>

      <ul>
        <li>
          <Link to="/features/custom-charts">Custom Charts</Link> — the XY / ordinal / network
          escape-hatch surface and the scene-node/overlay contract.
        </li>
        <li>
          <Link to="/recipes/kstreams">Kafka Streams Topology</Link> — the lineage DAG recipe and the
          linked detail + minimap views.
        </li>
        <li>
          <Link to="/features/gofish-layouts">Experimental GoFish Adapter</Link> — the six interpreted examples and
          the live IR for each.
        </li>
      </ul>
    </article>
  )
}

export default {
  ...META,
  draft: true,
  component: Body,
}
