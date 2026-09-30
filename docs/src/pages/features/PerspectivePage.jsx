import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ChordDiagram,
  CirclePack,
  ForceDirectedGraph,
  NetworkCustomChart,
  SankeyDiagram,
  TreeDiagram,
  Treemap,
} from "semiotic/network"
import { isometricGlyphs, PerspectiveToggle } from "semiotic/network/perspective"
import { lineageDagLayout } from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"

// ── Sample data ───────────────────────────────────────────────────────────

const services = [
  { id: "gateway", kind: "box", tier: 2, group: "edge" },
  { id: "auth", kind: "server", tier: 1, group: "app" },
  { id: "orders", kind: "server", tier: 1, group: "app" },
  { id: "search", kind: "server", tier: 1, group: "app" },
  { id: "orders-db", kind: "database", tier: 0, group: "data" },
  { id: "users-db", kind: "database", tier: 0, group: "data" },
  { id: "index", kind: "database", tier: 0, group: "data" },
  { id: "queue", kind: "cylinder", tier: 0, group: "data" },
]
const calls = [
  { source: "gateway", target: "auth" },
  { source: "gateway", target: "orders" },
  { source: "gateway", target: "search" },
  { source: "auth", target: "users-db" },
  { source: "orders", target: "orders-db" },
  { source: "orders", target: "queue" },
  { source: "search", target: "index" },
  { source: "queue", target: "search" },
]
const energy = [
  { source: "Coal", target: "Electricity", value: 30 },
  { source: "Gas", target: "Electricity", value: 22 },
  { source: "Gas", target: "Heat", value: 14 },
  { source: "Solar", target: "Electricity", value: 12 },
  { source: "Electricity", target: "Homes", value: 34 },
  { source: "Electricity", target: "Industry", value: 30 },
  { source: "Heat", target: "Homes", value: 14 },
]
const org = {
  name: "Platform",
  children: [
    {
      name: "Data",
      children: [
        { name: "Ingest", value: 12 },
        { name: "Warehouse", value: 18 },
        { name: "Quality", value: 6 },
      ],
    },
    {
      name: "Product",
      children: [
        { name: "Web", value: 16 },
        { name: "Mobile", value: 10 },
      ],
    },
    {
      name: "Infra",
      children: [
        { name: "Compute", value: 14 },
        { name: "Network", value: 8 },
        { name: "Security", value: 9 },
      ],
    },
  ],
}

// A small stream-processing topology for the lineage recipe panel.
const topology = [
  {
    id: "orders",
    label: "Orders",
    x: 0,
    y: -0.75,
    partition: "topic-source",
    semantic: "source",
    stage: "ingest",
  },
  {
    id: "validate",
    label: "Validate",
    x: 1,
    y: -0.75,
    partition: "processor",
    semantic: "filter",
    stage: "ingest",
  },
  {
    id: "customers",
    label: "Customers",
    x: 0,
    y: 0.75,
    partition: "topic-source",
    semantic: "source",
    stage: "enrich",
  },
  {
    id: "join",
    label: "Join",
    x: 1,
    y: 0.75,
    partition: "processor",
    semantic: "join-this",
    stage: "enrich",
  },
  {
    id: "aggregate",
    label: "Aggregate",
    x: 2,
    y: 0.45,
    partition: "processor",
    semantic: "aggregate",
    stage: "enrich",
  },
  {
    id: "publish",
    label: "Publish",
    x: 2,
    y: -0.75,
    partition: "processor",
    semantic: "sink",
    stage: "output",
  },
  {
    id: "warehouse",
    label: "Warehouse",
    x: 3,
    y: -0.75,
    partition: "topic-sink",
    semantic: "sink",
    stage: "output",
  },
]
const topologyLinks = [
  { source: "orders", target: "validate" },
  { source: "customers", target: "join" },
  { source: "validate", target: "aggregate" },
  { source: "join", target: "aggregate" },
  { source: "aggregate", target: "publish" },
  { source: "publish", target: "warehouse" },
]
const lineageConfig = {
  layerCount: 4,
  maxLayerSize: 2,
  nodeWidth: 92,
  nodeHeight: 36,
  lod: "compact",
  hullGroupAccessor: "stage",
  hullFillOpacity: 0.16,
  hullStrokeOpacity: 0.7,
  hullLabel: (stage) => stage.toUpperCase(),
  // Processor pieces follow the page surface so their names read in both themes.
  partitionColors: {
    processor: "var(--surface-3)",
    "topic-source": "#2a9bb0",
    "topic-sink": "#d8662f",
  },
}

