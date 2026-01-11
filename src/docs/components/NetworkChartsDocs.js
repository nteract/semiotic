import * as React from "react"
import { useState } from "react"
import DocumentComponent from "../layout/DocumentComponent"
import {
  ForceDirectedGraph,
  ChordDiagram,
  SankeyDiagram,
  TreeDiagram
} from "../../components"
import { TooltipProvider } from "../../components/store/TooltipStore"

const components = []

components.push({
  name: "Network Charts"
})

const NetworkChartsDocs = () => {
  const [treeLayout, setTreeLayout] = useState("tree")
  const [treeOrientation, setTreeOrientation] = useState("vertical")

  // Force-directed graph data
  const forceNodes = [
    { id: "A", category: "Core" },
    { id: "B", category: "Core" },
    { id: "C", category: "Peripheral" },
    { id: "D", category: "Peripheral" },
    { id: "E", category: "Peripheral" },
    { id: "F", category: "Core" }
  ]

  const forceEdges = [
    { source: "A", target: "B", value: 5 },
    { source: "A", target: "C", value: 3 },
    { source: "B", target: "D", value: 4 },
    { source: "B", target: "E", value: 2 },
    { source: "C", target: "F", value: 6 },
    { source: "D", target: "E", value: 3 },
    { source: "E", target: "F", value: 4 },
    { source: "F", target: "A", value: 2 }
  ]

  // Chord diagram data
  const chordEdges = [
    { source: "A", target: "B", value: 100 },
    { source: "B", target: "A", value: 80 },
    { source: "A", target: "A", value: 50 },
    { source: "B", target: "C", value: 60 },
    { source: "C", target: "B", value: 40 },
    { source: "C", target: "A", value: 30 },
    { source: "C", target: "C", value: 70 }
  ]

  const chordNodes = [
    { id: "A", category: "Group 1" },
    { id: "B", category: "Group 2" },
    { id: "C", category: "Group 3" }
  ]

  // Sankey diagram data
  const sankeyEdges = [
    { source: "Coal", target: "Power Station", value: 100 },
    { source: "Gas", target: "Power Station", value: 80 },
    { source: "Oil", target: "Power Station", value: 60 },
    { source: "Power Station", target: "Industrial", value: 150 },
    { source: "Power Station", target: "Residential", value: 90 }
  ]

  const sankeyNodes = [
    { id: "Coal", category: "Source" },
    { id: "Gas", category: "Source" },
    { id: "Oil", category: "Source" },
    { id: "Power Station", category: "Middle" },
    { id: "Industrial", category: "Consumer" },
    { id: "Residential", category: "Consumer" }
  ]

  // Tree diagram data
  const treeData = {
    name: "Root",
    children: [
      {
        name: "Branch A",
        children: [
          { name: "Leaf A1", value: 100 },
          { name: "Leaf A2", value: 150 },
          { name: "Leaf A3", value: 80 }
        ]
      },
      {
        name: "Branch B",
        children: [
          { name: "Leaf B1", value: 120 },
          {
            name: "Branch B2",
            children: [
              { name: "Leaf B2a", value: 90 },
              { name: "Leaf B2b", value: 110 }
            ]
          }
        ]
      },
      {
        name: "Branch C",
        children: [
          { name: "Leaf C1", value: 200 },
          { name: "Leaf C2", value: 130 }
        ]
      }
    ]
  }

  const examples = []

  // ForceDirectedGraph
  examples.push({
    name: "ForceDirectedGraph",
    demo: (
      <TooltipProvider>
        <ForceDirectedGraph
          nodes={forceNodes}
          edges={forceEdges}
          width={500}
          height={400}
          nodeColorBy="category"
          edgeColorBy="source"
          nodeSize={10}
          iterations={500}
        />
      </TooltipProvider>
    ),
    source: `<ForceDirectedGraph
  nodes={nodes}
  edges={edges}
  width={500}
  height={400}
  nodeColorBy="category"
  edgeColorBy="source"
  nodeSize={10}
  iterations={500}
/>`
  })

  // ChordDiagram
  examples.push({
    name: "ChordDiagram",
    demo: (
      <TooltipProvider>
        <ChordDiagram
          nodes={chordNodes}
          edges={chordEdges}
          width={500}
          height={500}
          colorBy="category"
          edgeColorBy="source"
          padAngle={0.05}
          groupWidth={25}
        />
      </TooltipProvider>
    ),
    source: `<ChordDiagram
  nodes={nodes}
  edges={edges}
  width={500}
  height={500}
  colorBy="category"
  edgeColorBy="source"
  padAngle={0.05}
  groupWidth={25}
/>`
  })

  // SankeyDiagram
  examples.push({
    name: "SankeyDiagram",
    demo: (
      <TooltipProvider>
        <SankeyDiagram
          nodes={sankeyNodes}
          edges={sankeyEdges}
          width={600}
          height={400}
          colorBy="category"
          edgeColorBy="source"
          nodeAlign="justify"
          nodeWidth={20}
        />
      </TooltipProvider>
    ),
    source: `<SankeyDiagram
  nodes={nodes}
  edges={edges}
  width={600}
  height={400}
  colorBy="category"
  edgeColorBy="source"
  nodeAlign="justify"
  nodeWidth={20}
/>`
  })

  // TreeDiagram
  const layoutOptions = ["tree", "cluster", "treemap", "partition", "circlepack"].map(
    (d) => (
      <option key={d} value={d}>
        {d}
      </option>
    )
  )

  const orientationOptions = ["vertical", "horizontal", "radial"].map((d) => (
    <option key={d} value={d}>
      {d}
    </option>
  ))

  const buttons = [
    <form key="tree-layout">
      <label htmlFor="tree-layout">Layout: </label>
      <select value={treeLayout} onChange={(e) => setTreeLayout(e.target.value)}>
        {layoutOptions}
      </select>
    </form>,
    <form key="tree-orientation">
      <label htmlFor="tree-orientation">Orientation: </label>
      <select
        value={treeOrientation}
        onChange={(e) => setTreeOrientation(e.target.value)}
        disabled={treeLayout === "treemap" || treeLayout === "circlepack"}
      >
        {orientationOptions}
      </select>
    </form>
  ]

  examples.push({
    name: "TreeDiagram",
    demo: (
      <TooltipProvider>
        <TreeDiagram
          data={treeData}
          width={500}
          height={500}
          layout={treeLayout}
          orientation={treeOrientation}
          colorByDepth={true}
          nodeSize={6}
        />
      </TooltipProvider>
    ),
    source: `<TreeDiagram
  data={hierarchicalData}
  width={500}
  height={500}
  layout="${treeLayout}"
  orientation="${treeOrientation}"
  colorByDepth={true}
  nodeSize={6}
/>`
  })

  return (
    <DocumentComponent
      name="Network Charts"
      components={components}
      examples={examples}
      buttons={buttons}
    >
      <p>
        Network chart components provide simplified APIs for creating graph and
        hierarchical visualizations. All network charts are built on top of
        NetworkFrame and inherit its powerful features.
      </p>

      <h2>ForceDirectedGraph</h2>
      <p>
        Visualize networks with physics-based node positioning. Nodes repel
        each other while edges pull connected nodes together.
      </p>
      <p>
        <strong>Key props:</strong> <code>iterations</code>,{" "}
        <code>nodeSize</code>, <code>nodeColorBy</code>,{" "}
        <code>edgeColorBy</code>, <code>chargeStrength</code>,{" "}
        <code>linkDistance</code>
      </p>
      <p>
        <strong>Best for:</strong> Exploring network structure, finding
        clusters, understanding connectivity
      </p>

      <h2>ChordDiagram</h2>
      <p>
        Display directed relationships in a circular layout. Shows asymmetric
        connections and self-loops effectively.
      </p>
      <p>
        <strong>Key props:</strong> <code>padAngle</code>,{" "}
        <code>groupWidth</code>, <code>sortGroups</code>,{" "}
        <code>edgeColorBy</code> (source, target, or custom)
      </p>
      <p>
        <strong>Best for:</strong> Migration flows, trade relationships,
        communication patterns, any reciprocal relationships
      </p>
      <p>
        <strong>Note:</strong> Works best when there are many self-loops and
        uneven but reciprocated connections
      </p>

      <h2>SankeyDiagram</h2>
      <p>
        Show flow and magnitude through a system. Width of flows indicates
        quantity.
      </p>
      <p>
        <strong>Key props:</strong> <code>orientation</code>,{" "}
        <code>nodeAlign</code> (justify, left, right, center),{" "}
        <code>nodeWidth</code>, <code>nodePaddingRatio</code>,{" "}
        <code>edgeColorBy</code>, <code>edgeSort</code>
      </p>
      <p>
        <strong>Best for:</strong> Energy flows, budget allocation, material
        flows, conversion funnels
      </p>
      <p>
        <strong>Important:</strong> Designed for directed acyclic graphs (no
        cycles). If your data has cycles, consider using a force-directed
        layout instead.
      </p>

      <h2>TreeDiagram</h2>
      <p>
        Visualize hierarchical data with multiple layout algorithms. Supports
        tree, cluster, treemap, partition, and circle pack layouts.
      </p>
      <p>
        <strong>Key props:</strong> <code>layout</code>,{" "}
        <code>orientation</code>, <code>colorByDepth</code>,{" "}
        <code>valueAccessor</code> (for sizing layouts), <code>nodeSize</code>
      </p>

      <h3>Layout Types</h3>
      <ul>
        <li>
          <strong>tree:</strong> Standard tree layout with all leaves at the
          same depth
        </li>
        <li>
          <strong>cluster:</strong> Dendrogram with all leaves at the same
          level
        </li>
        <li>
          <strong>treemap:</strong> Space-filling rectangles showing hierarchy
          and size
        </li>
        <li>
          <strong>partition:</strong> Icicle or sunburst chart (radial
          partition)
        </li>
        <li>
          <strong>circlepack:</strong> Nested circles showing hierarchy and
          size
        </li>
      </ul>

      <h3>Orientations</h3>
      <ul>
        <li>
          <strong>vertical:</strong> Root at top, children below (tree,
          cluster)
        </li>
        <li>
          <strong>horizontal:</strong> Root at left, children to right (tree,
          cluster)
        </li>
        <li>
          <strong>radial:</strong> Circular layout from center outward (tree,
          cluster, partition)
        </li>
      </ul>

      <h3>Advanced Usage</h3>
      <p>
        All network chart components accept a <code>frameProps</code> prop that
        passes any NetworkFrame prop for advanced customization:
      </p>
      <pre>
        {`<ForceDirectedGraph
  nodes={nodes}
  edges={edges}
  frameProps={{
    customNodeIcon: ({ d }) => <circle r={d.importance} />,
    filterRenderedNodes: (nodes) => nodes.filter(d => d.active),
    networkType: {
      type: "force",
      iterations: 1000,
      forceManyBody: -100
    }
  }}
/>`}
      </pre>

      <h3>Data Format</h3>
      <p>
        <strong>Graph-based (Force, Chord, Sankey):</strong>
      </p>
      <pre>
        {`const nodes = [{ id: "A" }, { id: "B" }]
const edges = [{ source: "A", target: "B", value: 10 }]`}
      </pre>
      <p>
        <strong>Hierarchical (Tree):</strong>
      </p>
      <pre>
        {`const data = {
  name: "Root",
  children: [
    { name: "A", value: 100 },
    { name: "B", children: [...] }
  ]
}`}
      </pre>
    </DocumentComponent>
  )
}

NetworkChartsDocs.title = "Network Charts"

export default NetworkChartsDocs
