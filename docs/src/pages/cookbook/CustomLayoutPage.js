import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import CustomLayout from "../../examples/CustomLayout"

export default function CustomLayoutPage() {
  return (
    <PageLayout
      title="Custom Network Layout"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Custom Network Layout", path: "/cookbook/custom-layout" },
      ]}
      prevPage={{ title: "Adjacency Matrix", path: "/cookbook/matrix" }}
    >
      <p>
        Semiotic's NetworkFrame ships with force, tree, cluster, and other
        built-in layout algorithms. But sometimes you need a specialized layout
        -- perhaps one from d3's ecosystem or a custom algorithm. This recipe
        demonstrates how to plug in d3-flextree, a layout that supports
        variable-sized nodes in a tree, using NetworkFrame's custom layout and
        zoom capabilities.
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
        <CustomLayout />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The <code>networkType</code> prop accepts an object with a{" "}
        <code>layout</code> property for custom layout algorithms. Here,
        d3-flextree is passed as the layout function, with{" "}
        <code>nodeSize</code> and <code>spacing</code> controlling the
        variable dimensions of each node:
      </p>
      <CodeBlock
        code={`networkType: {
  type: "tree",
  layout: flextree,
  nodeSize: d => [d.data.width, d.data.height],
  spacing: () => 10,
  zoom: flextreeZoom
}`}
        language="jsx"
      />
      <p>
        Because flextree positions nodes differently than standard d3-hierarchy
        layouts, a custom <code>zoom</code> function is needed to normalize
        coordinates. This function receives the computed nodes and the target
        size, and adjusts positions to fit within the frame:
      </p>
      <CodeBlock
        code={`const flextreeZoom = (nodes, size) => {
  const minX = Math.min(
    ...nodes.map(n => n.x - n.width / 2)
  )
  const maxX = Math.max(
    ...nodes.map(n => n.x + n.width / 2)
  )
  const minY = Math.min(...nodes.map(n => n.y))
  const maxY = Math.max(
    ...nodes.map(n => n.y + n.height)
  )

  const xScale = size[0] / (maxX - minX)
  const yScale = size[1] / (maxY - minY)

  nodes.forEach(node => {
    node.x = (node.x + Math.abs(minX)) * xScale
    node.data.width = node.data.width * xScale
    node.y = node.y * yScale
    node.data.height = node.data.height * yScale
  })
}`}
        language="jsx"
      />
      <p>
        Each node is rendered with a <code>customNodeIcon</code> that draws
        a rectangle sized to the node's data dimensions:
      </p>
      <CodeBlock
        code={`customNodeIcon: ({ d }) => (
  <rect
    x={d.x - d.data.width / 2}
    y={d.y - 10}
    height={d.data.height - 10}
    width={d.data.width}
    fill={theme[2]}
  />
)`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <code>layout</code> property on <code>networkType</code> lets you
          plug in any d3-compatible hierarchy layout algorithm.
        </li>
        <li>
          The <code>zoom</code> function on <code>networkType</code> provides a
          hook to normalize coordinates from custom layouts to fit the frame
          size.
        </li>
        <li>
          <code>customNodeIcon</code> gives full control over node rendering,
          enabling variable-sized rectangles, images, or any SVG content.
        </li>
        <li>
          Edge styling can be data-driven (here colored by depth) to
          communicate hierarchy level.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — the underlying
          frame for all network visualizations
        </li>
        <li>
          <Link to="/cookbook/matrix">Adjacency Matrix</Link> — an alternative
          network representation
        </li>
        <li>
          <Link to="/features/custom-mark">Custom Marks</Link> — more on
          customNodeIcon and customEdgeIcon
        </li>
      </ul>
    </PageLayout>
  )
}
