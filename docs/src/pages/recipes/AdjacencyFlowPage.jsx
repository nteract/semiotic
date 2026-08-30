import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import AdjacencyFlow from "../../examples/recipes/AdjacencyFlow"

const fullSourceCode = `import { useMemo, useState } from "react"
import { NetworkCustomChart } from "semiotic/network"
import { adjacencyFlowLayout, aggregateAdjacencyFlow } from "semiotic/recipes"

const nodes = [
  { id: "A", label: "A", group: "ABC" },
  { id: "B", label: "B", group: "ABC" },
  { id: "C", label: "C", group: "ABC" },
  { id: "D", label: "D", group: "DEF" },
  { id: "E", label: "E", group: "DEF" },
  { id: "F", label: "F", group: "DEF" },
  { id: "G", label: "G", group: "GHI" },
  { id: "H", label: "H", group: "GHI" },
  { id: "I", label: "I", group: "GHI" },
]

const edges = [
  { source: "A", target: "B", value: 10 },
  { source: "B", target: "C", value: 25 },
  { source: "C", target: "A", value: 3 },
  { source: "C", target: "D", value: 8 },
  { source: "D", target: "E", value: 7 },
  { source: "E", target: "F", value: 12 },
  { source: "F", target: "D", value: 2 },
  { source: "F", target: "G", value: 9 },
  { source: "G", target: "H", value: 22 },
  { source: "H", target: "I", value: 14 },
  { source: "I", target: "G", value: 5 },
]

export default function AdjacencyFlowExample() {
  const [expandedGroups, setExpandedGroups] = useState(
    () => new Set(["ABC", "DEF", "GHI"])
  )
  const { nodes: visibleNodes, edges: visibleEdges } = useMemo(
    () => aggregateAdjacencyFlow(nodes, edges, {
      groupAccessor: "group",
      expandedGroups,
      includeInternalFlows: true,
    }),
    [expandedGroups]
  )
  const toggleGroup = (group) => {
    if (!group) return
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <NetworkCustomChart
      nodes={visibleNodes}
      edges={visibleEdges}
      nodeIDAccessor="id"
      sourceAccessor="source"
      targetAccessor="target"
      layout={adjacencyFlowLayout}
      layoutConfig={{
        showArrows: true,
        showValues: true,
        colorMode: "single",
        maxCellSize: 92,
        cornerRadius: 9,
      }}
      style={{
        "--semiotic-adjacency-flow-arrow-fill": "rgba(255, 255, 255, 0.72)",
      }}
      tooltip={(d) => d.source
        ? <strong>{d.source} → {d.target}: {d.value}</strong>
        : <strong>{d.label}</strong>}
      onClick={(d) => toggleGroup(d.group)}
      title="Adjacency flow journey"
      description="Ordered weighted flows; forward routes are upper-right and reversals lower-left."
      summary="Three phases dominate, with backtracking concentrated in the middle phase."
      accessibleTable
      width={900}
      height={700}
    />
  )
}
`

