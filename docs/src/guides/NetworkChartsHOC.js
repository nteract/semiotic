import React from "react"
import MarkdownText from "../MarkdownText"
import {
  ForceDirectedGraph,
  ChordDiagram,
  SankeyDiagram,
  TreeDiagram,
  Tooltip,
  MultiLineTooltip
} from "semiotic"

// Sample data
const forceGraphNodes = [
  { id: "A", group: 1 },
  { id: "B", group: 1 },
  { id: "C", group: 2 },
  { id: "D", group: 2 },
  { id: "E", group: 3 },
  { id: "F", group: 3 }
]

const forceGraphEdges = [
  { source: "A", target: "B", value: 2 },
  { source: "A", target: "C", value: 1 },
  { source: "B", target: "D", value: 3 },
  { source: "C", target: "D", value: 2 },
  { source: "D", target: "E", value: 1 },
  { source: "E", target: "F", value: 2 }
]

const chordData = [
  { source: "A", target: "B", value: 10 },
  { source: "A", target: "C", value: 5 },
  { source: "B", target: "C", value: 8 },
  { source: "B", target: "D", value: 12 },
  { source: "C", target: "D", value: 6 },
  { source: "D", target: "A", value: 7 }
]

const sankeyNodes = [
  { id: "Source A" },
  { id: "Source B" },
  { id: "Middle" },
  { id: "Target A" },
  { id: "Target B" }
]

const sankeyLinks = [
  { source: "Source A", target: "Middle", value: 50 },
  { source: "Source B", target: "Middle", value: 30 },
  { source: "Middle", target: "Target A", value: 40 },
  { source: "Middle", target: "Target B", value: 40 }
]

const treeData = {
  name: "Root",
  children: [
    {
      name: "Branch A",
      children: [
        { name: "Leaf A1" },
        { name: "Leaf A2" },
        { name: "Leaf A3" }
      ]
    },
    {
      name: "Branch B",
      children: [
        { name: "Leaf B1" },
        { name: "Leaf B2" }
      ]
    },
    {
      name: "Branch C",
      children: [
        { name: "Leaf C1" },
        { name: "Leaf C2" },
        { name: "Leaf C3" },
        { name: "Leaf C4" }
      ]
    }
  ]
}

const CodeBlock = ({ code }) => (
  <pre style={{
    background: "#f5f5f5",
    padding: "16px",
    borderRadius: "4px",
    overflow: "auto",
    fontSize: "14px",
    lineHeight: "1.5"
  }}>
    <code>{code}</code>
  </pre>
)

const ExampleContainer = ({ title, children, code }) => (
  <div style={{ marginBottom: "60px" }}>
    <h3>{title}</h3>
    <div style={{
      border: "1px solid #ddd",
      padding: "20px",
      marginBottom: "16px",
      background: "white"
    }}>
      {children}
    </div>
    <CodeBlock code={code} />
  </div>
)