const PRESETS = ["flat", "isometric", "pixel", "dimetric", "military", "cabinet"]
const W = 420
const H = 300

function Panel({ title, children }) {
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontWeight: 600, margin: "0 0 6px" }}>{title}</figcaption>
      {children}
    </figure>
  )
}

function Gallery() {
  const [type, setType] = useState("isometric")
  const [grid, setGrid] = useState(true)
  const [glyphs, setGlyphs] = useState(true)
  const [extrude, setExtrude] = useState(true)
  const [thickness, setThickness] = useState(6)
  const base = useMemo(
    () => ({
      type,
      thickness,
      transition: { duration: 600 },
      ground: grid ? { grid: { step: 24 } } : undefined,
    }),
    [type, thickness, grid],
  )
  const force = useMemo(
    () => ({
      ...base,
      elevation: "tier",
      elevationScale: 18,
      glyph: glyphs ? (d) => isometricGlyphs[d.kind] : undefined,
    }),
    [base, glyphs],
  )
  const treemap = useMemo(
    () => ({ ...base, ...(extrude ? { marks: "extrude", extrude: "value" } : {}) }),
    [base, extrude],
  )
  // Siblings spread along the ground x axis; run their labels along y.
  const tree = useMemo(() => ({ ...base, labels: { mode: "ground", axis: "y" } }), [base])

  return (
    <div>
      <div
        role="group"
        aria-label="Perspective controls"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
          margin: "12px 0 20px",
        }}
      >
        <PerspectiveToggle value={type} onChange={setType} options={PRESETS} />
        <label>
          <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />{" "}
          Ground grid
        </label>
        <label>
          <input type="checkbox" checked={glyphs} onChange={(e) => setGlyphs(e.target.checked)} />{" "}
          Pictograms
        </label>
        <label>
          <input type="checkbox" checked={extrude} onChange={(e) => setExtrude(e.target.checked)} />{" "}
          Extrude treemap
        </label>
        <label>
          Thickness{" "}
          <input
            type="range"
            min={0}
            max={16}
            step={1}
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
          />{" "}
          {thickness}px
        </label>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${W}px, 1fr))`,
          gap: 24,
        }}
      >
        <Panel title="ForceDirectedGraph · elevation by tier">
          <ForceDirectedGraph
            nodes={services}
            edges={calls}
            colorBy="group"
            nodeSize={9}
            iterations={200}
            showLabels
            width={W}
            height={H}
            perspective={force}
            title="Service calls"
            description="Services lifted by tier; pictograms show each service's kind."
          />
        </Panel>
        <Panel title="SankeyDiagram · slabs and lifted bands">
          <SankeyDiagram
            edges={energy}
            showLabels
            width={W}
            height={H}
            perspective={base}
            title="Energy flows"
          />
        </Panel>
        <Panel title="Treemap · extruded leaves">
          <Treemap
            data={org}
            childrenAccessor="children"
            valueAccessor="value"
            nodeIdAccessor="name"
            showLabels
            width={W}
            height={H}
            perspective={treemap}
            title="Headcount by team"
          />
        </Panel>
        <Panel title="TreeDiagram · tokens and ground-aligned labels">
          <TreeDiagram
            data={org}
            childrenAccessor="children"
            nodeIdAccessor="name"
            width={W}
            height={H}
            perspective={tree}
            title="Team hierarchy"
          />
        </Panel>
        <Panel title="CirclePack · stacked levels">
          <CirclePack
            data={org}
            childrenAccessor="children"
            valueAccessor="value"
            nodeIdAccessor="name"
            width={W}
            height={H}
            perspective={base}
            title="Headcount by team"
          />
        </Panel>
        <Panel title="ChordDiagram · thick arcs and ribbons">
          <ChordDiagram
            edges={energy}
            showLabels
            width={W}
            height={H}
            perspective={base}
            title="Energy exchange"
          />
        </Panel>
        <div style={{ gridColumn: "1 / -1" }}>
          <Panel title="lineageDagLayout recipe · hulls, arrows and node cards follow">
            <NetworkCustomChart
              nodes={topology}
              edges={topologyLinks}
              layout={lineageDagLayout}
              layoutConfig={lineageConfig}
              nodeIDAccessor="id"
              width={640}
              height={320}
              perspective={base}
              title="Stream topology"
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default function PerspectivePage() {
  return (
    <PageLayout
      title="Perspective"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Perspective", path: "/features/perspective" },
      ]}
      prevPage={{ title: "Style Rules & Labels", path: "/features/style-rules" }}
      nextPage={null}
    >
      <p>
        Every network chart takes a <code>perspective</code> prop. It draws the finished layout in a
        parallel projection — isometric, 2:1 pixel, dimetric, military or cabinet — without changing
        the layout. Every mark becomes a piece with a little thickness, edges ride just above the
        ground and cast a shadow, and hover, keyboard focus, annotations, the accessible table and
        server rendering all follow the projected marks. It is a projection, not a 3D engine: there
        is no WebGL and nothing new to learn about the chart underneath.
      </p>
      <CodeBlock
        language="jsx"
        code={`import { ForceDirectedGraph } from "semiotic/network"

