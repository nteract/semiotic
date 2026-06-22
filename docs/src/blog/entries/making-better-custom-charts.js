/* eslint-disable react/no-unescaped-entities */
import React, { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { XYCustomChart } from "semiotic/xy"
import { NetworkCustomChart } from "semiotic/network"
import { lineageDagLayout } from "semiotic/recipes"
import {
  unstable_fromGofishIR,
  unstable_gofishFlowerIR,
} from "../../../../src/components/semiotic-experimental"

// Entry metadata first so the sync check reads the canonical strings
// before any UI-string literals.
const META = {
  slug: "making-better-custom-charts",
  title: "Making Better Custom Charts",
  subtitle:
    "The custom-chart escape hatch grows up: a scene-node/overlay contract, a real Kafka Streams lineage view that lets your pipeline own layout, and a GoFish IR interpreter that executes a foreign grammar instead of recognizing it.",
  author: "Elijah Meeks",
  date: "2026-06-20",
  tags: ["case-study", "network", "ai"],
  excerpt:
    "Every charting library hits the wall where the catalog runs out. This is about what's on the other side of that wall in Semiotic: a custom-layout surface principled enough to host a domain pipeline's lineage DAG and to interpret another library's serialized grammar, escape hatches and all.",
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

// ─── Flower encoding: one source of truth for the species order + colors ───
//
// The petals are filled by the interpreter in *first-seen species order*, so
// passing this same array as `colorScheme` guarantees the chart's petals, the
// hover tooltip swatches, and the HTML legend below all agree on which color
// means which species. The stem is the literal green from the IR's stem rect.
const STEM_COLOR = "#2f8f46"
const SPECIES = ["Walleye", "Perch", "Trout"] // data/encounter order
const SPECIES_COLORS = {
  Walleye: "#4e79a7",
  Perch: "#e1575a",
  Trout: "#b07aa1",
}
const PETAL_SCHEME = SPECIES.map((s) => SPECIES_COLORS[s])

// Aggregate the flat seafood rows into one record per lake: the stem total
// (summed catch) plus each species' petal count. Drives both the tooltip and
// the legend table.
function aggregateByLake(rows) {
  const m = new Map()
  for (const r of rows) {
    let e = m.get(r.lake)
    if (!e) {
      e = { lake: r.lake, total: 0, species: {} }
      m.set(r.lake, e)
    }
    const n = Number(r.count) || 0
    e.species[r.species] = (e.species[r.species] || 0) + n
    e.total += n
  }
  return m
}

const keyRow = {
  display: "flex",
  alignItems: "center",
  fontSize: 13,
  lineHeight: 1.5,
  margin: "3px 0",
}

// A short thick green line — the stem encoding.
function StemSwatch() {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-block",
        width: 14,
        height: 14,
        marginRight: 8,
        flex: "0 0 auto",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 6,
          top: 0,
          width: 3,
          height: 14,
          background: STEM_COLOR,
          borderRadius: 2,
        }}
      />
    </span>
  )
}

// A filled area swatch — a petal encoding.
function PetalSwatch({ color }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        borderRadius: 3,
        marginRight: 8,
        flex: "0 0 auto",
        background: color,
        opacity: 0.85,
      }}
    />
  )
}

// The complex hover tooltip: the lake's stem total + every petal value, each
// next to the swatch that matches its mark on the chart.
function FlowerTooltip({ entry }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid var(--surface-3, #ddd)",
        borderRadius: 8,
        boxShadow: "0 4px 14px rgba(0,0,0,0.16)",
        padding: "10px 12px",
        minWidth: 190,
        color: "#1a1a1a",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{entry.lake}</div>
      <div style={keyRow}>
        <StemSwatch />
        <span style={{ flex: 1 }}>Stem · total catch</span>
        <strong style={{ marginLeft: 8 }}>{entry.total}</strong>
      </div>
      <div style={{ height: 1, background: "var(--surface-3, #eee)", margin: "6px 0" }} />
      {SPECIES.map((s) => (
        <div key={s} style={keyRow}>
          <PetalSwatch color={SPECIES_COLORS[s]} />
          <span style={{ flex: 1 }}>{s} petal</span>
          <strong style={{ marginLeft: 8 }}>{entry.species[s] ?? 0}</strong>
        </div>
      ))}
    </div>
  )
}

const thCell = {
  textAlign: "left",
  padding: "6px 10px",
  borderBottom: "1px solid var(--surface-3)",
  fontWeight: 600,
  whiteSpace: "nowrap",
}
const tdCell = { padding: "6px 10px", borderBottom: "1px solid var(--surface-2)" }
const tdNum = { ...tdCell, textAlign: "right", fontVariantNumeric: "tabular-nums" }

