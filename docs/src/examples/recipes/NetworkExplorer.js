import React, { useState } from "react"
import { NetworkFrame } from "semiotic"

const sampleNodes = [
  { id: "Alice", label: "Alice", group: "Engineering", connections: 4 },
  { id: "Bob", label: "Bob", group: "Engineering", connections: 3 },
  { id: "Carol", label: "Carol", group: "Design", connections: 3 },
  { id: "Dave", label: "Dave", group: "Design", connections: 2 },
  { id: "Eve", label: "Eve", group: "Product", connections: 4 },
  { id: "Frank", label: "Frank", group: "Product", connections: 2 },
  { id: "Grace", label: "Grace", group: "Engineering", connections: 3 },
  { id: "Heidi", label: "Heidi", group: "Marketing", connections: 2 },
  { id: "Ivan", label: "Ivan", group: "Marketing", connections: 2 },
  { id: "Judy", label: "Judy", group: "Engineering", connections: 2 },
]

const sampleEdges = [
  { source: "Alice", target: "Bob", weight: 3 },
  { source: "Alice", target: "Carol", weight: 2 },
  { source: "Alice", target: "Eve", weight: 4 },
  { source: "Alice", target: "Grace", weight: 1 },
  { source: "Bob", target: "Grace", weight: 2 },
  { source: "Bob", target: "Judy", weight: 1 },
  { source: "Carol", target: "Dave", weight: 3 },
  { source: "Carol", target: "Eve", weight: 2 },
  { source: "Dave", target: "Frank", weight: 1 },
  { source: "Eve", target: "Frank", weight: 2 },
  { source: "Eve", target: "Heidi", weight: 1 },
  { source: "Eve", target: "Ivan", weight: 1 },
  { source: "Grace", target: "Judy", weight: 2 },
  { source: "Heidi", target: "Ivan", weight: 3 },
]

const groupColors = {
  Engineering: "#6366f1",
  Design: "#22c55e",
  Product: "#f59e0b",
  Marketing: "#ef4444",
}

function NodeDetail({ node, edges }) {
  if (!node) {
    return (
      <div style={{ color: "var(--text-secondary)", fontSize: "14px", padding: "16px 0" }}>
        Click a node to see details.
      </div>
    )
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
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#fff",
        background: groupColors[node.group] || "var(--accent)",
        marginBottom: "12px",
      }}>
        {node.group}
      </div>
      <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
        {connectedNames.length} connection{connectedNames.length !== 1 ? "s" : ""}
      </div>
      <div style={{ fontSize: "13px" }}>
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Connected to:</div>
        <ul style={{ margin: 0, paddingLeft: "16px" }}>
          {connectedNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function NetworkExplorer({
  nodes = sampleNodes,
  edges = sampleEdges,
  width = 500,
  height = 400,
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  const searchLower = searchTerm.toLowerCase()

  return (
    <div className="recipe-network-layout">
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          type="text"
          className="recipe-search-input"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
          nodeStyle={(d) => {
            const isMatch = !searchTerm || d.label.toLowerCase().includes(searchLower)
            const isSelected = selectedNode && selectedNode.id === d.id
            const isHovered = hoveredNode && hoveredNode.id === d.id
            return {
              fill: groupColors[d.group] || "var(--accent)",
              stroke: isSelected ? "var(--text-primary)" : isHovered ? "var(--text-primary)" : "none",
              strokeWidth: isSelected ? 3 : isHovered ? 2 : 0,
              opacity: isMatch ? 1 : 0.15,
              cursor: "pointer",
            }
          }}
          edgeStyle={(d) => {
            const sourceId = typeof d.source === "string" ? d.source : d.source.id
            const targetId = typeof d.target === "string" ? d.target : d.target.id
            const sourceMatch = !searchTerm || sourceId.toLowerCase().includes(searchLower)
            const targetMatch = !searchTerm || targetId.toLowerCase().includes(searchLower)
            return {
              stroke: "var(--text-secondary)",
              strokeWidth: d.weight || 1,
              opacity: sourceMatch || targetMatch ? 0.4 : 0.05,
            }
          }}
          customClickBehavior={(d) => setSelectedNode(d)}
          customHoverBehavior={(d) => setHoveredNode(d || null)}
          nodeLabels={(d) => {
            const isMatch = !searchTerm || d.label.toLowerCase().includes(searchLower)
            return (
              <text
                y={-10}
                textAnchor="middle"
                style={{
                  fontSize: "11px",
                  fill: "var(--text-primary)",
                  opacity: isMatch ? 1 : 0.15,
                  pointerEvents: "none",
                }}
              >
                {d.label}
              </text>
            )
          }}
          margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
        />
      </div>
      <div className="recipe-network-sidebar">
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700 }}>Node Detail</h3>
        <NodeDetail node={selectedNode} edges={edges} />
        <div style={{ marginTop: "24px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700 }}>Groups</h3>
          {Object.entries(groupColors).map(([group, color]) => (
            <div key={group} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", fontSize: "13px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              {group}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
