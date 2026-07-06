import React, { useMemo, useState, useCallback } from "react"
import { XYCustomChart } from "../../../../src/components/charts/custom/XYCustomChart"
import { NetworkCustomChart } from "../../../../src/components/charts/custom/NetworkCustomChart"
import { OrdinalCustomChart } from "../../../../src/components/charts/custom/OrdinalCustomChart"
import { StackedAreaChart } from "../../../../src/components/charts/xy/StackedAreaChart"
import { waffleLayout } from "../../../../src/components/recipes/waffle"
import { calendarLayout } from "../../../../src/components/recipes/calendar"
import { flextreeLayout } from "../../../../src/components/recipes/flextree"
import { marimekkoLayout } from "../../../../src/components/recipes/marimekko"
import { bulletLayout } from "../../../../src/components/recipes/bullet"
import { parallelCoordinatesLayout } from "../../../../src/components/recipes/parallelCoordinates"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"
import { waffleRecipeManifest } from "./waffleRecipeManifest"
import { IntentMark } from "../../../../src/components/ai/IntentMark"
import { intentManifestFromRecipe } from "../../../../src/components/ai/intentManifest"

// ── Demo data ────────────────────────────────────────────────────────────

const waffleData = [
  { region: "AMER", share: 42 },
  { region: "EMEA", share: 28 },
  { region: "APAC", share: 18 },
  { region: "LATAM", share: 12 },
]

function buildCalendarYear(year, seed = 7) {
  // Deterministic pseudo-random walk so the demo is stable across renders.
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const start = Date.UTC(year, 0, 1)
  const days = []
  for (let i = 0; i < 365; i++) {
    const day = new Date(start + i * 86400000)
    const dow = day.getUTCDay()
    // Weekends quieter; weekly bursts every ~10 days.
    const base = dow === 0 || dow === 6 ? 0.8 : 2.4
    const burst = Math.floor(i / 11) % 5 === 0 ? 5 + Math.floor(rand() * 8) : 0
    days.push({ date: day, count: Math.round(base + rand() * 3 + burst) })
  }
  return days
}

// Pre-positioned tree data, as if computed by d3-flextree. Showcases
// every dimension of variation flextree handles that uniform-height
// d3-tree can't:
//
//   1. Per-node height variation. Row 1 has Tutorials (h=70) next to API
//      (h=32) — top edges align, bottom edges don't.
//   2. Per-node width variation. First Chart (84) next to Setup (58),
//      Streaming (72), etc.
//   3. Asymmetric subtree breadth. Tutorials's subtree is huge (4 leaves,
//      one of which itself has 3 sub-leaves) so it claims most of the
//      horizontal real estate. API gets a narrow slot.
//   4. Asymmetric depth. Most branches stop at row 2, but two ("First
//      Chart" and "Horizon") drop a 3rd row of leaves. That uneven depth
//      is something d3-tree can express but uniform-height layouts pad
//      awkwardly.
//
// Row top edges align at: 30, 100, 200, 320 — all sized to the *tallest*
// rect in each row, which is exactly how flextree packs vertically.
const flextreeNodes = [
  // Row 0 — root.
  { id: "root", label: "Documentation", x: 320, y: 50, width: 70, height: 40 },

  // Row 1 — tops aligned at y=100.
  //   Tutorials  h=70 → center 100+35 = 135   (tall card)
  //   API        h=32 → center 100+16 = 116   (short pill)
  //   Recipes    h=58 → center 100+29 = 129   (medium card)
  { id: "tutorials", label: "Tutorials", x: 171, y: 135, width: 92, height: 70 },
  { id: "api", label: "API Reference", x: 422, y: 116, width: 58, height: 32 },
  { id: "recipes", label: "Recipes", x: 571, y: 129, width: 80, height: 58 },

  // Row 2 — tops aligned at y=200.
  //   short pills h=26 → center 200+13 = 213
  //   First Chart h=86 → center 200+43 = 243   (very tall card)
  //   Horizon     h=68 → center 200+34 = 234   (tall card)
  { id: "setup", label: "Setup", x: 31, y: 213, width: 58, height: 26 },
  { id: "first-chart", label: "First Chart", x: 164, y: 243, width: 84, height: 86 },
  { id: "streaming", label: "Streaming", x: 304, y: 213, width: 72, height: 26 },
  { id: "charts", label: "Charts", x: 387, y: 213, width: 58, height: 26 },
  { id: "frames", label: "Frames", x: 457, y: 213, width: 58, height: 26 },
  { id: "waffle", label: "Waffle", x: 533, y: 213, width: 58, height: 26 },
  { id: "horizon", label: "Horizon", x: 606, y: 234, width: 64, height: 68 },

  // Row 3 — tops aligned at y=320. Only the wide / tall row-2 nodes have
  // children; the rest stop at row 2. That's the asymmetric depth real
  // documentation trees actually exhibit.
  //   leaves h=26 → center 320+13 = 333
  { id: "data", label: "Data", x: 95, y: 333, width: 46, height: 26 },
  { id: "render", label: "Render", x: 159, y: 333, width: 58, height: 26 },
  { id: "theme", label: "Theme", x: 228, y: 333, width: 56, height: 26 },
  { id: "bands", label: "Bands", x: 606, y: 333, width: 54, height: 26 },
]
const flextreeEdges = [
  // Row 0 → 1
  { source: "root", target: "tutorials" },
  { source: "root", target: "api" },
  { source: "root", target: "recipes" },
  // Row 1 → 2
  { source: "tutorials", target: "setup" },
  { source: "tutorials", target: "first-chart" },
  { source: "tutorials", target: "streaming" },
  { source: "api", target: "charts" },
  { source: "api", target: "frames" },
  { source: "recipes", target: "waffle" },
  { source: "recipes", target: "horizon" },
  // Row 2 → 3 (only the tall / wide row-2 nodes have children)
  { source: "first-chart", target: "data" },
  { source: "first-chart", target: "render" },
  { source: "first-chart", target: "theme" },
  { source: "horizon", target: "bands" },
]