export default function AdjacencyFlowPage() {
  return (
    <RecipeLayout
      title="Adjacency Flow"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Adjacency Flow", path: "/recipes/adjacency-flow" },
      ]}
      prevPage={{ title: "Net Ensemble", path: "/recipes/net-ensemble" }}
      dependencies={["semiotic", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        An adjacency matrix is compact, but many readers struggle to trace a path through its cells.
        A Sankey diagram makes flow tangible, but overlapping curves can make dense routes
        ambiguous. <code>adjacencyFlowLayout</code> combines their strongest ideas: nodes keep an
        explicit order along the diagonal, while weighted links travel through matrix cells as
        straight segments with tight rounded turns.
      </p>
      <p>
        This recipe implements Richard Brath&rsquo;s{" "}
        <a
          href="https://richardbrath.wordpress.com/2026/08/30/sankey-matrix-a-better-adjacency-matrix/"
          target="_blank"
          rel="noreferrer"
        >
          Sankey Matrix proposal
        </a>
        , itself inspired by Lawrence Hanley&rsquo;s schematic treatment of the 1968–70 UK textile
        industry. Brath&rsquo;s key observation is that each fillet occupies the same meaningful row
        × column location as an adjacency-matrix cell, while line width preserves the aggregate-flow
        reading of a Sankey.
      </p>

      <h2 id="preview">Interactive preview</h2>
      <p>
        Switch between the nine-step journey and the three-phase summary. Individual phases can be
        expanded in place; click a diagonal node, use the phase chips, hover routes for exact
        totals, or toggle the directional and quantitative cues.
      </p>
      <div
        style={{
          overflow: "hidden",
          border: "1px solid var(--surface-3)",
          borderRadius: 10,
        }}
      >
        <AdjacencyFlow />
      </div>

      <h2 id="reading">How to read it</h2>
      <ul>
        <li>
          <strong>Diagonal squares</strong> preserve the authored sequence. This order is data, not
          a decoration: pass <code>layoutConfig.order</code> when input order is not authoritative.
        </li>
        <li>
          <strong>Upper-right routes</strong> move forward in the sequence; lower-left routes move
          backward. Long jumps remain aligned to the destination&rsquo;s column.
        </li>
        <li>
          <strong>Line width</strong> encodes weight. Ports stack and fit all incident routes
          against a node side, so their combined thickness remains an aggregate input/output cue.
        </li>
        <li>
          <strong>Rounded turns and value labels</strong> occupy row × column cells, preserving the
          lookup behavior of an adjacency matrix without asking the reader to decode isolated marks.
        </li>
      </ul>

      <h2 id="improvements">What the Semiotic recipe adds</h2>
      <p>
        Brath notes that the arrows in his generated prototype are too small. Here each route gets a
        translucent white arrow on its final leg, making forward, reverse, and self-flow unambiguous
        without relying on color. Each triangle is sized from its containing route, inset by at
        least one pixel on both sides, and omitted when two or fewer useful pixels remain. Override
        its fill with <code>arrowColor</code> or the scoped{" "}
        <code>--semiotic-adjacency-flow-arrow-fill</code> variable. Parallel records for the same
        source/target cell are summed before drawing, labels receive a halo over dense strokes, and
        the layout adapts its flow scale to the busiest node port.
      </p>
      <p>
        The square footprint is particularly useful on mobile. A conventional arc diagram lays its
        ordered nodes across one long horizontal baseline, so labels and intervals quickly compress
        or require sideways scrolling. This squarified route uses both viewport dimensions, keeping
        more cell area available at the same phone width and fitting naturally into a responsive
        vertical page.
      </p>
      <p>
        The visible geometry remains a native <code>NetworkCustomChart</code> scene: nodes and
        routes support canvas hit testing, tooltips, click observation, static SVG rendering,
        keyboard node navigation, and an accessible table. Supply <code>title</code>,{" "}
        <code>description</code>, and <code>summary</code> for the conclusion the visual arrangement
        alone cannot communicate.
      </p>

      <h2 id="summary-strategy">Summary and drill-down</h2>
      <p>
        A square matrix has a hard perceptual limit. Brath suggests filtering or aggregation at
        roughly fifty ordered items; the more useful generic strategy is semantic grouping before
        that limit. The headless <code>aggregateAdjacencyFlow</code> transform accepts a{" "}
        <code>groupAccessor</code> and an <code>expandedGroups</code> set, then returns another
        valid node/edge list:
      </p>
      <ul>
        <li>Collapsed groups become one diagonal node, ordered by their first member.</li>
        <li>Parallel cross-group routes are summed.</li>
        <li>
          Within-group movement becomes a self-flow, so summary activity is not silently erased.
        </li>
        <li>Expanded groups restore their ordered members and original internal routes.</li>
      </ul>
      <p>
        Grouping should normally come from the domain—journey phases, processing stages, teams, or
        communities already validated by an analysis—not an opaque layout heuristic. For larger
        data, combine groups with top-k filtering, a minimum-flow threshold, search, and coordinated
        detail views. The transform reports omitted invalid edges but deliberately leaves those
        analytical choices to the application.
      </p>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr>
            <th>Goal</th>
            <th>Option</th>
            <th>Guidance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Preserve a known sequence</td>
            <td>
              <code>order</code>
            </td>
            <td>Prefer an authored event/stage order over an automatic network ordering.</td>
          </tr>
          <tr>
            <td>Make direction redundant</td>
            <td>
              <code>showArrows</code>, <code>arrowColor</code>
            </td>
            <td>
              Keep arrows on unless a tiny summary has no ambiguous routes. Thin routes omit arrows
              automatically; use the CSS fill variable for theme-scoped overrides.
            </td>
          </tr>
          <tr>
            <td>Control density</td>
            <td>
              <code>maxCellSize</code>, <code>flowGap</code>
            </td>
            <td>Cap sparse summaries and preserve a small gap between stacked paths.</td>
          </tr>
          <tr>
            <td>Encode route categories</td>
            <td>
              <code>colorMode</code>
            </td>
            <td>
              Use <code>"single"</code> for weight-first reading. With <code>"source"</code>, each
              source node and its outgoing routes share one palette color for tracing.
            </td>
          </tr>
          <tr>
            <td>Collapse detail</td>
            <td>
              <code>aggregateAdjacencyFlow</code>
            </td>
            <td>
              Drive <code>expandedGroups</code> from click, search, or application state.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/sankey-diagram">Sankey Diagram</Link> — conventional layered flow layout
        </li>
        <li>
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> — lower-level network scene API
        </li>
        <li>
          <Link to="/custom-charts/custom-layouts">Custom Layouts</Link> — authoring and renderer
          contract
        </li>
      </ul>
    </RecipeLayout>
  )
}
