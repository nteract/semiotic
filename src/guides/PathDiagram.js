import React from "react"
import MarkdownText from "../MarkdownText"
import theme from "../theme"
import DocumentFrame, { propertyToString } from "../DocumentFrame"
import { network_data, or_data } from "./pathData"
import { NetworkFrame } from "semiotic"
import dagre from "dagre"
import { scaleLinear } from "d3-scale"

const colors = {
  "Base Import": theme[0],
  Usage: theme[1],
  Intermediary: theme[2],
  Other: theme[3]
}

const colorPre = `const colors = {
  "Base Import": theme[0],
  Usage: theme[1],
  Intermediary: theme[2],
  Other: theme[3]
}`

const frameprops = {
  size: [700, 500],
  nodeStyle: d => ({
    stroke: colors[d.category],
    fill: colors[d.category]
  }),
  edgeStyle: d => ({
    stroke: colors[d.target.category],
    fill: colors[d.source.category],
    fillOpacity: 0.2
  }),
  nodeIDAccessor: "id",
  sourceAccessor: "source",
  targetAccessor: "target",
  edgeWidthAccessor: "value",
  hoverAnnotation: true,
  networkType: {
    type: "sankey",
    nodePaddingRatio: 0.1
  },

  nodeLabels: d => <text>{d.id}</text>,
  margin: { right: 130, bottom: 20 },
  edges: network_data,
  nodes: or_data.map(d => Object.assign({}, d))
}

const overrideProps = {
  graph: "g",
  nodeLabels: `d => <text>{d.id}</text>`,
  nodes: or_data.map(d => Object.assign({}, d))
}

const chord = {
  ...frameprops,
  networkType: "chord",
  nodeLabels: d => {
    return d.output && <text textAnchor="middle">{d.id}</text>
  }
}

const chordOverrideProps = {
  ...overrideProps,
  nodeLabels: `d => {
    return d.output && <text textAnchor="middle">{d.id}</text>
  }`
}

const arc = {
  ...frameprops,
  networkType: "arc",
  edgeStyle: d => ({
    stroke: colors[d.target.category],
    fill: "none"
  }),
  nodeLabels: false,
  size: [800, 300]
}

const pre = `import { scaleLinear } from "d3-scale"
import dagre from "dagre"

${colorPre}

const size = scaleLinear()
.domain([0, 1020])
.range([1, 100]);

const edgeSize = scaleLinear()
.domain([0, 1020])
.range([1, 20]);

const g = new dagre.graphlib.Graph();
g.setGraph({
rankdir: "LR",
ranker: "tight-tree",
nodesep: 1,
ranksep: 15
});
g.setDefaultEdgeLabel(() => ({}));

${propertyToString(frameprops.nodes, 0, false)}.forEach(n => {
  g.setNode(n.id, {
    ...n,
    height: size(Math.max(n.input, n.output)),
    width: 10
  });
});

${propertyToString(frameprops.edges, 0, false)}.forEach(e => {
  g.setEdge(e.source, e.target, {
    weight: edgeSize(e.value)
  });
});

dagre.layout(g);
`

