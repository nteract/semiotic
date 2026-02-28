import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import Matrix from "../../examples/Matrix"

export default function MatrixPage() {
  return (
    <PageLayout
      title="Adjacency Matrix"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Adjacency Matrix", path: "/cookbook/matrix" },
      ]}
      prevPage={{
        title: "Isotype Chart",
        path: "/cookbook/isotype-chart",
      }}
      nextPage={null}
    >
      <p>
        Force-directed network graphs look impressive but become unreadable at
        scale. An adjacency matrix represents the same network data as a grid,
        where each cell encodes the relationship between two nodes. This recipe
        uses NetworkFrame's <code>matrix</code> network type to display
        character co-occurrences from Les Miserables in a compact, sortable
        grid.
      </p>

      <h2 id="the-visualization">The Visualization</h2>
      <div
        style={{
          background: "var(--surface-1)",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid var(--surface-3)",
        }}
      >
        <Matrix />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The <code>matrix</code> network type in NetworkFrame takes a standard
        nodes-and-edges data structure and renders it as a grid. Each cell is
        colored based on edge properties. The <code>edgeStyle</code> function
        uses the source node's group to color edges, making community structure
        visible:
      </p>
      <CodeBlock
        code={`networkType: "matrix",
nodes: nodes,
edges: edges,
nodeIDAccessor: "name",
nodeLabels: true,
edgeStyle: d => ({
  fill: theme[d.source.group + 1],
  stroke: theme[d.source.group + 1],
  fillOpacity: 0.75
}),
nodeStyle: {
  fill: "none",
  stroke: "#DDD"
}`}
        language="jsx"
      />
      <p>
        Interactivity is added through <code>hoverAnnotation</code> with both
        a frame-hover tooltip and a highlight effect that emphasizes the
        hovered row and column:
      </p>
      <CodeBlock
        code={`hoverAnnotation: [
  { type: "frame-hover" },
  {
    type: "highlight",
    style: {
      fill: theme[0],
      fillOpacity: 0.25,
      stroke: theme[1]
    }
  }
]`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>matrix</code> network type renders nodes and edges as an
          adjacency matrix grid, ideal for dense networks.
        </li>
        <li>
          Edge styling can encode source or target attributes (like community
          group) to reveal structural patterns.
        </li>
        <li>
          <code>nodeLabels: true</code> adds row and column labels from the
          node ID accessor.
        </li>
        <li>
          The highlight hover annotation emphasizes entire rows and columns,
          helping users trace relationships.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — the underlying
          frame for network visualizations
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — hover and
          highlight annotation types
        </li>
      </ul>
    </PageLayout>
  )
}
