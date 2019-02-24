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
  margin: { right: 130 },
  edges: network_data,
  nodes: or_data.map(d => Object.assign({}, d))
}

const chord = {
  ...frameprops,
  networkType: "chord",
  nodeLabels: d => {
    return (
      d.value > 100 &&
      d.sourceLinks.length > 0 && <text textAnchor="middle">{d.id}</text>
    )
  }
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

const overrideProps = {
  graph: "g",
  nodeLabels: `d => <text>{d.id}</text>`,
  nodes: propertyToString(or_data, 0, true)
}

const pre = `const size = scaleLinear()
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

frameprops.nodes.forEach(n => {
  g.setNode(n.id, {
    ...n,
    height: size(Math.max(n.input, n.output)),
    width: 10
  });
});

frameprops.edges.forEach(e => {
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

The data on this page use the [UK Department of Energy & Climate Change](https://www.gov.uk/guidance/2050-pathways-analysis) and the [d3-sankey](https://beta.observablehq.com/@mbostock/d3-sankey-diagram) example by Mike Bostock.

## Path Diagrams

\`NetworkFrame\` allows you to render several data visualizations with calculated positions for nodes based on the complexity of the edges/paths that connect them. For these examples you can pass a \`nodes\` and an \`edges\` list, or just an \`edges\` list and nodes with be inferred.

Edges can either be an array of objects with a \`source\` and a \`target\` property, or a hierarchical object with an array of \`children\` containing objects with \`children\` all the way down the hierarchy. The assumption is that each child's \`id\` property is unique, you can use the \`nodeIdAccessor\` to specify a different key for the id if needed. These types of hierarchies can be created easily from a parent/child  list with d3's [stratify](https://github.com/d3/d3-hierarchy#stratify) functionality.

The built in path types are \`sankey\`, \`arc\`, \`chord\`, and \`dagre\`.

## Sankey


    `}
      />

      <DocumentFrame
        frameProps={frameprops}
        type={NetworkFrame}
        overrideProps={overrideProps}
      />

      <MarkdownText
        text={`
### Sankey Settings
In addition to just sending \`networkType\` as a string, you could pass an object with additional layout options.

By default the sankey type uses [d3-sankey layout](https://github.com/d3/d3-sankey) to layout nodes and edges. The \`orient\` property is a pass through to the [alignment](https://github.com/d3/d3-sankey#alignments) options.

\`\`\`jsx
networkType={{ 
  type: "sankey"
  zoom: true, // zoom the laid out nodes in or out so that they fit exactly in the specified size
  projection: "horizontal", // accepts (horizontal|vertical) direction of flow in the diagram
  orient: "center", // accepts (left|right|justify|center) sankey node alignment strategy
  iterations: 100, // how many times to run the layout algorithm
  nodeWidth: 24, // thickness of node along the axis of flow
  nodePaddingRatio: .5 // the ratio of nodes to available space, only if nodePadding is not set
  // nodePadding: number of pixels between nodes
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
      />
      <MarkdownText
        text={`
### Ard Settings
In addition to just sending \`networkType\` as a string, you could pass an object with additional layout options.

\`\`\`jsx
networkType={{ 
  type: "arc"
  zoom: true // zoom the laid out nodes in or out so that they fit 
  // sort: function
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
        overrideProps={overrideProps}
      />
      <MarkdownText
        text={`
### Chord Settings
In addition to just sending \`networkType\` as a string, you could pass an object with additional layout options.

You can also pass any parameters for the [d3-sankey layout](https://github.com/d3/d3-sankey)

\`\`\`jsx
networkType={{ 
  type: "chord"
  zoom: true, // zoom the laid out nodes in or out so that they fit exactly in the specified size
  groupWidth: 20, //  width in pixels of the outer rings
  padAngle: 0.1, // space between groups in degrees
  // sortGroups: function
}}\`\`\`

  `}
      />
      <MarkdownText
        text={`
## Dagre

This layout uses the [dagrejs](https://github.com/dagrejs/dagre) library for laying out the nodes and edges. To set up this layout, you pass a \`dagre.grahlib.Graph\` as a graph paramter within \`networkType\`.

When you are setting up with dagre graph you must iterate over the nodes and edges prior to sending them to \`NetworkFrame\`, see code block below for details. At this time you can also specify [layout settings](https://github.com/dagrejs/dagre/wiki#configuring-the-layout).

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
      <MarkdownText
        text={`
## What next?

For technical specifications on all of NetworkFrames's features, reference the [NetworkFrame API](#api/networkframe) docs.

`}
      />
    </div>
  )
}