// Recapitulation of the tooltip key as an HTML legend below the chart: the
// encoding key (stem line + petal fills) followed by the per-lake values, so
// the same color↔meaning mapping reads statically without hovering.
function FlowerLegend({ lakes }) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>How to read a flower</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 22px", marginBottom: 14 }}>
        <span style={keyRow}>
          <StemSwatch />
          <span>Stem height · total catch</span>
        </span>
        {SPECIES.map((s) => (
          <span key={s} style={keyRow}>
            <PetalSwatch color={SPECIES_COLORS[s]} />
            <span>{s} petal · count</span>
          </span>
        ))}
      </div>
      <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
        <thead>
          <tr>
            <th style={thCell}>Lake</th>
            {SPECIES.map((s) => (
              <th key={s} style={{ ...thCell, textAlign: "right" }}>
                <PetalSwatch color={SPECIES_COLORS[s]} />
                {s}
              </th>
            ))}
            <th style={{ ...thCell, textAlign: "right" }}>
              <StemSwatch />
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {lakes.map((e) => (
            <tr key={e.lake}>
              <td style={tdCell}>{e.lake}</td>
              {SPECIES.map((s) => (
                <td key={s} style={tdNum}>
                  {e.species[s] ?? 0}
                </td>
              ))}
              <td style={{ ...tdNum, fontWeight: 700 }}>{e.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

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
  const cfg = useMemo(() => {
    // Local clone so only THIS blog example resizes — the exported
    // flowerIR is shared with /features/gofish-layouts
    // we're willing to do hacky stuff like this because this is not the final API
    const ir =
      typeof structuredClone === "function"
        ? structuredClone(unstable_gofishFlowerIR)
        : JSON.parse(JSON.stringify(unstable_gofishFlowerIR))
    const polarLayer = ir.root.mark.children[1] // the { coord: { type: "polar" } } layer
    polarLayer.options = { ...polarLayer.options, radiusFactor: 1.5 } // default is 0.2
    return unstable_fromGofishIR(ir)
  }, [])

  // One lake → {total, species} record, shared by the tooltip and the legend.
  const lakeMap = useMemo(() => aggregateByLake(cfg.data), [cfg.data])
  const lakes = useMemo(() => Array.from(lakeMap.values()), [lakeMap])

  // Custom-chart tooltips arrive wrapped — the hovered datum is on `d.data`.
  // Any part of a flower (stem or petal) carries its `lake`, so we resolve the
  // whole flower's breakdown from the lake regardless of which mark was hit.
  const tooltip = useCallback(
    (d) => {
      const row = (d && d.data) || d
      const lake = row && row.lake
      const entry = lake && lakeMap.get(lake)
      return entry ? <FlowerTooltip entry={entry} /> : null
    },
    [lakeMap],
  )

  return (
    <>
      <div style={chartFrame}>
        <XYCustomChart
          data={cfg.data}
          layout={cfg.layout}
          colorScheme={PETAL_SCHEME}
          tooltip={tooltip}
          width={680}
          height={360}
          responsiveWidth
          margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
          frameProps={{ background: "#ffffff" }}
        />
      </div>
      <FlowerLegend lakes={lakes} />
    </>
  )
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
        Semiotic's answer to the edge is the <Link to="/features/custom-charts">Custom Charts</Link>{" "}
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
        evidence. They also get <em>overlays</em> (arbitrary SVG) for the chrome that doesn't need
        to be a first-class datum: labels, connectors, decorative glyph detail. The rule that
        emerged is worth stating plainly: <strong>never let chrome replace data.</strong> A pretty
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

      <h2>Interpreting a foreign grammar: GoFish IR</h2>

      <p>
        The harder test came from the other direction. <a href="https://gofish.graphics/">GoFish</a>{" "}
        is a research visualization grammar (MIT) that formalizes Gestalt relations like spacing,
        containment and connection as composable operators. It attempts to reclaim charts that fall
        outside the classic Grammar of Graphics: mosaics, waffles, ribbons, nested glyphs. It
        serializes specs to a JSON <strong>intermediate representation</strong> (
        <code style={inlineCode}>to_ir</code>). The question: can you export <em>anything</em> from
        GoFish and render it in Semiotic?
      </p>

      <p>
        <code style={inlineCode}>unstable_fromGofishIR</code> hands the spec to a small layout
        engine that walks <code style={inlineCode}>data → operators → mark</code> and{" "}
        <em>executes</em> the grammar: <code style={inlineCode}>group</code> /{" "}
        <code style={inlineCode}>spread</code> / <code style={inlineCode}>stack</code> /{" "}
        <code style={inlineCode}>scatter</code> / <code style={inlineCode}>treemap</code> /{" "}
        <code style={inlineCode}>layer</code>, the <code style={inlineCode}>polar</code> coordinate
        transform, mark channels through value scales, and <code style={inlineCode}>connect</code> /{" "}
        <code style={inlineCode}>ref</code> relations. Any spec built from that grammar renders; it
        is not limited to known charts.
      </p>

      <p>
        The flower below is not produced by a flower recipe. It's the GoFish IR document on the
        right, run through <code style={inlineCode}>unstable_fromGofishIR</code> and mounted on{" "}
        <code style={inlineCode}>XYCustomChart</code>. A <code style={inlineCode}>scatter</code>{" "}
        places one stem per lake at its x; each stem is a value-scaled{" "}
        <code style={inlineCode}>rect</code>
        bar; a <code style={inlineCode}>polar</code> layer stacks one{" "}
        <code style={inlineCode}>petal</code> per species around the angle axis, anchored to the top
        of the stem.
      </p>

      <FlowerFromIR />

      <pre style={pre}>{FLOWER_IR_SNIPPET}</pre>

      <h2>Escape hatches</h2>

      <p>
        A grammar can't express everything. GoFish has two sanctioned escape hatches:{" "}
        <code style={inlineCode}>derive</code> (a data transform) and{" "}
        <code style={inlineCode}>mark-fn</code> (a bespoke per-datum glyph). These serialize as a{" "}
        <code style={inlineCode}>lambdaId</code> resolved through a bridge. The interpreter honors
        that: a lambda registry resolves the id, and an <em>unregistered</em> id produces a warning,
        not a crash.
      </p>

      <p>
        That's what made the bubble-tea menu (the sixth example, derived from Krist Wongsuphasawat's
        "Boba Science" notebook) tractable on principle rather than by cheating. It's a row of
        data-driven drinks: each cup's tea + tapioca + ice volumes (plus its cup-size parameters)
        add up to a total volume that sets the drink height, so "Extra Boba" grows a taller pearl
        bed and "Light Ice" reads as mostly tea. The cup, tea, straw, and lid are real{" "}
        <code style={inlineCode}>polygon</code> / <code style={inlineCode}>line</code> marks; the
        pearls and ice are real <code style={inlineCode}>circle</code> /{" "}
        <code style={inlineCode}>rect</code> marks. The one genuinely non-grammar step is the
        frustum-volume → drink-height solve and the tapioca/ice packing that lives in a single{" "}
        <code style={inlineCode}>derive</code> lambda, which also emits a shared aspect box so an
        aspect-preserving <code style={inlineCode}>unit</code> fit lets the cups share one scale and
        a baseline. The spec follows the grammar as far as it reaches and escape-hatches only the
        irreducible math.
      </p>

      <p>
        Six examples ride this interpreter at{" "}
        <Link to="/interoperability/gofish">/features/gofish-layouts</Link>, across three frames:
        flower / bottle / polar-ribbon / circle-treemap on the XY frame, the boba cups on the
        ordinal frame (one cup per category), and the Python Tutor memory diagram on the network
        frame.
      </p>

      <h2>The boundary</h2>

      <p>
        The interpreter is a real layout engine, but it is <em>not</em> GoFish's. GoFish elaborates{" "}
        <code style={inlineCode}>spread</code> into a constraint system over a linear-system
        bounding box; we implement the deterministic allocation/accumulation model that the common,
        acyclic specs reduce to. That covers every operator the examples use and the large majority
        of gallery charts and it is forthright about the rest. Constructs outside the model (
        <code style={inlineCode}>table</code>, <code style={inlineCode}>cut</code>, free-form{" "}
        <code style={inlineCode}>.constrain</code>) record a warning and fall back rather than
        silently mis-rendering. The interpreted charts render the grammar faithfully without being
        pixel-equal to a bespoke recipe.
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
        "interpret a serialized spec" half generalizes to any design tool or grammar that emits an
        IR. But, to be clear, the reason this is labeled as an{" "}
        <code style={inlineCode}>unstable</code> API is because this will change by the time it is
        released to ensure that it is the most effective compatibility layer with GoFish.
      </p>

      <h2>Related</h2>

      <ul>
        <li>
          <Link to="/features/custom-charts">Custom Charts</Link> — the XY / ordinal / network
          escape-hatch surface and the scene-node/overlay contract.
        </li>
        <li>
          <Link to="/recipes/kstreams">Kafka Streams Topology</Link> — the lineage DAG recipe and
          the linked detail + minimap views.
        </li>
        <li>
          <Link to="/interoperability/gofish">Experimental GoFish Adapter</Link> — the six
          interpreted examples and the live IR for each.
        </li>
      </ul>
    </article>
  )
}

export default {
  ...META,
  component: Body,
}
