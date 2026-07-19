import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import Kstreams from "../../examples/recipes/Kstreams"

const fullSourceCode = `import { NetworkCustomChart } from "semiotic/network"
import { LinkedCharts, useSelection } from "semiotic"
import { lineageDagLayout } from "semiotic/recipes"
// Your domain pipeline owns layout; Semiotic only *reads* the result:
import { dagLayoutFromGraph, reachableFrom, subgraphFrom } from "./kstreamsPipeline"

// The recipe stays domain-agnostic — the app supplies the glyph vocabulary.
const PARTITION_COLORS = {
  "topic-source": "#1f8a70", "topic-sink": "#c0552d",
  "topic-bridge": "#3f5e8c", processor: "#3a3a52",
}
function renderKstreamsIcon({ semantic, partition, size, color }) {
  // topic → a log/database glyph; processor → a colored chip + semantic symbol.
  return /* svg */ null
}

function toChartData(layout) {
  return {
    // logical x = layer, y = row — the recipe maps these into the plot.
    nodes: layout.nodes.map((dn) => ({
      id: dn.id, x: dn.x, y: dn.y,
      partition: dn.node.partition, semantic: dn.node.semantic,
      label: dn.node.label, stores: dn.node.stores,
    })),
    edges: layout.edges.map((de) => ({
      id: de.id, source: de.source, target: de.target,
      edgeType: de.edgeType, isBackEdge: de.isBackEdge,
    })),
  }
}

function LineageViews() {
  const [rootId, setRootId] = useState("orders")
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  // Shared selection store — click emits here; both charts consume it.
  const sel = useSelection({ name: "kstreams", fields: ["id"] })

  const main = useMemo(() => toChartData(dagLayoutFromGraph(subgraphFrom(full, rootId))), [rootId])
  const mini = useMemo(() => toChartData(dagLayoutFromGraph(full)), [])
  // Hover → downstream reach set → dim everything else, in BOTH views.
  const reachableIds = hoveredId ? [...reachableFrom(full, hoveredId)] : null

  const onHover = (obs) => setHoveredId(obs.type === "hover" ? obs.datum?.id : null)
  const onPick = (d) => { setSelectedId(d.id); sel.selectPoints({ id: [d.id] }) }

  return (
    <LinkedCharts>
      <NetworkCustomChart
        nodes={main.nodes} edges={main.edges} layout={lineageDagLayout}
        layoutConfig={{
          layerCount: ..., maxLayerSize: ..., reachableIds, selectedId,
          renderIcon: renderKstreamsIcon, partitionColors: PARTITION_COLORS,
        }}
        selection={{ name: "kstreams" }}   // consume the shared store → ring
        onObservation={onHover}            // hover → reach preview
        onClick={onPick}                   // click → select (+ emit to store)
        width={680} height={460}
      />
      {/* A second NetworkCustomChart with lod:"dot" is the minimap, sharing the
          same selection store — proving LinkedCharts works for custom layouts. */}
    </LinkedCharts>
  )
}`