function buildStreamgraphData() {
  // Six categories x 30 time steps, smooth-ish wandering totals.
  const cats = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]
  const out = []
  for (let i = 0; i < 30; i++) {
    for (let c = 0; c < cats.length; c++) {
      const phase = c * 0.7
      const base = 8 + 4 * Math.sin(i * 0.25 + phase)
      const drift = 2 * Math.cos(i * 0.13 + c)
      out.push({ t: i, group: cats[c], v: Math.max(0, base + drift) })
    }
  }
  return out
}

// ── Ordinal demo data ───────────────────────────────────────────────────

// Marimekko: revenue by region × product. Region totals vary so bar widths
// vary; product mix varies within each region so segment heights vary too.
const marimekkoData = [
  { region: "AMER", product: "Hardware", revenue: 280 },
  { region: "AMER", product: "Software", revenue: 220 },
  { region: "AMER", product: "Services", revenue: 100 },
  { region: "EMEA", product: "Hardware", revenue: 160 },
  { region: "EMEA", product: "Software", revenue: 200 },
  { region: "EMEA", product: "Services", revenue: 80 },
  { region: "APAC", product: "Hardware", revenue: 130 },
  { region: "APAC", product: "Software", revenue: 90 },
  { region: "APAC", product: "Services", revenue: 60 },
  { region: "LATAM", product: "Hardware", revenue: 60 },
  { region: "LATAM", product: "Software", revenue: 35 },
  { region: "LATAM", product: "Services", revenue: 20 },
]

// Bullet: 4 KPIs, each with their own scale. Note "Profit Margin" is a
// percentage, "Order Size" is dollars — bullet's per-row scale handles
// both side-by-side without any unit normalization.
const bulletData = [
  { metric: "Revenue ($M)", actual: 270, target: 250, ranges: [150, 225, 300] },
  { metric: "Profit Margin (%)", actual: 23, target: 27, ranges: [20, 25, 30] },
  { metric: "Order Size ($)", actual: 102, target: 120, ranges: [80, 110, 140] },
  { metric: "New Customers", actual: 540, target: 600, ranges: [400, 550, 700] },
]

// Parallel coordinates: a small cars-style dataset. Five fields with very
// different units (mpg vs hp vs weight) — each axis has its own scale.
const parallelCarsData = [
  { name: "compact", mpg: 32, hp: 95, weight: 2200, accel: 16, year: 2018 },
  { name: "sedan", mpg: 26, hp: 180, weight: 3100, accel: 12, year: 2019 },
  { name: "suv", mpg: 21, hp: 240, weight: 4200, accel: 10, year: 2020 },
  { name: "truck", mpg: 17, hp: 310, weight: 5400, accel: 9, year: 2017 },
  { name: "ev", mpg: 92, hp: 350, weight: 4400, accel: 6, year: 2022 },
  { name: "sport", mpg: 24, hp: 400, weight: 3200, accel: 5, year: 2021 },
  { name: "minivan", mpg: 22, hp: 280, weight: 4600, accel: 11, year: 2019 },
  { name: "hybrid", mpg: 52, hp: 130, weight: 3000, accel: 13, year: 2020 },
  { name: "wagon", mpg: 28, hp: 195, weight: 3400, accel: 11, year: 2018 },
  { name: "coupe", mpg: 25, hp: 320, weight: 3300, accel: 7, year: 2021 },
]

// Parallel-coords demo wrapped to demonstrate hover highlighting.
// `highlightFn` is the recipe's interactivity hook — pass any predicate
// and matching rows render at full opacity while others dim. Here a
// simple useState tracks the hovered row's name; a future
// `<ParallelCoordinatesBrushes>` overlay (roadmap item) will feed the
// same hook with per-axis range filters.
function ParallelCoordinatesDemo() {
  const [hoveredName, setHoveredName] = useState(null)
  const onObservation = useCallback((obs) => {
    if (obs.type === "hover" && obs.datum) {
      // Hovered datum may be wrapped — grab the user-facing row from `data` if present.
      const row = obs.datum.data ?? obs.datum
      setHoveredName(row?.name ?? null)
    } else if (obs.type === "hover-end") {
      setHoveredName(null)
    }
  }, [])
  const highlightFn = useMemo(
    () => (hoveredName ? (d) => d.name === hoveredName : undefined),
    [hoveredName],
  )

  return (
    <>
      <OrdinalCustomChart
        data={parallelCarsData}
        layout={parallelCoordinatesLayout}
        layoutConfig={{
          fields: ["mpg", "hp", "weight", "accel", "year"],
          colorBy: "name",
          showPoints: true,
          opacity: 0.7,
          strokeWidth: 1.5,
          highlightFn,
        }}
        width={760}
        height={320}
        margin={{ top: 30, right: 20, bottom: 20, left: 20 }}
        enableHover
        onObservation={onObservation}
      />
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "var(--semiotic-text-secondary, #666)",
          minHeight: 18,
        }}
      >
        {hoveredName ? `Highlighting: ${hoveredName}` : "Hover any line to highlight."}
      </div>
    </>
  )
}