<ForceDirectedGraph nodes={nodes} edges={edges} perspective="isometric" />`}
      />

      <h2 id="gallery">Seven charts, one prop</h2>
      <p>
        Switch the preset to redraw all seven charts, or drag the thickness to see how much depth
        the pieces carry. Presets animate because each config sets <code>transition</code>; the
        layouts never re-run.
      </p>
      <Gallery />

      <h2 id="presets">Presets</h2>
      <table>
        <thead>
          <tr>
            <th>Value</th>
            <th>Ground diamond</th>
            <th>Use it for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>"isometric"</code>
            </td>
            <td>true 30° isometric (0.577)</td>
            <td>The classic architecture-diagram look</td>
          </tr>
          <tr>
            <td>
              <code>"pixel"</code>
            </td>
            <td>2:1 (0.5)</td>
            <td>Pixel-art and game-map conventions</td>
          </tr>
          <tr>
            <td>
              <code>"dimetric"</code>
            </td>
            <td>flatter (0.342)</td>
            <td>More of the plan visible, less foreshortening</td>
          </tr>
          <tr>
            <td>
              <code>"military"</code>
            </td>
            <td>no foreshortening</td>
            <td>Keeping ground shapes and angles true</td>
          </tr>
          <tr>
            <td>
              <code>"cabinet"</code>
            </td>
            <td>oblique, depth at half scale</td>
            <td>Front-facing elevations such as org charts</td>
          </tr>
          <tr>
            <td>
              <code>"flat"</code>
            </td>
            <td>identity</td>
            <td>The default; no projection work at all</td>
          </tr>
        </tbody>
      </table>
      <p>
        An object form starts from a preset and adjusts it: <code>rotation</code> and{" "}
        <code>tilt</code> in degrees, <code>verticalScale</code>, and <code>fit</code> (
        <code>"contain"</code> scales the projected scene down, never up, and centers it).
      </p>

      <h2 id="marks">Pieces: thickness, tokens, slabs and prisms</h2>
      <p>
        A projected outline with no depth reads as a skewed picture, not as an object. So every
        piece gets <code>thickness</code> — 6 layout px by default — and shows it as shaded side
        walls. Circles and symbols become <em>tokens</em>: discs lying on the ground at their pixel
        size, with a visible rim. Rects (sankey nodes, treemap and partition cells), chord arcs and
        circle-pack circles become <em>slabs</em> with exact hit areas, and each level of a treemap
        or circle pack sits on its parent's top surface, so nesting reads as terraces. Edges and
        bands ride one thickness above the surface their nodes stand on and cast a soft shadow onto
        it; the gap between line and shadow is what makes them read as lifted.
      </p>
      <p>
        Set <code>thickness: 0</code> for flat pieces, <code>edgeShadow: false</code> (or{" "}
        <code>{"{ color, opacity }"}</code>) to change the shadow, and{" "}
        <code>marks: "billboard"</code> to stand circles and symbols upright at their size instead.
        Pictogram glyphs always stand. <code>marks: "extrude"</code> turns leaf rects into prisms
        whose height comes from <code>extrude</code> — a constant, a field name, or a function —
        while containers stay on the ground beneath them. Standing marks are painted back to front.
      </p>
      <CodeBlock
        language="jsx"
        code={`<Treemap data={org} perspective={{ type: "isometric", thickness: 10 }} />
