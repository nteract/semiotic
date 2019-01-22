import React from "react";
import MarkdownText from "../MarkdownText";
import theme from "../theme";
import DocumentFrame from "../DocumentFrame";
import { network_data, or_data } from "./pathData";
import { NetworkFrame } from "semiotic";
import dagre from "dagre";
import { scaleLinear } from "d3-scale";

const colors = {
  "Base Import": theme[0],
  Usage: theme[1],
  Intermediary: theme[2],
  Other: theme[3]
};

const frameprops = {
  size: [700, 500],
  nodes: or_data.map(d => Object.assign({}, d)),

  nodeStyle: d => ({
    stroke: colors[d.category],
    fill: colors[d.category]
  }),
  edgeStyle: d => ({
    stroke: colors[d.target.category],
    fill: colors[d.source.category],
    strokeWidth: 1,
    fillOpacity: 0.2,
    strokeOpacity: 1
  }),
  nodeIDAccessor: "id",
  sourceAccessor: "source",
  targetAccessor: "target",
  edgeWidthAccessor: "value",
  hoverAnnotation: true,
  networkType: {
    type: "sankey",
    orient: "right",

    nodePaddingRatio: 0.1
  },

  nodeLabels: d => <text>{d.id}</text>,
  margin: { right: 130 },
  edges: network_data,
  nodes: or_data.map(d => Object.assign({}, d))
};

const chord = {
  ...frameprops,
  networkType: {
    type: "chord"
  }
};

const overrideProps = {
  graph: "g",
  nodeLabels: `d => <text>{d.id}</text>`
};

const pre = `
const theme = ${JSON.stringify(theme)}          

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
`;

export default () => {
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

  return (
    <div>
      <MarkdownText
        text={`
## Sankey


## Chord


## Dagre

    `}
      />

      <DocumentFrame
        frameProps={{
          size: frameprops.size,
          graph: g,
          networkType: { type: "dagre", zoom: true },
          nodeStyle: frameprops.nodeStyle,
          edgeStyle: d => ({
            fill: "none",
            stroke: colors[d.source.category],
            strokeWidth: d.weight
          })
        }}
        type={NetworkFrame}
        overrideProps={overrideProps}
        pre={pre}
      />

      <DocumentFrame
        frameProps={chord}
        type={NetworkFrame}
        pre={`
const theme = ${JSON.stringify(theme)}          
`}
        overrideProps={overrideProps}
      />

      <DocumentFrame
        frameProps={frameprops}
        type={NetworkFrame}
        pre={`
const theme = ${JSON.stringify(theme)}          
`}
        overrideProps={overrideProps}
      />
    </div>
  );
};
