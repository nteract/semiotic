/* eslint-disable react/no-unescaped-entities */
import React, { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { NetworkCustomChart } from "semiotic/network"
import { lineageDagLayout } from "semiotic/recipes"
// Entry metadata first so the sync check reads the canonical strings
// before any UI-string literals.
const META = {
  slug: "making-better-custom-charts",
  title: "Making Better Custom Charts",
  subtitle:
    "The custom-chart escape hatch grows up: a scene-node/overlay contract, a real Kafka Streams lineage view that lets your pipeline own layout, and a GoFish adapter that renders another library's baked render IR instead of re-implementing its grammar.",
  author: "Elijah Meeks",
  date: "2026-06-20",
  tags: ["case-study", "network", "ai"],
  excerpt:
    "Every charting library hits the wall where the catalog runs out. This is about what's on the other side of that wall in Semiotic: a custom-layout surface principled enough to host a domain pipeline's lineage DAG and to render another library's baked render IR — even a hand-written one.",
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

// ─── Live demo: a tiny Kafka Streams lineage with zoom controls ─────────────
//
// Six nodes, pre-positioned by the "domain" (here, just hand-placed logical
// x = layer / y = row). `lineageDagLayout` reads those coords and renders the
// composite glyphs — Semiotic positions nothing. Two source topics merge in a
// join, fan out to two processors, and converge on a sink topic.
const KSTREAMS_NODES = [
  { id: "orders", x: 0, y: -0.5, partition: "topic-source", semantic: "source", label: "orders" },
  {
    id: "payments",
    x: 0,
    y: 0.5,
    partition: "topic-source",
    semantic: "source",
    label: "payments",
  },
  {
    id: "join",
    x: 1,
    y: 0,
    partition: "processor",
    semantic: "join-this",
    label: "join-orders-payments",
  },
  {
    id: "metrics",
    x: 2,
    y: -0.5,
    partition: "processor",
    semantic: "aggregate",
    label: "revenue-by-region",
    stores: ["revenue-store"],
  },
  { id: "alerts", x: 2, y: 0.5, partition: "processor", semantic: "filter", label: "fraud-alerts" },
  {
    id: "dashboard",
    x: 3,
    y: 0,
    partition: "topic-sink",
    semantic: "sink",
    label: "dashboard-topic",
  },
]

const KSTREAMS_EDGES = [
  { source: "orders", target: "join", edgeType: "internal" },
  { source: "payments", target: "join", edgeType: "internal" },
  { source: "join", target: "metrics", edgeType: "internal" },
  { source: "join", target: "alerts", edgeType: "internal" },
  { source: "metrics", target: "dashboard", edgeType: "internal" },
  { source: "alerts", target: "dashboard", edgeType: "internal" },
]

const KSTREAMS_PARTITION_COLORS = {
  "topic-source": "#1f8a70",
  "topic-sink": "#c0552d",
  processor: "#3a3a52",
}

const KSTREAMS_GLYPH = {
  source: "▶",
  sink: "▼",
  filter: "▽",
  aggregate: "Σ",
  "join-this": "⋈",
}

// Domain-supplied glyph vocabulary; the recipe stays domain-agnostic and just
// calls this per node. A topic gets a rounded chip; a processor gets its
// semantic symbol.
function renderKstreamsIcon({ semantic, size, color }) {
  return (
    <g>
      <rect width={size} height={size} rx={5} fill={color} stroke="rgba(255,255,255,0.2)" />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.5}
        fontWeight={700}
        fill="#fff"
      >
        {KSTREAMS_GLYPH[semantic] || "∘"}
      </text>
    </g>
  )
}

const ZOOM_MIN = 0.55
const ZOOM_MAX = 1.8
const ZOOM_STEP = 1.3

const zoomBtn = {
  width: 34,
  height: 34,
  borderRadius: 6,
  background: "var(--surface-1)",
  color: "var(--text-primary, inherit)",
  border: "1px solid var(--surface-3)",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
}

function KstreamsMini() {
  // `zoom` scales the canvas (and glyph size) together. Because the recipe
  // fits glyphs to plot.width / layerCount and derives level-of-detail from the
  // fitted size, zooming out collapses full glyphs → icons automatically, and
  // the scroll container handles a zoomed-in graph wider than the column.
  const [zoom, setZoom] = useState(1)

  const width = Math.round(720 * zoom)
  const height = Math.round(300 * zoom)

  // 4 layers, 2 rows at the widest. Passed explicitly so the layout doesn't
  // have to infer the domain from the data.
  const layoutConfig = useMemo(
    () => ({
      layerCount: 4,
      maxLayerSize: 2,
      renderIcon: renderKstreamsIcon,
      partitionColors: KSTREAMS_PARTITION_COLORS,
      lod: "auto",
      nodeWidth: Math.round(180 * zoom),
      nodeHeight: Math.round(58 * zoom),
      edgeWidth: 2,
    }),
    [zoom],
  )

  const zoomIn = useCallback(() => setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP)), [])
  const zoomReset = useCallback(() => setZoom(1), [])

  return (
    <div style={chartFrame}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN + 0.001}
          style={zoomBtn}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX - 0.001}
          style={zoomBtn}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={zoomReset}
          style={{ ...zoomBtn, width: "auto", padding: "0 12px", fontSize: 13 }}
        >
          Reset
        </button>
        <span style={{ fontSize: 12, color: "var(--text-secondary, #888)", marginLeft: 4 }}>
          {Math.round(zoom * 100)}% · zoom out far enough and the glyphs collapse to icons
        </span>
      </div>
      <div style={{ overflow: "auto", maxWidth: "100%", maxHeight: 460 }}>
        <NetworkCustomChart
          nodes={KSTREAMS_NODES}
          edges={KSTREAMS_EDGES}
          layout={lineageDagLayout}
          layoutConfig={layoutConfig}
          width={width}
          height={height}
          margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
          frameProps={{ background: "transparent" }}
        />
      </div>
    </div>
  )
}