<Treemap data={org} perspective={{ type: "isometric", marks: "extrude", extrude: "value" }} />
<ForceDirectedGraph nodes={nodes} edges={edges} perspective={{ type: "isometric", marks: "billboard" }} />`}
      />

      <h2 id="elevation">Elevation is the one new encoding</h2>
      <p>
        <code>elevation</code> lifts nodes by a constant, a field or a callback. Data values scale
        so the largest lifts 48px unless you set <code>elevationScale</code>. Lifted marks get a
        dashed drop line and a soft shadow at their ground point so position stays readable; turn
        them off with <code>elevationGuides: false</code>. Everything else about perspective is
        presentation.
      </p>

      <h2 id="ground">Ground, plates and regions</h2>
      <p>
        <code>ground.grid</code> draws a projected grid over the plot, and <code>ground.plate</code>{" "}
        a slab under the whole scene. <code>regions</code> draw labelled plates under groups of node
        ids — as thick as the pieces unless you set <code>depth</code>, optionally raised (
        <code>elevation</code>) — and seat their members on the plate top. Region labels run along
        the plate's back edge. Edges attach to the surface their nodes stand on, so a link between
        plates climbs from one to the other.
      </p>
      <CodeBlock
        language="jsx"
        code={`perspective={{
  type: "isometric",
  ground: { grid: { step: 32 } },
  regions: [
    { id: "dmz", label: "INTERNET FACING", nodes: ["web-1", "web-2"], depth: 10 },
    { id: "private", label: "PRIVATE", nodes: ["db-1"], elevation: 40, depth: 8 }
  ],
  edges: { route: "orthogonal-rounded" },
  labels: { mode: "ground" }
}}`}
      />
      <p>
        <code>edges.route</code> replaces straight edges with orthogonal ground routes, so bends
        follow the two ground axes. <code>labels.mode: "ground"</code> rotates node labels along a
        ground axis (<code>labels.axis</code>). See both in{" "}
        <Link to="/examples/isometric-infrastructure">Isometric Infrastructure</Link>.
      </p>

      <h2 id="pictograms">Pictograms</h2>
      <p>
        <code>semiotic/network/perspective</code> ships isometric pictograms — <code>box</code>,{" "}
        <code>server</code>, <code>database</code>, <code>cylinder</code>, <code>tile</code>,{" "}
        <code>cloud</code> and <code>pin</code> — plus builders (<code>isoBox</code>,{" "}
        <code>isoStack</code>, <code>isoCylinder</code>, …) and the accessible{" "}
        <code>PerspectiveToggle</code> used above. Faces are lit and shaded versions of each node's
        color, so pictograms follow <code>colorBy</code>, themes and selection dimming. Pass them to
        any chart with <code>perspective.glyph</code>, or emit glyph nodes from a custom layout.
      </p>
      <CodeBlock
        language="jsx"
        code={`import { isometricGlyphs } from "semiotic/network/perspective"

<ForceDirectedGraph
  nodes={services}
  edges={calls}
  perspective={{ type: "isometric", glyph: (d) => isometricGlyphs[d.kind] }}
