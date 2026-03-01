import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import NetworkExplorer from "../../examples/recipes/NetworkExplorer"

const fullSourceCode = `import React, { useState } from "react"
import { NetworkFrame } from "semiotic"

const groupColors = {
  Engineering: "#6366f1",
  Design: "#22c55e",
  Product: "#f59e0b",
  Marketing: "#ef4444",
}

function NodeDetail({ node, edges }) {
  if (!node) {
    return <div style={{ color: "#8888a0", fontSize: "14px", padding: "16px 0" }}>
      Click a node to see details.
    </div>
  }

  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id ||
           (e.source && e.source.id === node.id) || (e.target && e.target.id === node.id)
  )
  const connectedNames = connectedEdges.map((e) => {
    const sourceId = typeof e.source === "string" ? e.source : e.source.id
    const targetId = typeof e.target === "string" ? e.target : e.target.id
    return sourceId === node.id ? targetId : sourceId
  })

  return (
    <div>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{node.label}</div>
      <div style={{
        display: "inline-block", padding: "2px 8px", borderRadius: "999px",
        fontSize: "11px", fontWeight: 600, color: "#fff",
        background: groupColors[node.group] || "#6366f1", marginBottom: "12px",
      }}>
        {node.group}
      </div>
      <div style={{ fontSize: "13px", color: "#8888a0", marginBottom: "8px" }}>
        {connectedNames.length} connection{connectedNames.length !== 1 ? "s" : ""}
      </div>
      <div style={{ fontSize: "13px" }}>
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Connected to:</div>
        <ul style={{ margin: 0, paddingLeft: "16px" }}>
          {connectedNames.map((name) => <li key={name}>{name}</li>)}
        </ul>
      </div>
    </div>
  )
}

export default function NetworkExplorer({ nodes, edges, width = 500, height = 400 }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  const searchLower = searchTerm.toLowerCase()

  return (
    <div style={{ display: "flex", gap: "24px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%", padding: "8px 12px", marginBottom: "12px",
            background: "var(--surface-2, #1a1a25)",
            border: "1px solid var(--surface-3, #252530)",
            borderRadius: "6px", color: "var(--text-primary, #f0f0f5)",
            fontSize: "14px", outline: "none",
          }}
        />
        <NetworkFrame
          size={[width, height]}
          nodes={nodes}
          edges={edges}
          networkType={{ type: "force", iterations: 500 }}
          nodeSizeAccessor={5}
          sourceAccessor="source"
          targetAccessor="target"
          nodeIDAccessor="id"
          nodeStyle={(d) => ({
            fill: groupColors[d.group] || "#6366f1",
            stroke: selectedNode?.id === d.id ? "#f0f0f5" :
                    hoveredNode?.id === d.id ? "#f0f0f5" : "none",
            strokeWidth: selectedNode?.id === d.id ? 3 : hoveredNode?.id === d.id ? 2 : 0,
            opacity: !searchTerm || d.label.toLowerCase().includes(searchLower) ? 1 : 0.15,
            cursor: "pointer",
          })}
          edgeStyle={(d) => {
            const sid = typeof d.source === "string" ? d.source : d.source.id
            const tid = typeof d.target === "string" ? d.target : d.target.id
            const match = !searchTerm ||
              sid.toLowerCase().includes(searchLower) ||
              tid.toLowerCase().includes(searchLower)
            return {
              stroke: "#8888a0", strokeWidth: d.weight || 1,
              opacity: match ? 0.4 : 0.05,
            }
          }}
          customClickBehavior={(d) => setSelectedNode(d)}
          customHoverBehavior={(d) => setHoveredNode(d || null)}
          nodeLabels={(d) => (
            <text y={-10} textAnchor="middle" style={{
              fontSize: "11px", fill: "#f0f0f5",
              opacity: !searchTerm || d.label.toLowerCase().includes(searchLower) ? 1 : 0.15,
              pointerEvents: "none",
            }}>
              {d.label}
            </text>
          )}
          margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
        />
      </div>
      <div style={{ width: "240px", flexShrink: 0 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Node Detail</h3>
        <NodeDetail node={selectedNode} edges={edges} />
      </div>
    </div>
  )
}

// Usage:
// <NetworkExplorer
//   nodes={[{ id: "A", label: "Alice", group: "Eng", connections: 3 }, ...]}
//   edges={[{ source: "A", target: "B", weight: 2 }, ...]}
//   width={500} height={400}
// />`

export default function NetworkExplorerPage() {
  return (
    <RecipeLayout
      title="Network Explorer"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Network Explorer", path: "/recipes/network-explorer" },
      ]}
      prevPage={{ title: "Time Series with Brush", path: "/recipes/time-series-brush" }}
      dependencies={["semiotic", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        An interactive force-directed network graph with search filtering,
        click-to-select nodes, and a detail sidebar. Uses Semiotic's
        <code>NetworkFrame</code> with <code>customClickBehavior</code> and
        <code>customHoverBehavior</code> for full interaction control.
      </p>

      <h2 id="preview">Preview</h2>
      <div style={{
        background: "var(--surface-1)",
        borderRadius: "8px",
        padding: "16px",
        border: "1px solid var(--surface-3)",
      }}>
        <NetworkExplorer />
      </div>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr><th>What</th><th>Where</th><th>How</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Group colors</td>
            <td><code>groupColors</code> object</td>
            <td>Map your group names to hex colors</td>
          </tr>
          <tr>
            <td>Node size</td>
            <td><code>nodeSizeAccessor</code></td>
            <td>Use a number or function <code>d =&gt; d.connections * 2</code></td>
          </tr>
          <tr>
            <td>Force layout</td>
            <td><code>networkType</code></td>
            <td>Adjust <code>iterations</code>, or switch to <code>"motifs"</code></td>
          </tr>
          <tr>
            <td>Sidebar content</td>
            <td><code>NodeDetail</code> component</td>
            <td>Add more fields from your node data</td>
          </tr>
          <tr>
            <td>Edge thickness</td>
            <td><code>edgeStyle</code></td>
            <td>Map <code>d.weight</code> to a different scale</td>
          </tr>
        </tbody>
      </table>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        <code>NetworkFrame</code> with <code>networkType: &#123; type: "force" &#125;</code>
        runs a force simulation to position nodes. The <code>customClickBehavior</code>
        callback stores the selected node in state, while <code>customHoverBehavior</code>
        provides hover feedback.
      </p>
      <p>
        Search filtering works by adjusting <code>nodeStyle</code> and <code>edgeStyle</code>
        opacity based on whether each node's label matches the search term. Non-matching
        nodes and their edges fade to near-transparent.
      </p>
      <p>
        The sidebar's <code>NodeDetail</code> component reads the edges array to find
        all connections for the selected node and lists them.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/frames/network-frame">NetworkFrame</Link> — the underlying frame</li>
        <li><Link to="/charts/force-directed-graph">Force Directed Graph</Link> — basic force layout chart</li>
        <li><Link to="/features/interaction">Interaction</Link> — click and hover patterns</li>
      </ul>
    </RecipeLayout>
  )
}