export default function KstreamsPage() {
  return (
    <RecipeLayout
      title="Kafka Streams Topology"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Kafka Streams", path: "/recipes/kstreams" },
      ]}
      prevPage={{ title: "Network Explorer", path: "/recipes/network-explorer" }}
      dependencies={["semiotic", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        A left-to-right layered DAG of a Kafka Streams application's topology — topics and
        processors as <strong>composite node glyphs</strong>, repartition bridges, a
        state-store-bearing aggregate, and a cycle rendered as a back-edge. It's built on{" "}
        <code>NetworkCustomChart</code> + the <code>lineageDagLayout</code> recipe (the{" "}
        <code>customNetworkLayout</code> escape hatch), which <em>reads</em> pre-computed logical
        layer/row coordinates and maps them into the plot — no force simulation, fully
        deterministic.
      </p>

      <h2 id="preview">Preview</h2>
      <div
        style={{
          background: "var(--surface-1)",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid var(--surface-3)",
        }}
      >
        <Kstreams />
      </div>

      <h2 id="composite-glyphs">Composite glyphs as one hit-testable unit</h2>
      <p>
        Each node is more than a shape + a label: a partition-colored container, a semantic icon, a
        truncated name, a type label, and one chip per attached state store. The recipe emits{" "}
        <strong>
          exactly one <code>rect</code> scene node per node
        </strong>{" "}
        — that single mark owns the canvas hit area and carries the datum — and draws all the decoration
        in the layout's <code>overlays</code> layer, which is <code>pointer-events: none</code>. So
        the rich glyph never intercepts a hover: hover and click always resolve to the node as a
        unit. As the graph gets denser the recipe drops to a compact glyph, then an icon, then a 5px
        dot (the minimap) — a level-of-detail ramp driven by the fitted size.
      </p>

      <h2 id="interaction">Controlled interaction, owned by the host</h2>
      <p>
        Selection and hover state live in the page, not the chart — exactly the controlled model a
        lineage viewer needs:
      </p>
      <ul>
        <li>
          <strong>Hover → reach preview.</strong> Hovering a node hands the host a
          downstream-reachable id set; it passes that set as <code>layoutConfig.reachableIds</code>,
          and the recipe dims every node and edge outside it. The set is computed once and fed to{" "}
          <em>both</em> the main view and the minimap, so hovering in either dims both.
        </li>
        <li>
          <strong>Click → selection.</strong> A click fires <code>onClick</code>; the host records
          the id and pushes it into a shared selection store. Both charts consume that store through
          their <code>selection</code> prop, so the node rings in <em>both</em> views. The frame
          never owns selection — it only reflects it.
        </li>
        <li>
          <strong>Re-root.</strong> Clicking a topic in the minimap sets it as the new expansion
          root; the main view re-renders the new downstream subgraph with no stale positions.
        </li>
      </ul>

      <h2 id="linked-charts">Two synchronized views via LinkedCharts</h2>
      <p>
        The main view and the minimap are two independent <code>NetworkCustomChart</code> instances
        wrapped in <code>LinkedCharts</code>. The selection a click produces is keyed on the node{" "}
        <code>id</code> and flows through the shared store to{" "}
        <code>NetworkLayoutContext.selection</code> — the recipe reads that predicate to highlight
        the matching node. This is the proof that the coordinated-views layer works in a{" "}
        <code>StreamNetworkFrame</code> custom-layout context, not just for the built-in chart
        types.
      </p>

      <h2 id="snapshot-morph">Snapshot morph</h2>
      <p>
        The <strong>Morph to snapshot</strong> control tweens the lineage between two versions of
        the topology — nodes that persist slide to their new layered positions, a newly-added{" "}
        <code>KTABLE-SUPPRESS</code> stage enters, and a retired processor leaves. Because the
        layout is a pure function of the data, a topology diff is just two layouts to interpolate.
        This gestures at the temporal/animated-topology direction that motivates the migration.
      </p>

      <h2 id="back-edges">Repartition bridges &amp; cycles</h2>
      <p>
        Re-keying before a stateful operator inserts a repartition <em>bridge</em> — a sink to an
        internal <code>…-repartition</code> topic in one sub-topology, re-read by a source in the
        next. A reconciliation path that feeds back upstream closes a cycle; the layout flags that
        edge <code>isBackEdge</code> and the recipe renders it as a distinct dashed loop bowing
        below the forward flow.
      </p>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr>
            <th>What</th>
            <th>Where</th>
            <th>How</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Node glyph / icon</td>
            <td>
              <code>layoutConfig.renderIcon</code>
            </td>
            <td>
              Return any SVG; receives <code>{`{ semantic, partition, size, color }`}</code>
            </td>
          </tr>
          <tr>
            <td>Partition colors</td>
            <td>
              <code>layoutConfig.partitionColors</code>
            </td>
            <td>Map a partition to a fill</td>
          </tr>
          <tr>
            <td>Reach dimming</td>
            <td>
              <code>layoutConfig.reachableIds</code>
            </td>
            <td>A host-computed id set; everything outside dims</td>
          </tr>
          <tr>
            <td>Level of detail</td>
            <td>
              <code>layoutConfig.lod</code>
            </td>
            <td>
              <code>"auto"</code> (default), or force <code>full</code>/<code>compact</code>/
              <code>icon</code>/<code>dot</code>
            </td>
          </tr>
          <tr>
            <td>Store chips</td>
            <td>
              <code>layoutConfig.showStoreChips</code>
            </td>
            <td>
              One chip per attached state store, in <code>full</code> LOD
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="accessibility">Accessibility &amp; performance</h2>
      <p>
        The canvas pipeline provides the chart-level affordances today: a <code>role="img"</code>{" "}
        container with an aria-label, an optional <code>accessibleTable</code> summary of the scene,
        keyboard spatial navigation, and a focus ring. Per-node accessible names, roles, and
        pressed/selected state reaching assistive tech is the production gap — the overlay-glyph
        approach is the path there, since the overlay layer can host real focusable DOM. The layout
        is a pure deterministic function and the catalog graph (~95 nodes) lays out and renders well
        within a frame; a synthetic ~1,000-node graph is the right next stress test for the canvas +
        quadtree substrate.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/custom-charts/overview">Custom Charts</Link> — the customLayout escape hatch
        </li>
        <li>
          <Link to="/recipes/network-explorer">Network Explorer</Link> — force-directed interaction
          patterns
        </li>
        <li>
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> — the underlying frame
        </li>
      </ul>
    </RecipeLayout>
  )
}
