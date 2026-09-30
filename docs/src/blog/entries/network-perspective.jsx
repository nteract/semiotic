import React from "react"
import { Link } from "react-router-dom"
import { ForceDirectedGraph, Treemap } from "semiotic/network"
import { isometricGlyphs } from "semiotic/network/perspective"

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  overflow: "hidden",
  margin: "20px 0",
}

const pair = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }

const services = [
  { id: "gateway", kind: "box", tier: 2, group: "edge" },
  { id: "auth", kind: "server", tier: 1, group: "app" },
  { id: "orders", kind: "server", tier: 1, group: "app" },
  { id: "search", kind: "server", tier: 1, group: "app" },
  { id: "orders-db", kind: "database", tier: 0, group: "data" },
  { id: "users-db", kind: "database", tier: 0, group: "data" },
  { id: "index", kind: "database", tier: 0, group: "data" },
]
const calls = [
  { source: "gateway", target: "auth" }, { source: "gateway", target: "orders" },
  { source: "gateway", target: "search" }, { source: "auth", target: "users-db" },
  { source: "orders", target: "orders-db" }, { source: "search", target: "index" },
]
const teams = {
  name: "Platform",
  children: [
    { name: "Data", children: [{ name: "Ingest", value: 12 }, { name: "Warehouse", value: 18 }, { name: "Quality", value: 6 }] },
    { name: "Product", children: [{ name: "Web", value: 16 }, { name: "Mobile", value: 10 }] },
    { name: "Infra", children: [{ name: "Compute", value: 14 }, { name: "Network", value: 8 }] },
  ],
}

const ISO = {
  type: "isometric",
  elevation: "tier",
  elevationScale: 18,
  ground: { grid: { step: 24 } },
  glyph: (d) => isometricGlyphs[d.kind],
}
const CITY = { type: "isometric", marks: "extrude", extrude: "value", ground: { grid: { step: 20 } } }