/>`}
      />

      <h2 id="custom-layouts">Custom layouts and overlays</h2>
      <p>
        A custom layout keeps returning flat plot coordinates; the frame projects its scene nodes,
        edges, labels and HTML marks. <code>ctx.perspective</code> holds the active config (or{" "}
        <code>null</code>) if the layout wants to adapt. SVG <code>backgrounds</code> and{" "}
        <code>overlays</code> are the layout's own drawing, so they need to say how they follow the
        projection. Setting <code>perspective: "ground"</code> on the result lays all of them on the
        ground. For a mix, wrap each piece in a placement component and set{" "}
        <code>perspective: "manual"</code>:
      </p>
      <ul>
        <li>
          <code>{"<NetworkPerspectiveGround z={0}>"}</code> lays flat geometry on the ground: hulls,
          lanes, grids. <code>z="top"</code> puts it at piece height, where edges ride, which suits
          arrowheads.
        </li>
        <li>
          <code>{"<NetworkPerspectiveBillboard x y>"}</code> moves upright content with its anchor
          point: node cards, badges, edge labels. Add <code>onGround</code> to lay it flat at its
          pixel size instead, like an icon on a token.
        </li>
        <li>Anything left unwrapped, such as a legend, stays in plot space.</li>
      </ul>
      <p>
        The projection is fitted to the plot from your scene marks. When decorations reach past
        them, such as hulls padded around their nodes, bands wider than their cells, or headers
        beside a matrix, list them in <code>perspectiveBounds</code> so the fit keeps them in view.
        A box <code>{"{ x, y, width, height }"}</code> lies on the ground. A point with{" "}
        <code>{"extent: [left, right, top, bottom]"}</code> is upright content that many pixels
        around its projected anchor.
      </p>
      <p>
        On a flat chart, the components render their children unchanged. In development, a chart
        warns once if a projected layout returns decorations without saying how they follow. Every
        built-in recipe already does this: lineage DAGs, dagre, Mermaid flowcharts, net ensembles,
        packed cluster matrices, transit maps, adjacency flows, dependency forests and GoFish
        display lists all draw their decorations in place under a projection. Mermaid goes further
        and emits solid pieces, so its nodes get thickness too.
      </p>
      <CodeBlock
        language="jsx"
        code={`import { NetworkPerspectiveBillboard, NetworkPerspectiveGround } from "semiotic/network"

const zonesLayout = (ctx) => ({
  sceneNodes,
  sceneEdges,
  backgrounds: (
    <NetworkPerspectiveGround>
      {zones.map((z) => <rect key={z.id} {...z.box} fill={z.color} opacity={0.15} />)}
    </NetworkPerspectiveGround>
  ),
  // Zones reach past the nodes: keep them in the fitted plot.
  perspectiveBounds: zones.map((z) => z.box),
  overlays: (
    <>
      {badges.map((b) => (
        <NetworkPerspectiveBillboard key={b.id} x={b.x} y={b.y}>
          <text x={b.x} y={b.y - 14} textAnchor="middle">{b.text}</text>
        </NetworkPerspectiveBillboard>
      ))}
      <Legend />
    </>
  ),
  perspective: "manual"
})`}
      />
      <p>
        For full control, overlay components read the fitted projection with{" "}
        <code>useNetworkPerspective()</code> and place content with <code>project(x, y, z)</code>.
      </p>
      <CodeBlock
        language="jsx"
        code={`import { useNetworkPerspective } from "semiotic/network"

function Beacon({ x, y }) {
  const frame = useNetworkPerspective()
  const [px, py] = frame.project(x, y, frame.thickness ?? 0)
  return <circle cx={px} cy={py} r={4} fill="red" />
}`}
      />

      <h2 id="rendering">Server rendering and loading</h2>
      <p>
        <code>renderToStaticSVG</code>, <code>renderChart</code> and MCP render every perspective
        feature synchronously from a JSON config — use the string or object form; callbacks are
        React-only. In the browser, grids, plates, regions, routing and extrusion load in a small
        chunk the first time a chart asks for them, then repaint. When hydrating server-rendered
        charts that use them, <code>await preloadNetworkPerspectiveExtras()</code> first so the
        first client render matches.
      </p>
      <CodeBlock
        language="json"
        code={`{
  "component": "ForceDirectedGraph",
  "props": {
    "nodes": [{ "id": "a", "tier": 1 }, { "id": "b", "tier": 0 }],
    "edges": [{ "source": "a", "target": "b" }],
    "perspective": { "type": "isometric", "elevation": "tier", "ground": { "grid": true } }
  }
}`}
      />

      <h2 id="honesty">When perspective is honest</h2>
      <p>
        Projection compresses depth and distorts distance and area. Use it where position is
        categorical or topological — architecture and infrastructure maps, lineage and DAGs, org
        charts, matrices — and avoid it where distance or area encodes a measured quantity. Sankey
        band widths survive projection; the lengths between nodes do not. The prop is called{" "}
        <code>perspective</code> rather than <code>projection</code> because geo charts already use{" "}
        <code>projection</code> for map projections.
      </p>
    </PageLayout>
  )
}