// ── HTML marks demo ────────────────────────────────────────────────────────
// `htmlMarks` (network custom layouts) render rich, framework-positioned DOM
// nodes in a layer ABOVE the canvas + SVG overlays — the right tool for
// text-heavy cards that dim on hover, because a real <div> composites an
// opacity change instead of re-rasterizing text the way an SVG <foreignObject>
// does. Edges stay on the canvas; one transparent canvas hit-rect per card
// keeps hover/click authoritative; the hovered id flows back through
// layoutConfig so each card re-renders dimmed.
const htmlMarkNodes = [
  { id: "orders", title: "Orders", meta: "REST · 1.2k rps" },
  { id: "payments", title: "Payments", meta: "gRPC · 480 rps" },
  { id: "inventory", title: "Inventory", meta: "queue · 90 rps" },
  { id: "shipping", title: "Shipping", meta: "batch · hourly" },
]
const htmlMarkEdges = [
  { source: "orders", target: "payments" },
  { source: "orders", target: "inventory" },
  { source: "payments", target: "shipping" },
  { source: "inventory", target: "shipping" },
]

const HTML_CARD_W = 150
const HTML_CARD_H = 58

const htmlCardLayout = (ctx) => {
  const { plot } = ctx.dimensions
  const { hoveredId } = ctx.config
  const colW = plot.width / ctx.nodes.length
  const cy = plot.height / 2
  const posById = new Map(ctx.nodes.map((node, i) => [node.id, { cx: colW * (i + 0.5), cy }]))

  // Transparent hit-rects: the visible card is an htmlMark; the rect only owns
  // hit-testing so canvas hover/onObservation stays authoritative.
  const sceneNodes = ctx.nodes.map((node) => {
    const p = posById.get(node.id)
    return {
      type: "rect",
      x: p.cx - HTML_CARD_W / 2,
      y: p.cy - HTML_CARD_H / 2,
      w: HTML_CARD_W,
      h: HTML_CARD_H,
      style: { fill: "rgba(0,0,0,0)", stroke: "none" },
      datum: node.data ?? node,
      id: node.id,
    }
  })

  const sceneEdges = ctx.edges.map((edge) => {
    const s = posById.get(edge.source)
    const t = posById.get(edge.target)
    return {
      type: "line",
      x1: s.cx + HTML_CARD_W / 2,
      y1: s.cy,
      x2: t.cx - HTML_CARD_W / 2,
      y2: t.cy,
      style: { stroke: "var(--semiotic-border, #cbd5e1)", strokeWidth: 1.5, opacity: 0.8 },
      datum: edge,
    }
  })

  const htmlMarks = ctx.nodes.map((node) => {
    const p = posById.get(node.id)
    const data = node.data ?? node
    const dim = hoveredId != null && hoveredId !== node.id
    return {
      id: node.id,
      x: p.cx - HTML_CARD_W / 2,
      y: p.cy - HTML_CARD_H / 2,
      width: HTML_CARD_W,
      height: HTML_CARD_H,
      content: (
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--semiotic-border, #cbd5e1)",
            background: "var(--semiotic-surface, #ffffff)",
            color: "var(--semiotic-text, #111827)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            // Composite-only: this opacity flip does NOT re-rasterize the text.
            opacity: dim ? 0.25 : 1,
            transition: "opacity 140ms ease",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>{data.title ?? node.id}</div>
          <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #6b7280)" }}>
            {data.meta}
          </div>
        </div>
      ),
    }
  })

  return { sceneNodes, sceneEdges, htmlMarks }
}