function Body() {
  return (
    <>
      <p>
        Every network chart in Semiotic now takes a <code>perspective</code> prop. Set it to{" "}
        <code>"isometric"</code> and a force graph, sankey, tree, treemap, circle pack or custom
        layout is drawn the way architecture diagrams are drawn: zones as surfaces, pictograms
        standing on them, routes along the floor. The layout underneath does not change. That is
        the point — perspective is a way of <em>drawing</em> a network, not a new kind of chart.
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        Isometric drawings have a long life in infrastructure maps, factory floor plans, game
        worlds and product illustration because they show three things at once: where things are,
        what they are, and what sits on top of what. A parallel projection keeps parallel lines
        parallel and sizes comparable across the scene, which is why it reads as a diagram rather
        than a photograph. It also costs something — it foreshortens depth, so distances and areas
        stop being comparable.
      </p>
      <p>
        Most charting tools leave that look to illustrators, which means the pretty version and the
        data-driven version drift apart. In Semiotic the projection is applied after layout, to the
        scene the chart already built, so tooltips, keyboard focus, annotations, the accessible
        table and server-rendered SVG all keep working on the projected marks.
      </p>

      <h2 id="same-graph">The same graph, twice</h2>
      <p>
        Left: a service graph as a force layout. Right: the same component with one extra prop —
        services lifted by tier, drawn as isometric pictograms on a ground grid.
      </p>
      <div style={{ ...chartFrame, ...pair }}>
        <ForceDirectedGraph nodes={services} edges={calls} colorBy="group" nodeSize={9} iterations={200} showLabels width={320} height={260} title="Flat" />
        <ForceDirectedGraph nodes={services} edges={calls} colorBy="group" nodeSize={9} iterations={200} showLabels width={320} height={260} title="Isometric" perspective={ISO} />
      </div>
      <p>
        The pictograms follow <code>colorBy</code>; their lit and shaded faces are derived from each
        node's color. Lifted services get a dashed drop line to their ground point, so elevation
        adds an encoding without hiding where the node is.
      </p>

      <h2 id="city">A treemap becomes a city</h2>
      <p>
        Area marks lie on the ground as slabs, and each level of the hierarchy sits on its parent.
        With <code>marks: "extrude"</code> the
        leaves of a treemap become prisms whose height is a second value; the parent cells stay on
        the ground as the city blocks.
      </p>
      <div style={chartFrame}>
        <Treemap data={teams} childrenAccessor="children" valueAccessor="value" nodeIdAccessor="name" showLabels width={560} height={320} perspective={CITY} title="Headcount by team" />
      </div>
      <p>
        Here height repeats the area encoding, which makes the biggest teams stand out. Point{" "}
        <code>extrude</code> at a different field — open roles, incidents, spend — and the city
        shows two measures at once.
      </p>

      <h2 id="how-it-works">How it works</h2>
      <p>
        After the layout emits its scene, the chart maps the ground plane through one affine matrix
        and adds a vertical lift for elevation. Projection alone makes a picture look skewed rather
        than solid, so every piece also gets a little thickness: circles and symbols become tokens
        with a rim, rects, arcs and circle-pack circles become slabs with shaded side walls, nested
        levels stack like terraces, and edges ride just above the ground with a soft shadow under
        them. Hit areas follow the projected outlines. Standing marks are painted back to front. The projection is fitted into the plot, and switching presets
        rebuilds the scene without re-running the layout — which is also why the switch can
        animate.
      </p>
      <p>
        Ground grids, labelled zone plates, orthogonal ground routing and extrusion load on demand
        in the browser; server rendering draws them synchronously from the same JSON config.
      </p>

      <h2 id="when">When to reach for it — and when not</h2>
      <ul>
        <li>Architecture, infrastructure and deployment maps, where zones and tiers matter.</li>
        <li>Lineage graphs and DAGs, where position is topological.</li>
        <li>Org charts and treemaps as a presentation layer over values you also show elsewhere.</li>
        <li>Matrices and grid layouts where cells read as tiles.</li>
      </ul>
      <p>
        Don't use it when position encodes a measured quantity: the time axis of a{" "}
        <Link to="/charts/process-sankey">ProcessSankey</Link>, distances in a scaled layout, or
        areas you expect readers to compare precisely. Keep those flat, or pair the projected view
        with a flat one. Semiotic's config diagnostics warn about the ProcessSankey case.
      </p>

      <h2 id="wiring">Wiring it up</h2>
      <pre>
        <code>{`import { ForceDirectedGraph } from "semiotic/network"
import { isometricGlyphs } from "semiotic/network/perspective"

<ForceDirectedGraph
  nodes={services}
  edges={calls}
  perspective={{
    type: "isometric",
    elevation: "tier",
    ground: { grid: true },
    glyph: (d) => isometricGlyphs[d.kind],
    transition: true
  }}
/>`}</code>
      </pre>

      <h2 id="elsewhere">Where else this shows up</h2>
      <ul>
        <li>Supply-chain and warehouse maps, where racks and zones are the vocabulary.</li>
        <li>Network operations dashboards that mirror data-center floors.</li>
        <li>Data platform lineage, drawn as pipelines between storage plates.</li>
        <li>Manufacturing lines and process flows with stations on a floor plan.</li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/features/perspective">Perspective</Link> — the full prop reference and a gallery that includes a layout recipe.</li>
        <li><Link to="/examples/isometric-infrastructure">Isometric Infrastructure</Link> — a production footprint with zones, routes and alerts.</li>
        <li><Link to="/custom-charts/custom-layouts">Custom layouts</Link> — emit flat positions; the frame projects them.</li>
      </ul>
    </>
  )
}

export default {
  slug: "network-perspective",
  title: "One Prop, Six Perspectives",
  subtitle: "Draw any Semiotic network chart in isometric, pixel, dimetric, military or cabinet projection — without changing the layout.",
  author: "Semiotic Team",
  date: "2026-09-29",
  tags: ["case-study", "network"],
  excerpt:
    "Network charts now take a perspective prop. The layout stays flat; the chart projects the finished scene, stands pictograms on zone plates, routes links along the ground and keeps tooltips, keyboard focus and server rendering working on the projected marks.",
  component: Body,
  draft: true,
}