export default () => {
  const size = scaleLinear()
    .domain([0, 1020])
    .range([1, 100])

  const edgeSize = scaleLinear()
    .domain([0, 1020])
    .range([1, 20])

  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: "LR",
    ranker: "tight-tree",
    nodesep: 1,
    ranksep: 15
  })
  g.setDefaultEdgeLabel(() => ({}))

  frameprops.nodes.forEach(n => {
    g.setNode(n.id, {
      ...n,
      height: size(Math.max(n.input, n.output)),
      width: 10
    })
  })

  frameprops.edges.forEach(e => {
    g.setEdge(e.source, e.target, {
      weight: edgeSize(e.value)
    })
  })

  dagre.layout(g)

  return (
    <div>
      <MarkdownText
        text={`

\`NetworkFrame\` allows you to render several data visualizations with calculated positions for nodes based on the complexity of the edges/paths that connect them. For these examples you can pass a \`nodes\` and an \`edges\` list, or just an \`edges\` list and nodes with be inferred.

Edges can either be an array of objects with a \`source\` and a \`target\` property, or a hierarchical object with an array of \`children\` containing objects with \`children\` all the way down the hierarchy. The assumption is that each child's \`id\` property is unique, you can use the \`nodeIdAccessor\` to specify a different key for the id if needed. These types of hierarchies can be created easily from a parent/child  list with d3's [stratify](https://github.com/d3/d3-hierarchy#stratify) functionality.

The built in path types are \`sankey\`, \`arc\`, \`chord\`, and \`dagre\`.

The data on this page use the [UK Department of Energy & Climate Change](https://www.gov.uk/guidance/2050-pathways-analysis) from the [d3-sankey](https://beta.observablehq.com/@mbostock/d3-sankey-diagram) example by Mike Bostock.

## Sankey


    `}
      />

      <DocumentFrame
        frameProps={frameprops}
        type={NetworkFrame}
        overrideProps={overrideProps}
        pre={colorPre}
      />

      <MarkdownText
        text={`
### Sankey Settings
Instead of sending \`networkType\` as a string, you can pass an object with additional layout options.

By default the sankey type uses [d3-sankey layout](https://github.com/d3/d3-sankey) to layout nodes and edges. The \`orient\` property is a pass through to the [alignment](https://github.com/d3/d3-sankey#alignments) options.

\`\`\`jsx
networkType={{ 
  type: "sankey"
  zoomToFit: true, // Zoom the laid out nodes in or out so that they fit the specified size
  projection: "horizontal", // Accepts (horizontal|vertical) direction of flow in the diagram
  orient: "center", // Accepts (left|right|justify|center) sankey node alignment strategy
  iterations: 100, // How many times to run the layout algorithm
  nodeWidth: 24, // Thickness of node along the axis of flow
  nodePaddingRatio: .5 // The ratio of nodes to available space, only if nodePadding is not set
  // nodePadding: Number of pixels between nodes
}}\`\`\`

  `}
      />
      <MarkdownText
        text={`
## Arc

This example is the same as the sankey except we are passing \`networkType="arc"\`.
  `}
      />
      <DocumentFrame
        frameProps={arc}
        type={NetworkFrame}
        startHidden
        overrideProps={overrideProps}
        pre={colorPre}
        hiddenProps={{ nodeLabels: true }}
      />
      <MarkdownText
        text={`
### Ard Settings
Instead of sending \`networkType\` as a string, you can pass an object with additional layout options.

\`\`\`jsx
networkType={{ 
  type: "arc"
  zoomToFit: true, // Zoom the laid out nodes in or out so that they fit the specified size
  // sort: Function
}}\`\`\`

  `}
      />
      <MarkdownText
        text={`
## Chord

This example is the same as the sankey except we are passing \`networkType="chord"\`.
    `}
      />
      <DocumentFrame
        frameProps={chord}
        type={NetworkFrame}
        startHidden
        pre={colorPre}
        overrideProps={chordOverrideProps}
      />
      <MarkdownText
        text={`
### Chord Settings
Instead of sending \`networkType\` as a string, you can pass an object with additional layout options.

You can also pass any parameters for the [d3-sankey layout](https://github.com/d3/d3-sankey)

\`\`\`jsx
networkType={{ 
  type: "chord"
  zoomToFit: true, // Zoom the laid out nodes in or out so that they fit the specified size
  groupWidth: 20, //  Width in pixels of the outer rings
  padAngle: 0.1, // Space between groups in degrees
  // sortGroups: Function
}}\`\`\`

  `}
      />
      <MarkdownText
        text={`
## Dagre

This layout uses the [dagrejs](https://github.com/dagrejs/dagre) library for positioning the nodes and edges. To set up this layout, you pass a \`dagre.grahlib.Graph\` as a \`graph\` prop and set \`networkType="dagre"\`.

When you are setting up a dagre graph you must iterate over the nodes and edges prior to sending them to \`NetworkFrame\`, see code block below for details. During setup you can also specify [layout settings](https://github.com/dagrejs/dagre/wiki#configuring-the-layout).

    `}
      />
      <DocumentFrame
        frameProps={{
          size: frameprops.size,
          graph: g,
          networkType: "dagre",
          nodeStyle: frameprops.nodeStyle,
          edgeStyle: d => ({
            fill: "none",
            stroke: colors[d.source.category],
            strokeWidth: d.weight
          }),
          nodeLabels: d => (
            <text y=".3em" x={-20}>
              {d.id}
            </text>
          )
        }}
        type={NetworkFrame}
        overrideProps={overrideProps}
        pre={pre}
      />
    </div>
  )
}