export default function NetworkChartsHOC() {
  return (
    <div>
      <h1>Network Chart Components</h1>

      <MarkdownText
        text={`
Higher-order network chart components provide simplified APIs for visualizing relationships and hierarchies based on \`NetworkFrame\`. These components handle the complexity of network layouts while providing intuitive prop names.

## Benefits

- **Intuitive Props**: Use \`nodes\`, \`edges\`, \`nodeLabel\` instead of Frame internals
- **Smart Defaults**: Pre-configured layouts and styling
- **Built-in Tooltips**: Simple \`tooltip\` prop with Tooltip utilities
- **Multiple Layouts**: Force-directed, hierarchical, flow, and chord diagrams
- **Type Safety**: Full TypeScript support

---
`}
      />

      <ExampleContainer
        title="ForceDirectedGraph"
        code={`import { ForceDirectedGraph, MultiLineTooltip } from "semiotic"

const nodes = [
  { id: "A", group: 1 },
  { id: "B", group: 1 },
  { id: "C", group: 2 }
]

const edges = [
  { source: "A", target: "B", value: 2 },
  { source: "B", target: "C", value: 3 }
]

<ForceDirectedGraph
  nodes={nodes}
  edges={edges}
  width={600}
  height={400}
  nodeLabel="id"
  colorBy="group"
  tooltip={MultiLineTooltip({ title: "id", fields: ["group"] })}
/>`}
      >
        <ForceDirectedGraph
          nodes={forceGraphNodes}
          edges={forceGraphEdges}
          width={600}
          height={400}
          nodeLabel="id"
          colorBy="group"
          tooltip={MultiLineTooltip({ title: "id", fields: ["group"] })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`nodes\`: Array of \`{id, ...}\` objects
- \`edges\`: Array of \`{source, target, ...}\` objects
- \`nodeLabel\`: Field or function for node labels
- \`colorBy\`: Field or function for node colors
- \`nodeSize\`: Size of nodes (number or function)
- \`edgeWidth\`: Thickness of edges (number or function)
- \`iterations\`: Force simulation iterations (default: 300)
- \`tooltip\`: Tooltip configuration

**Use Case:**
Force-directed graphs show network relationships with nodes repelling and edges attracting for natural clustering.

**Advanced:**
Pass any \`NetworkFrame\` prop for complete control. [See NetworkFrame API →](/api/networkframe)

---
`}
      />

      <ExampleContainer
        title="ChordDiagram"
        code={`import { ChordDiagram, MultiLineTooltip } from "semiotic"

const chordData = [
  { source: "A", target: "B", value: 10 },
  { source: "A", target: "C", value: 5 },
  { source: "B", target: "C", value: 8 }
]

<ChordDiagram
  edges={chordData}
  width={600}
  height={600}
  tooltip={MultiLineTooltip({
    fields: ["source", "target", "value"]
  })}
/>`}
      >
        <ChordDiagram
          edges={chordData}
          width={600}
          height={600}
          tooltip={MultiLineTooltip({
            fields: ["source", "target", "value"]
          })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`edges\`: Array of \`{source, target, value, ...}\` objects
- \`colorScheme\`: Color scheme name
- \`nodeLabel\`: Field or function for labels
- \`showLabels\`: Display labels around circumference (default: true)
- \`tooltip\`: Tooltip configuration

**Use Case:**
Chord diagrams show relationships between entities in a circular layout, with ribbon thickness indicating strength.

**Advanced:**
Pass \`networkType\` settings or other \`NetworkFrame\` props for customization.

---
`}
      />

      <ExampleContainer
        title="SankeyDiagram"
        code={`import { SankeyDiagram, MultiLineTooltip } from "semiotic"

const nodes = [
  { id: "Source A" },
  { id: "Middle" },
  { id: "Target A" }
]

const links = [
  { source: "Source A", target: "Middle", value: 50 },
  { source: "Middle", target: "Target A", value: 40 }
]

<SankeyDiagram
  nodes={nodes}
  links={links}
  width={600}
  height={400}
  nodeLabel="id"
  tooltip={MultiLineTooltip({
    fields: ["source", "target", "value"]
  })}
/>`}
      >
        <SankeyDiagram
          nodes={sankeyNodes}
          links={sankeyLinks}
          width={600}
          height={400}
          nodeLabel="id"
          tooltip={MultiLineTooltip({
            fields: ["source", "target", "value"]
          })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`nodes\`: Array of \`{id, ...}\` objects
- \`links\`: Array of \`{source, target, value, ...}\` objects
- \`nodeLabel\`: Field or function for node labels
- \`orientation\`: "horizontal" (default) or "vertical"
- \`colorBy\`: Field or function for link colors
- \`tooltip\`: Tooltip configuration

**Use Case:**
Sankey diagrams show flow quantities between stages, with link width proportional to value.

**Advanced:**
Pass \`networkType\` settings or other \`NetworkFrame\` props for customization.

---
`}
      />

      <ExampleContainer
        title="TreeDiagram"
        code={`import { TreeDiagram, Tooltip } from "semiotic"

const treeData = {
  name: "Root",
  children: [
    {
      name: "Branch A",
      children: [
        { name: "Leaf A1" },
        { name: "Leaf A2" }
      ]
    },
    {
      name: "Branch B",
      children: [
        { name: "Leaf B1" }
      ]
    }
  ]
}

<TreeDiagram
  data={treeData}
  width={600}
  height={400}
  nodeLabel="name"
  tooltip={Tooltip({ title: "name" })}
/>`}
      >
        <TreeDiagram
          data={treeData}
          width={600}
          height={400}
          nodeLabel="name"
          tooltip={Tooltip({ title: "name" })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Hierarchical object with \`children\` arrays
- \`layout\`: "tree" (default), "cluster", or "partition"
- \`orientation\`: "vertical" (default), "horizontal", or "radial"
- \`nodeLabel\`: Field or function for node labels
- \`colorBy\`: Field or function for node colors (e.g., by depth)
- \`tooltip\`: Tooltip configuration

**Use Case:**
Tree diagrams show hierarchical relationships with various layout options.

**Advanced:**
Pass \`networkType\` settings or other \`NetworkFrame\` props for customization.

---

## Common Patterns

### Custom Node Sizes

\`\`\`jsx
<ForceDirectedGraph
  nodeSize={(d) => d.importance * 10}
/>
\`\`\`

### Custom Edge Styling

\`\`\`jsx
<ForceDirectedGraph
  edgeStyle={(d) => ({
    stroke: d.value > 5 ? "#ff0000" : "#cccccc",
    strokeWidth: d.value
  })}
/>
\`\`\`

### Node Labels

\`\`\`jsx
<ForceDirectedGraph
  nodeLabel={(d) => d.name.toUpperCase()}
/>
\`\`\`

### Vertical Sankey

\`\`\`jsx
<SankeyDiagram
  nodes={nodes}
  links={links}
  orientation="vertical"
/>
\`\`\`

### Radial Tree

\`\`\`jsx
<TreeDiagram
  data={treeData}
  orientation="radial"
  layout="cluster"
/>
\`\`\`

### Custom Network Type

\`\`\`jsx
<ForceDirectedGraph
  networkType={{
    type: "force",
    iterations: 500,
    edgeStrength: 0.5,
    nodeStrength: -100
  }}
/>
\`\`\`

### Hierarchical Data from Flat List

\`\`\`jsx
import { stratify } from "d3-hierarchy"

const flatData = [
  { id: "root", parentId: null },
  { id: "a", parentId: "root" },
  { id: "b", parentId: "root" },
  { id: "a1", parentId: "a" }
]

const hierarchyData = stratify()
  .id(d => d.id)
  .parentId(d => d.parentId)(flatData)

<TreeDiagram data={hierarchyData} />
\`\`\`

## TypeScript Support

\`\`\`typescript
import type {
  ForceDirectedGraphProps,
  ChordDiagramProps,
  SankeyDiagramProps,
  TreeDiagramProps
} from "semiotic"

const props: ForceDirectedGraphProps = {
  nodes: myNodes,
  edges: myEdges,
  nodeLabel: "id"
}
\`\`\`

## Network Layouts

### Force-Directed
- **Best for**: General network visualization, social networks
- **Behavior**: Nodes repel, edges attract, creates natural clustering
- **Props**: \`iterations\`, \`edgeStrength\`, \`nodeStrength\`

### Chord
- **Best for**: Showing relationships between categories
- **Behavior**: Circular layout with ribbons showing flows
- **Props**: \`colorScheme\`, \`showLabels\`

### Sankey
- **Best for**: Flow visualization, process diagrams
- **Behavior**: Left-to-right (or top-to-bottom) flow with proportional links
- **Props**: \`orientation\`

### Tree/Cluster/Partition
- **Best for**: Hierarchical data, org charts, file systems
- **Behavior**: Parent-child relationships with various layouts
- **Props**: \`layout\`, \`orientation\`

## Next Steps

- [XY Chart Components →](/guides/xy-charts-hoc) for continuous data
- [Ordinal Chart Components →](/guides/ordinal-charts-hoc) for categorical data
- [Tooltips Guide →](/guides/tooltips) for advanced tooltip customization
- [NetworkFrame API →](/api/networkframe) for complete Frame control
`}
      />
    </div>
  )
}