// ─── Body ─────────────────────────────────────────────────────────────────

function Body() {
  return (
    <article style={{ lineHeight: 1.65 }}>
      <p>
        Every charting library has a map, and every map has an edge. Beyond that edge there be
        dragons or, in our case, the chart your data actually needs and the library doesn't have: a
        Kafka Streams topology, a memory diagram, a boba tea, a stack of data-driven wine bottles...
        Semiotic's answer to the edge is the <Link to="/custom-charts/overview">Custom Charts</Link>{" "}
        surface. This provides a layout function that emits scene primitives and gets the frame's
        runtime for free. While custom charts were always provided in Semiotic, recently three
        different improvements made that experience better: a clear contract for what a custom
        layout owns, a real-world lineage view that hands layout back to the domain, and an
        interpreter that runs an entirely different library's serialized grammar.
      </p>

      <h2>Why a custom-chart surface is the interesting part</h2>

      <p>
        Most "extensibility" in charting libraries is a theming API and a slot for a tooltip. The
        hard version of the problem is: let someone draw a shape you've never heard of, and still
        give them hit-testing, transitions, decay, staleness, SSR, and accessibility. These are the
        real value-add that, especially in the age of AI, empowers users to focus on what sets them
        apart from any average dashboard you might get from an AI otherwise. These are also the
        features take months to build and that nobody wants to reimplement per chart. If the escape
        hatch makes you give those up, it isn't an escape hatch; it's a second, worse library bolted
        to the side of the first.
      </p>

      <p>
        Semiotic's bet is a <strong>scene-node / overlay split</strong>. A custom layout returns two
        things: <em>scene nodes</em> (rects, points, areas) that flow through the same canvas
        pipeline the built-in charts use. They get hit-testing, transitions, decay, and SSR
        evidence. They also get <em>overlays</em> (arbitrary SVG) for the decoration that doesn't need
        to be a first-class datum: labels, connectors, decorative glyph detail. The rule that
        emerged is worth stating plainly: <strong>never let decoration replace data.</strong> A pretty
        glyph is fine, but the thing the user hovers, the thing a screen reader announces, the thing
        SSR can prove rendered needs to be a scene node.
      </p>

      <h2>Letting the domain own layout: Kafka Streams lineage</h2>

      <p>
        The first real test was a Kafka Streams topology viewer (
        <Link to="/recipes/kstreams">/recipes/kstreams</Link>). A streaming topology is a layered
        DAG with source/sink topics, processors, state stores, repartition bridges, and the
        occasional reconciliation cycle. The layout for that is a well-known <em>domain</em> problem
        and Semiotic can't anticipate which of the many DAG layouts and settings you might use. So
        the recipe doesn't compute layout at all. It reads pre-computed logical coordinates (
        <code style={inlineCode}>x</code> = layer, <code style={inlineCode}>y</code> = row) and maps
        them into the plot. Semiotic positions nothing; it <em>renders</em> what the pipeline
        already decided but, critically, with the accessibility and theming and other functionality
        that you shouldn't have to worry about.
      </p>

      <p>
        That inversion is the point. <code style={inlineCode}>lineageDagLayout</code> stays
        domain-agnostic. The app supplies the glyph vocabulary (a topic gets a log/store glyph, a
        processor gets a colored chip) through a <code style={inlineCode}>renderIcon</code>{" "}
        callback. Each node is a <strong>composite glyph</strong>: one transparent hit-rect in the
        scene graph carrying the node's datum, with the icon, label, and so on as an overlay on top.
        Level-of-detail collapses the glyph (full → compact → icon → dot) as the graph scales, and
        back-edges render as distinct dashed curves.
      </p>

      <p>
        Because the hit target is a real scene node, the interaction story is the normal one:{" "}
        <code style={inlineCode}>LinkedCharts</code> drives a shared selection across a detail view{" "}
        <em>and</em> a level-of-detail minimap, hover computes a downstream-reachability set and
        dims everything else in both views, and click locks a selection. It's the same selection +
        observation plumbing the catalog charts use, reaching a custom layout because the custom
        layout plays by the scene-node contract.
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

      <p>
        Here's the smallest version that still shows the idea: six pre-positioned nodes with two
        source topics merging in a join, fanning out to two processors, converging on a sink. The
        zoom buttons just scale the canvas; because the recipe fits each glyph to{" "}
        <code style={inlineCode}>plot.width / layerCount</code> and derives level-of-detail from the
        fitted size, zooming out collapses the full glyphs to icons on its own. No separate "compact
        mode" to wire up.
      </p>

      <KstreamsMini />

      <p>
        The <Link to="/recipes/kstreams">full recipe demo</Link> takes the same{" "}
        <code style={inlineCode}>lineageDagLayout</code> further: a linked detail panel and minimap,
        a downstream-reachability hover preview, and snapshot morphing between topology versions.
      </p>

      <h2>Rendering a foreign grammar: GoFish</h2>

      <div style={card}>
        <strong>Update.</strong> An earlier cut of this section described an <em>interpreter</em> that
        re-executed GoFish's grammar — walking <code style={inlineCode}>data → operators → mark</code>{" "}
        ourselves. That has been superseded. GoFish now exposes{" "}
        <code style={inlineCode}>{"toDisplayList({ w, h })"}</code>, its post-layout{" "}
        <strong>render IR</strong>, so the adapter consumes GoFish's own baked geometry instead of
        re-deriving it: GoFish owns the layout solve, Semiotic renders. The live gallery and the
        updated adapter now live at{" "}
        <Link to="/interoperability/gofish">Interoperability → GoFish DisplayList</Link>.
      </div>

      <p>
        The harder test came from the other direction. <a href="https://gofish.graphics/">GoFish</a>{" "}
        is a research visualization grammar (MIT) that formalizes Gestalt relations — spacing,
        containment, connection — as composable operators, reclaiming charts that fall outside the
        classic Grammar of Graphics: mosaics, waffles, ribbons, nested glyphs. The question: can you
        export <em>anything</em> from GoFish and render it in Semiotic?
      </p>

      <p>
        The answer is yes, and the seam is GoFish's{" "}
        <code style={inlineCode}>{"toDisplayList({ w, h })"}</code> — a flat, viewport-baked list of
        positioned primitives in absolute pixels, the coordinate transforms already folded in, so a
        polar petal arrives as a baked <code style={inlineCode}>path</code>. Each item carries a{" "}
        <code style={inlineCode}>role</code> (<code style={inlineCode}>node</code> for data-bearing
        marks, <code style={inlineCode}>overlay</code> for decoration) and an optional{" "}
        <code style={inlineCode}>datum</code>. The adapter maps the list onto a custom layout by that
        contract: data-bearing marks become scene nodes with a transparent hit-rect carrying their{" "}
        <code style={inlineCode}>datum</code>; everything else renders verbatim as overlay. Nothing is
        recognized or special-cased per chart type — a polar flower, a packed-circle treemap, and a
        pictorial bottle all flow through one role-driven mapping and pick up Semiotic's hit-testing,
        tooltips, selection, accessibility, and SSR for free.
      </p>

      <p>
        The division of labor is the whole point: GoFish owns layout, scales, coordinate transforms,
        and constraints; Semiotic owns the runtime around the baked shapes. Because the DisplayList is
        produced by GoFish itself, the result is its real geometry — not a re-implementation that has
        to stay bug-for-bug compatible. And because the render IR is just data, a host can also emit it
        by hand: the bubble-tea menu in the gallery is a DisplayList written directly, with no GoFish
        dependency at all — the same adapter renders it identically.
      </p>

      <p>
        Six charts ride this adapter at{" "}
        <Link to="/interoperability/gofish">Interoperability → GoFish DisplayList</Link>: a flower
        meadow, a polar ribbon, a fare circle treemap, a bottle-fill, a hand-emitted boba, and a
        Python Tutor memory diagram — each rendered from a baked DisplayList by the same unchanged
        adapter.
      </p>

      <h2>When to reach for a custom chart</h2>

      <ul>
        <li>
          <strong>Reach for it</strong> when the catalog genuinely doesn't have the shape: a
          domain-specific diagram (lineage, memory, state machine), a pictorial glyph, a nested or
          relational layout, or hosting another tool's output.
        </li>
        <li>
          <strong>Reach for it</strong> when an external system already computes positions and you
          only need a renderer with interaction. This is how the kstreams recipe works.
        </li>
        <li>
          <strong>Don't reach for it</strong> when a catalog chart fits with props. A custom layout
          is more surface area to own; the built-ins carry their encodings, legends, and a11y
          defaults for free.
        </li>
        <li>
          <strong>Don't reach for it</strong> to escape one inconvenient default. That's usually a{" "}
          <code style={inlineCode}>frameProps</code> or a style function, not a new layout.
        </li>
      </ul>

      <h2>Where this same pattern shows up</h2>

      <p>
        The "domain owns layout, the library renders + interacts" split isn't a streaming-topology
        quirk. It's the right shape any time positions come from somewhere authoritative: build/CI
        dependency graphs, supply-chain and logistics routes, org and reporting hierarchies, model
        and data lineage in ML pipelines, and call graphs in observability tooling. And the
        "render a serialized IR" half generalizes to any design tool or grammar that can bake one. But,
        to be clear, the reason this is labeled as an{" "}
        <code style={inlineCode}>unstable</code> API is because this will change by the time it is
        released to ensure that it is the most effective compatibility layer with GoFish.
      </p>

      <h2>Related</h2>

      <ul>
        <li>
          <Link to="/custom-charts/overview">Custom Charts</Link> — the XY / ordinal / network
          escape-hatch surface and the scene-node/overlay contract.
        </li>
        <li>
          <Link to="/recipes/kstreams">Kafka Streams Topology</Link> — the lineage DAG recipe and
          the linked detail + minimap views.
        </li>
        <li>
          <Link to="/interoperability/gofish">Experimental GoFish Adapter</Link> — a live gallery of
          GoFish charts rendered from their baked DisplayList, plus a hand-emitted one.
        </li>
      </ul>
    </article>
  )
}

export default {
  ...META,
  component: Body,
}