function HtmlMarksDemo() {
  const [hoveredId, setHoveredId] = useState(null)
  const onObservation = useCallback((obs) => {
    if (obs.type === "hover" && obs.datum) {
      const row = obs.datum.data ?? obs.datum
      setHoveredId(row?.id ?? null)
    } else if (obs.type === "hover-end") {
      setHoveredId(null)
    }
  }, [])

  return (
    <>
      <NetworkCustomChart
        nodes={htmlMarkNodes}
        edges={htmlMarkEdges}
        layout={htmlCardLayout}
        layoutConfig={{ hoveredId }}
        width={720}
        height={200}
        margin={{ top: 20, right: 24, bottom: 20, left: 24 }}
        enableHover
        onObservation={onObservation}
      />
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "var(--semiotic-text-secondary, #666)",
          minHeight: 18,
        }}
      >
        {hoveredId
          ? `Hovering ${hoveredId} — the other cards dim via a composite-only opacity change.`
          : "Hover a card. Cards are real DOM (htmlMarks); edges paint on the canvas; hit-testing rides transparent canvas rects."}
      </div>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function CustomChartsPage() {
  const calendarData = useMemo(() => buildCalendarYear(2025), [])
  const streamData = useMemo(() => buildStreamgraphData(), [])

  return (
    <PageLayout
      title="Custom Layouts"
      subtitle="The escape-hatch HOCs and the recipe gallery"
      breadcrumbs={[
        { label: "Custom Charts", path: "/custom-charts/overview" },
        { label: "Custom Layouts", path: "/custom-charts/custom-layouts" },
      ]}
      prevPage={{ title: "Intelligence", path: "/custom-charts/intelligence" }}
      nextPage={{ title: "Glyph Marks", path: "/custom-charts/glyph-marks" }}
    >
      <section>
        <p>
          When the catalog doesn't fit, the four custom-chart HOCs — <code>XYCustomChart</code>,{" "}
          <code>OrdinalCustomChart</code>, <code>NetworkCustomChart</code>, and{" "}
          <code>GeoCustomChart</code> — let you supply a layout function that emits scene nodes
          directly. The frame still owns scales, theme, hit testing, transitions, decay,
          accessibility, and SSR — your layout owns the geometry. Most novel chart types (waffle,
          calendar, streamgraph, flextree, dagre) decompose into the same primitives the built-in
          HOCs use.
        </p>
        <p>
          Layouts ship in <code>semiotic/recipes</code>. You can use them as-is or copy one and
          customize. Writing your own is ~30 lines.
        </p>
      </section>

      <section>
        <h2>Isometric geographic board</h2>
        <p>
          <code>GeoCustomChart</code> receives the frame&rsquo;s fitted projection helpers plus raw
          areas, points, and lines, then emits interactive geographic scene nodes. The{" "}
          <Link to="/examples/paris-isometric-landmarks">Paris, Isometric City of Lights</Link>{" "}
          example quantizes DBpedia landmarks into a five-by-five isometric board while GeoFrame
          retains polygon hit-testing, accessibility, tooltips, selection, and SSR.
        </p>
        <CodeBlock language="jsx">{`import { GeoCustomChart } from "semiotic/geo"
import { isometricLandmarkLayout } from "semiotic/recipes"

<GeoCustomChart
  points={landmarks}
  layout={isometricLandmarkLayout}
  layoutConfig={{
    center: { lon: 2.3522, lat: 48.8566 },
    centerId: "http://dbpedia.org/resource/Paris",
    gridSize: 5
  }}
/>`}</CodeBlock>
      </section>

      <section>
        <h2 id="waffle-chart">Waffle chart</h2>
        <p>
          A grid of cells where each cell represents one share of the total. Categories fill
          row-major, allocated proportionally with the largest-remainder method. The whole layout is
          ~40 lines and emits <code>RectSceneNode</code>s — every theme, hover, and selection
          feature works without extra wiring.
        </p>
        <p style={{ fontSize: 12, color: "var(--text-2)" }}>
          Recipe contract: <code>{waffleRecipeManifest.id}</code> · intent{" "}
          <code>part-to-whole</code> · semantic navigation by category, not by
          individual cell.
        </p>
        <IntentMark
          manifest={intentManifestFromRecipe(waffleRecipeManifest, {
            chartId: "custom-layouts-waffle",
            description: waffleRecipeManifest.description({
              data: waffleData,
              config: {
                rows: 10,
                columns: 10,
                categoryAccessor: "region",
                valueAccessor: "share",
              },
            }).text,
            reviewStatus: "docs example",
          })}
        />
        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderRadius: 8,
            padding: 16,
            border: "1px solid var(--border-color, #e0e0e0)",
          }}
        >
          <XYCustomChart
            data={waffleData}
            recipe={waffleRecipeManifest}
            recipeId={waffleRecipeManifest.id}
            layout={waffleLayout}
            layoutConfig={{
              rows: 10,
              columns: 10,
              gutter: 3,
              categoryAccessor: "region",
              valueAccessor: "share",
            }}
            width={420}
            height={420}
            margin={20}
            colorScheme={["#4e79a7", "#f28e2c", "#59a14f", "#e15759"]}
          />
        </div>
        <CodeBlock language="jsx">{`import { XYCustomChart } from "semiotic/xy"
import { waffleLayout } from "semiotic/recipes"

<XYCustomChart
  data={[
    { region: "AMER",  share: 42 },
    { region: "EMEA",  share: 28 },
    { region: "APAC",  share: 18 },
    { region: "LATAM", share: 12 },
  ]}
  layout={waffleLayout}
  layoutConfig={{
    rows: 10, columns: 10, gutter: 3,
    categoryAccessor: "region",
    valueAccessor: "share",
  }}
  width={420}
  height={420}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Calendar heatmap</h2>
        <p>
          GitHub-style day-by-day grid. 53 ISO weeks × 7 days, color-encoded by daily value. The
          recipe handles the day-of-week / week-of-year math; the active theme provides the default{" "}
          <code>surface → primary</code> color ramp. Pass a custom <code>colorRamp</code> for
          non-default ramps.
        </p>
        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderRadius: 8,
            padding: 16,
            border: "1px solid var(--border-color, #e0e0e0)",
          }}
        >
          <XYCustomChart
            data={calendarData}
            layout={calendarLayout}
            layoutConfig={{
              dateAccessor: "date",
              valueAccessor: "count",
              year: 2025,
              gutter: 2,
            }}
            width={780}
            height={130}
            margin={10}
          />
        </div>
        <CodeBlock language="jsx">{`import { calendarLayout } from "semiotic/recipes"

<XYCustomChart
  data={dailyEvents}
  layout={calendarLayout}
  layoutConfig={{
    dateAccessor: "date",
    valueAccessor: "count",
    year: 2025,
    colorRamp: ["#ebedf0", "#216e39"], // optional
  }}
  width={780}
  height={130}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Flextree (network)</h2>
        <p>
          Hierarchical trees where node sizes vary along the major axis — rendered through{" "}
          <code>NetworkCustomChart</code>. The user runs <code>d3-flextree</code> (a BYO dep) to
          compute positions, then passes the laid-out nodes and parent → child edges into the chart.
          The recipe handles scene emission: rect nodes, smooth bezier edges from parent-bottom to
          child-top, optional labels.
        </p>
        <p>
          The demo below is what flextree exists for. Four kinds of variation that uniform-height{" "}
          <code>d3-tree</code> can't pack tightly are all present at once:
        </p>
        <ul>
          <li>
            <strong>Per-node height.</strong> Row 1's <em>Tutorials</em> (tall card) sits next to{" "}
            <em>API Reference</em> (short pill); Row 2's <em>First Chart</em> is taller than every
            other rect in the row.
          </li>
          <li>
            <strong>Per-node width.</strong> Each rect hugs its label — from the 46px <em>Data</em>{" "}
            leaf to the 92px <em>Tutorials</em> card.
          </li>
          <li>
            <strong>Asymmetric subtree breadth.</strong> <em>Tutorials</em>'s subtree is huge (3
            leaves, one of which itself has 3 sub-leaves), so it claims most of the horizontal room.{" "}
            <em>API Reference</em> only needs a narrow slot.
          </li>
          <li>
            <strong>Asymmetric depth.</strong> Two branches drop a 3rd row of children; the others
            stop at row 2. Real documentation / project trees look like this; flextree packs them
            without forcing every leaf to the deepest level.
          </li>
        </ul>
        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderRadius: 8,
            padding: 16,
            border: "1px solid var(--border-color, #e0e0e0)",
          }}
        >
          <NetworkCustomChart
            nodes={flextreeNodes}
            edges={flextreeEdges}
            layout={flextreeLayout}
            layoutConfig={{
              orientation: "vertical",
              showLabels: true,
              labelAccessor: "label",
            }}
            width={800}
            height={400}
            margin={{ top: 20, right: 80, bottom: 30, left: 80 }}
          />
        </div>
        <CodeBlock language="jsx">{`import flextree from "d3-flextree"
import { NetworkCustomChart } from "semiotic/network"
import { flextreeLayout } from "semiotic/recipes"

const layout = flextree({ nodeSize: (n) => [n.data.size, 40] })
const tree = layout.hierarchy(rootData)
layout(tree)

const nodes = tree.descendants().map(n => ({
  id: n.data.id, x: n.x, y: n.y,
  width: n.size[0], height: n.size[1],
}))
const edges = tree.links().map(l => ({
  source: l.source.data.id,
  target: l.target.data.id,
}))

<NetworkCustomChart
  nodes={nodes} edges={edges}
  layout={flextreeLayout}
  layoutConfig={{ orientation: "vertical" }}
  width={800} height={260}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Dagre (network)</h2>
        <p>
          Layered DAG layout from <code>dagre</code> (BYO dep). Same shape as flextree: run{" "}
          <code>dagre.layout(g)</code>, flatten nodes/edges, pass to <code>NetworkCustomChart</code>
          . Edges with a <code>points</code> waypoint array render as polylines through those
          points; without waypoints, fall back to a straight line.
        </p>
        <CodeBlock language="jsx">{`import dagre from "dagre"
import { NetworkCustomChart } from "semiotic/network"
import { dagreLayout } from "semiotic/recipes"

const g = new dagre.graphlib.Graph()
g.setGraph({ rankdir: "TB" })
g.setDefaultEdgeLabel(() => ({}))
for (const n of myNodes) g.setNode(n.id, { width: 120, height: 40, label: n.label })
for (const e of myEdges) g.setEdge(e.source, e.target)
dagre.layout(g)

const nodes = g.nodes().map(id => {
  const n = g.node(id)
  return { id, x: n.x, y: n.y, width: n.width, height: n.height, label: n.label }
})
const edges = g.edges().map(e => {
  const ed = g.edge(e)
  return { source: e.v, target: e.w, points: ed.points }
})

<NetworkCustomChart
  nodes={nodes} edges={edges}
  layout={dagreLayout}
  layoutConfig={{ edgeStyle: "smooth" }}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Lineage DAG with composite glyphs (network)</h2>
        <p>
          <code>lineageDagLayout</code> renders a pre-positioned layered lineage/DAG where each node
          is a <strong>composite glyph</strong> — a partition-colored container, a semantic icon, a
          truncated label, and a chip per attached item — that stays a single hit-testable unit: one
          canvas <code>rect</code> owns the hit area while the icon, label, and chips ride the
          layout's <code>overlays</code> (which is <code>pointer-events: none</code>, so it never
          steals a hover). It collapses through full → compact → icon → dot as the graph gets
          denser, renders <code>isBackEdge</code> cycles as distinct dashed loops, and dims to a
          host-supplied reachable set. Because it only <em>reads</em> pre-computed layer/row
          coordinates, output is deterministic. See the full interactive build — main view, synced
          minimap, and a snapshot morph — in <Link to="/recipes/kstreams">Kafka Streams</Link>.
        </p>
        <CodeBlock language="jsx">{`import { NetworkCustomChart } from "semiotic/network"
import { lineageDagLayout } from "semiotic/recipes"

<NetworkCustomChart
  nodes={nodes}   // each { id, x: layer, y: row, partition, semantic, stores, label }
  edges={edges}   // each { source, target, edgeType, isBackEdge }
  layout={lineageDagLayout}
  layoutConfig={{ layerCount, maxLayerSize, reachableIds, selectedId,
                  renderIcon, partitionColors }}
  selection={{ name: "lineage" }}   // LinkedCharts → ctx.selection highlights across views
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Streamgraph</h2>
        <p>
          Streamgraphs aren't a recipe — they're <code>StackedAreaChart</code> with{" "}
          <code>baseline="wiggle"</code> (Byron–Wattenberg offset, post-centered on y=0) or{" "}
          <code>baseline="silhouette"</code> (symmetric centering). The same layout pipeline that
          drives stacked areas handles the offset; no escape hatch needed.
        </p>
        <p>
          For the canonical streamgraph aesthetic — a "central anchor" series with smaller series
          wrapping outward — pair the baseline with <code>stackOrder="insideOut"</code>. The series
          with the largest total ends up in the middle straddling y=0; smaller series alternate
          above and below it. Without an explicit order, series stack alphabetically (which is
          stable under streaming but visually arbitrary).
        </p>
        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderRadius: 8,
            padding: 16,
            border: "1px solid var(--border-color, #e0e0e0)",
          }}
        >
          <StackedAreaChart
            data={streamData}
            xAccessor="t"
            yAccessor="v"
            areaBy="group"
            baseline="wiggle"
            stackOrder="insideOut"
            colorBy="group"
            colorScheme="category10"
            width={780}
            height={240}
            margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
          />
        </div>
        <CodeBlock language="jsx">{`<StackedAreaChart
  data={timeSeries}
  xAccessor="t"
  yAccessor="v"
  areaBy="group"
  baseline="wiggle"        // or "silhouette" for symmetric centering
  stackOrder="insideOut"   // central anchor series, others wrap outward
  colorBy="group"
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Marimekko (ordinal)</h2>
        <p>
          Variable-width stacked bars where each bar's width encodes its category's contribution to
          the grand total, and the inner stacked segments encode the within-category breakdown by{" "}
          <code>stackBy</code>. Both dimensions are proportional, making it the natural pick for
          cohort revenue analysis, market share by segment × product, or any "what's the mix within
          the mix" question.
        </p>
        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderRadius: 8,
            padding: 16,
            border: "1px solid var(--border-color, #e0e0e0)",
          }}
        >
          <OrdinalCustomChart
            data={marimekkoData}
            layout={marimekkoLayout}
            layoutConfig={{
              categoryAccessor: "region",
              stackBy: "product",
              valueAccessor: "revenue",
              gutter: 4,
              stackOrder: ["Hardware", "Software", "Services"],
            }}
            width={760}
            height={320}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          />
        </div>
        <CodeBlock language="jsx">{`import { OrdinalCustomChart } from "semiotic/ordinal"
import { marimekkoLayout } from "semiotic/recipes"

<OrdinalCustomChart
  data={salesByRegionAndProduct}
  layout={marimekkoLayout}
  layoutConfig={{
    categoryAccessor: "region",
    stackBy: "product",
    valueAccessor: "revenue",
    gutter: 4,
  }}
  width={760}
  height={320}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Bullet chart (ordinal)</h2>
        <p>
          Stephen Few's compact KPI replacement for half-circle gauges. Each row stacks three
          layers: qualitative range bands (poor → satisfactory → good) as backgrounds, a thinner
          dark bar for the actual measured value, and a perpendicular tick at the target. Each row
          is independently scaled so metrics in different units (dollars, percentages, counts) sit
          side-by-side without any shared axis.
        </p>
        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderRadius: 8,
            padding: 16,
            border: "1px solid var(--border-color, #e0e0e0)",
          }}
        >
          <OrdinalCustomChart
            data={bulletData}
            layout={bulletLayout}
            layoutConfig={{
              categoryAccessor: "metric",
              valueAccessor: "actual",
              targetAccessor: "target",
              rangesAccessor: "ranges",
              rowHeight: 28,
              rowGap: 14,
              labelWidth: 140,
            }}
            width={600}
            height={230}
            // The recipe reserves `labelWidth` on the left for metric
            // labels and ~14px below each row for tick numbers — chart
            // margin only needs minimal padding around the whole thing.
            margin={{ top: 16, right: 20, bottom: 16, left: 16 }}
          />
        </div>
        <CodeBlock language="jsx">{`import { bulletLayout } from "semiotic/recipes"

<OrdinalCustomChart
  data={[
    { metric: "Revenue ($M)",      actual: 270, target: 250, ranges: [150, 225, 300] },
    { metric: "Profit Margin (%)", actual:  23, target:  27, ranges: [ 20,  25,  30] },
    { metric: "Order Size ($)",    actual: 102, target: 120, ranges: [ 80, 110, 140] },
    { metric: "New Customers",     actual: 540, target: 600, ranges: [400, 550, 700] },
  ]}
  layout={bulletLayout}
  layoutConfig={{
    categoryAccessor: "metric",
    valueAccessor: "actual",
    targetAccessor: "target",
    rangesAccessor: "ranges",
  }}
  width={600}
  height={210}
/>`}</CodeBlock>
      </section>

      <section>
        <h2>Parallel coordinates (ordinal)</h2>
        <p>
          One polyline per row, traced across N parallel vertical axes. Each axis represents a
          numeric field with its own independent linear scale, so columns in different units (mpg,
          horsepower, weight) can sit side-by-side without normalizing. Useful for high-dimensional
          pattern hunting: clusters of similar rows, outliers that swing wildly between axes, and
          inverse correlations (lines crossing). Set <code>colorBy</code> to color groups.
        </p>
        <p>
          <strong>Interaction:</strong> hover any line to dim its neighbors. The recipe accepts a{" "}
          <code>highlightFn</code> predicate; the demo wraps the chart in a small component that
          tracks the hovered row's name and feeds it to the recipe. The same hook is the intended
          integration point for a future <code>&lt;ParallelCoordinatesBrushes&gt;</code> overlay
          (drag ranges on each axis to filter rows) and for <code>useBrushSelection</code>-style
          linked brushing across coordinated charts.
        </p>
        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderRadius: 8,
            padding: 16,
            border: "1px solid var(--border-color, #e0e0e0)",
          }}
        >
          <ParallelCoordinatesDemo />
        </div>
        <CodeBlock language="jsx">{`import { parallelCoordinatesLayout } from "semiotic/recipes"

function ParallelCoords({ cars }) {
  const [hovered, setHovered] = useState(null)
  return (
    <OrdinalCustomChart
      data={cars}
      layout={parallelCoordinatesLayout}
      layoutConfig={{
        fields: ["mpg", "hp", "weight", "accel", "year"],
        colorBy: "name",
        showPoints: true,
        // Recipes are pure, so hover state lives here in the parent.
        highlightFn: hovered ? (d) => d.name === hovered : undefined,
      }}
      onObservation={(obs) => {
        if (obs.type === "hover") setHovered(obs.datum?.data?.name ?? obs.datum?.name)
        else if (obs.type === "hover-end") setHovered(null)
      }}
      width={760}
      height={320}
    />
  )
}`}</CodeBlock>
      </section>

      <section>
        <h2>Writing your own layout</h2>
        <p>
          A layout is a pure function: <code>{"(ctx) => { nodes, overlays? }"}</code>. The context
          exposes the frame's scales, plot-rect dimensions, theme, and a <code>resolveColor</code>{" "}
          helper that honors the same <code>CategoryColorProvider</code> /{" "}
          <code>ThemeProvider</code> cascade built-in charts use. Emit standard scene nodes (
          <code>rect</code>, <code>line</code>, <code>area</code>, <code>point</code>,{" "}
          <code>heatcell</code>) and the frame handles the rest.
        </p>
        <CodeBlock language="tsx">{`import type { CustomLayout } from "semiotic/xy"

interface MyConfig {
  rows: number
  columns: number
  valueAccessor: string
}

export const myLayout: CustomLayout<MyConfig> = (ctx) => {
  const { rows, columns, valueAccessor } = ctx.config
  const { plot } = ctx.dimensions
  const cellW = plot.width / columns
  const cellH = plot.height / rows

  const nodes = ctx.data.map((d, i) => {
    const r = Math.floor(i / columns)
    const c = i % columns
    return {
      type: "rect",
      x: c * cellW,
      y: r * cellH,
      w: cellW - 1,
      h: cellH - 1,
      style: { fill: ctx.resolveColor(String(d[valueAccessor])) },
      datum: d,
    }
  })

  return { nodes }
}`}</CodeBlock>

        <h3>What you get for free</h3>
        <ul>
          <li>
            <strong>Hit testing.</strong> Hover, tooltip, click — quadtree built from your
            scene-node geometry.
          </li>
          <li>
            <strong>Transitions.</strong> Enter/exit/move animations run through the same pipeline
            as built-in charts.
          </li>
          <li>
            <strong>Theme cascade.</strong> Use <code>ctx.resolveColor</code> instead of hard-coded
            literals and the chart honors <code>ThemeProvider</code> +{" "}
            <code>CategoryColorProvider</code>.
          </li>
          <li>
            <strong>SSR.</strong> Scene nodes serialize to SVG via the same path the built-in charts
            use.
          </li>
          <li>
            <strong>Streaming.</strong> Layouts re-run on each push/pushMany — your custom waffle
            becomes a streaming waffle without extra plumbing.
          </li>
        </ul>
      </section>

      <section>
        <h2>Recipe authoring contracts</h2>
        <p>
          Custom layouts work best when they split semantic marks from decorative chrome. Emit
          data-bearing scene nodes for anything the reader can hover, click, select, animate, or
          describe. Render labels, petals, ribbons, arrows, silhouettes, and other visual detail as
          keyed SVG overlays. If a layout returns overlays without scene nodes, or every scene node
          has <code>datum: null</code>, Semiotic warns in development because hover callbacks and
          tooltips have nothing useful to read.
        </p>
        <ul>
          <li>
            <strong>Stable ids.</strong> Give each emitted node a stable identity such as{" "}
            <code>_transitionKey</code>, <code>pointId</code>, or a recipe-specific id so
            transitions can interpolate between solved states.
          </li>
          <li>
            <strong>Transparent hit targets.</strong> Pictorial glyphs often need a simple scene
            node underneath the visible overlay. Use <code>hitTargetPoint</code>,{" "}
            <code>hitTargetRect</code>, <code>networkHitTarget</code>, or{" "}
            <code>geoAreaHitTarget</code> with a useful datum.
          </li>
          <li>
            <strong>Tooltip payloads.</strong> Shape datums with user-facing keys, then use{" "}
            <code>buildTooltipEntries</code> to unwrap hover payloads consistently across custom
            chart families.
          </li>
        </ul>
        <CodeBlock language="tsx">{`import { buildTooltipEntries } from "semiotic/recipes"

const hit = {
  type: "rect",
  x, y,
  w: width,
  h: height,
  style: { fill: "rgba(0,0,0,0)", stroke: "none" },
  datum: { category, amount, kind: "bottle" },
  group: category,
  _transitionKey: \`bottle-hit-\${category}\`,
}

function Tooltip(hover) {
  const rows = buildTooltipEntries(hover)
  return rows.length ? (
    <div className="semiotic-tooltip">
      {rows.map((row) => <div key={row.key}>{row.label}: {row.formatted}</div>)}
    </div>
  ) : null
}`}</CodeBlock>
      </section>

      <section>
        <h2>Push semantics</h2>
        <p>
          The push API supports two different mental models. Append streams add observations over
          time: a new event, trade, request, or passenger enters the layout. State updates replace
          an existing object's current value: a bottle's fill level changes, a node moves, or a KPI
          updates. Use <code>ref.current.push(datum)</code> for append streams and{" "}
          <code>ref.current.update(id, updater)</code> when identity should stay fixed.
        </p>
        <CodeBlock language="jsx">{`const ref = useRef(null)

// Append semantics: add another observation.
ref.current.push({ id: "event-42", category: "A", value: 12 })

// State semantics: update an existing object in place.
ref.current.update("planning", (d) => ({
  ...d,
  amount: nextAmount,
}))`}</CodeBlock>
        <p>
          A pictorial bottle-fill chart is the canonical state-update case: the same bottles stay in
          the scene graph, keyed by id, while their fill values animate between solved states — no
          insertions or removals, just an in-place value change per frame.
        </p>
      </section>

      <section>
        <h2>Network custom diagrams</h2>
        <p>
          <code>NetworkCustomChart</code> is not limited to network science charts. It is the right
          escape hatch for semantic diagrams with nodes, edges, and stable identity: state machines,
          dependency diagrams, lineage diagrams, Python Tutor memory diagrams, process maps, and
          other object-reference systems. Use scene rects/circles for the semantic objects and
          network edges for relationships; reserve overlays for labels, dividers, arrows, and other
          detail that should not intercept interaction.
        </p>
      </section>

      <section>
        <h2>HTML marks (rich DOM nodes)</h2>
        <p>
          A network layout can return <code>htmlMarks</code> alongside <code>sceneNodes</code> /{" "}
          <code>sceneEdges</code> / <code>overlays</code>: positioned HTML/React nodes that Semiotic
          renders into one real-DOM layer <strong>above the canvas and SVG overlays</strong> (stack
          order: canvas → <code>overlays</code> → <code>htmlMarks</code>). Each mark is{" "}
          <code>{"{ id, x, y, width, height, content }"}</code> in the <em>same plot space</em> as{" "}
          <code>sceneNodes</code> — the framework owns the margin (and any future zoom/pan)
          transform, so a mark at <code>(x, y)</code> lands exactly where a scene node at{" "}
          <code>(x, y)</code> does.
        </p>
        <p>
          Reach for it over an SVG <code>&lt;foreignObject&gt;</code> when a node is{" "}
          <strong>text-heavy or a rich component and dims/animates on hover</strong>. HTML laid out
          inside SVG gets no compositor layer, so an <code>opacity</code> change — the everyday
          hover-dim — forces the browser to re-rasterize the node's text; across a large graph that
          stalls the interaction. A real <code>&lt;div&gt;</code> composites <code>opacity</code> /{" "}
          <code>transform</code> / <code>visibility</code> changes without repainting its contents.
          Marks are <code>pointer-events: none</code> by default, so keep a transparent hit-rect
          scene node per card and let the canvas stay authoritative for hover, tooltip, and click.
        </p>
        <HtmlMarksDemo />
        <CodeBlock language="tsx">{`import { NetworkCustomChart } from "semiotic/network"
import type { NetworkCustomLayout } from "semiotic/network"

const cardLayout: NetworkCustomLayout = (ctx) => {
  const place = (node) => /* your positions, in plot space */ ({ x, y })

  return {
    // Transparent canvas rect per node → owns hit-testing (onObservation/onClick).
    sceneNodes: ctx.nodes.map((node) => {
      const { x, y } = place(node)
      return { type: "rect", x, y, w: 150, h: 58,
               style: { fill: "rgba(0,0,0,0)" }, datum: node.data, id: node.id }
    }),
    // SVG edges paint beneath the cards.
    sceneEdges: edges,
    // Rich HTML cards, positioned in the SAME plot space, rendered as real DOM.
    htmlMarks: ctx.nodes.map((node) => {
      const { x, y } = place(node)
      return { id: node.id, x, y, width: 150, height: 58,
               content: <NodeCard {...node.data} /> }  // dims via opacity → composite-only
    }),
  }
}

<NetworkCustomChart nodes={nodes} edges={edges} layout={cardLayout} />`}</CodeBlock>
        <p>
          The card's <code>content</code> can call <code>useCustomLayoutSelection()</code> to read
          the shared <Link to="/coordinated-views">selection</Link> and dim itself — that updates
          the DOM layer <strong>without re-running the layout</strong>, so hover stays cheap even on
          big graphs (the demo above drives the dim through <code>layoutConfig</code> for brevity,
          which re-runs the layout each hover — fine at four nodes, but prefer the selection path at
          scale).
        </p>
      </section>

      <section>
        <h2>Sub-path import</h2>
        <p>
          Each frame's escape-hatch HOC ships from its own sub-path: <code>XYCustomChart</code> from{" "}
          <code>semiotic/xy</code>, <code>NetworkCustomChart</code> from{" "}
          <code>semiotic/network</code>, <code>OrdinalCustomChart</code> from{" "}
          <code>semiotic/ordinal</code>, and <code>GeoCustomChart</code> from{" "}
          <code>semiotic/geo</code>. Layout recipes live on <code>semiotic/recipes</code> as a
          separate sub-path so they only land in the bundle if you actually use them. BYO deps (
          <code>d3-flextree</code>, <code>dagre</code>) are imported by your code, not Semiotic —
          keeps the library small.
        </p>
        <CodeBlock language="jsx">{`import { XYCustomChart } from "semiotic/xy"
import { NetworkCustomChart } from "semiotic/network"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { GeoCustomChart } from "semiotic/geo"
import {
  waffleLayout, calendarLayout,
  flextreeLayout, dagreLayout,
  marimekkoLayout, bulletLayout, parallelCoordinatesLayout,
  isometricLandmarkLayout,
  buildTooltipEntries,
} from "semiotic/recipes"`}</CodeBlock>
      </section>

      <section>
        <h2>Notes</h2>
        <ul>
          <li>
            <strong>Plot-relative coordinates.</strong> Scene-node positions are in plot space — the
            frame already translates by the resolved <code>margin</code>. Use{" "}
            <code>ctx.dimensions.plot</code> for the drawing rect.
          </li>
          <li>
            <strong>Renderer dispatch.</strong> When <code>customLayout</code> is provided, the
            frame uses a renderer set that handles every node type, so your layout can emit any mix
            of rects, areas, lines, etc. regardless of <code>chartType</code>.
          </li>
          <li>
            <strong>Extents.</strong> If your layout uses scales, pass <code>xExtent</code> /{" "}
            <code>yExtent</code> on <code>XYCustomChart</code> to lock the domain. Layouts that
            don't use scales (waffle, calendar) ignore them.
          </li>
          <li>
            For richer composition examples, see{" "}
            <Link to="/recipes/benchmark-dashboard">recipes pages</Link>. Streamgraph baseline lives
            on <Link to="/charts/stacked-area-chart">StackedAreaChart</Link>.
          </li>
          <li>
            <strong>See it end-to-end in the Cookbook.</strong> Several Cookbook entries build the
            same chart concepts as worked examples —{" "}
            <Link to="/cookbook/marimekko-chart">Marimekko</Link>,{" "}
            <Link to="/cookbook/slope-chart">Slope</Link>,{" "}
            <Link to="/cookbook/radar-plot">Radar</Link>,{" "}
            <Link to="/cookbook/isotype-chart">Isotype</Link>, and{" "}
            <Link to="/cookbook/timeline">Timeline</Link>. Some use these layout functions; others
            reach the same result through a Stream Frame directly — useful for comparing the two
            routes.
          </li>
        </ul>
      </section>
    </PageLayout>
  )
}
