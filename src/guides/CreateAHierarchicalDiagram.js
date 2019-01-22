import React from "react";
import MarkdownText from "../MarkdownText";
import DocumentFrame from "../DocumentFrame";
import { NetworkFrame } from "semiotic";
import theme from "../theme";

const ROOT = process.env.PUBLIC_URL;
const nodeStyle = d => ({
  fill: theme[d.depth],
  stroke: theme[d.depth],
  fillOpacity: 0.6
});
const sunburst = {
  size: [700, 700],
  // edges: data,
  nodeStyle,
  nodeIDAccessor: "name",
  hoverAnnotation: [
    { type: "desaturation-layer", style: { fill: "white", fillOpacity: 0.25 } },
    {
      type: "highlight",
      style: nodeStyle
    },
    { type: "frame-hover" }
  ],
  networkType: {
    type: "partition",
    projection: "radial",
    nodePadding: 1,
    hierarchySum: d => d.value
  },
  tooltipContent: d => (
    <div className="tooltip-content">
      {d.parent ? <p>{d.parent.data.name}</p> : undefined}
      <p>{d.data.name}</p>
    </div>
  ),
  nodeLabels: d => {
    return d.x1 - d.x0 < 8 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    );
  },
  margin: 10,
  filterRenderedNodes: d => d.depth !== 0
};

const overrideProps = {
  tooltipContent: `d => (
    <div className="tooltip-content">
      {d.parent ? <p>{d.parent.data.name}</p> : undefined}
      <p>{d.data.name}</p>
    </div>`,
  nodeLabels: `d => {
    return d.x1 - d.x0 < 8 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    );
  }`,
  nodeStyle: `d => ({
    fill: theme[d.depth],
    stroke: theme[d.depth],
    fillOpacity: 0.6
  })`
};

const partition = {
  ...sunburst,
  networkType: {
    type: "partition",
    projection: "vertical",
    nodePadding: 1,
    hierarchySum: d => d.value
  },
  size: [900, 300],
  nodeLabels: d => {
    return d.x1 - d.x0 < 20 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    );
  }
};

const partitionOverrideProps = {
  ...overrideProps,
  nodeLabels: `d => {
    return d.x1 - d.x0 < 20 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    );
  }`
};

const tree = {
  ...sunburst,
  networkType: {
    type: "tree",
    projection: "vertical",
    nodePadding: 1,
    hierarchySum: d => d.value
  },
  edgeStyle: d => ({
    fill: theme[d.source.depth],
    stroke: theme[d.source.depth],
    opacity: 0.5
  }),
  size: [700, 400]
};

const circlepack = {
  ...sunburst,
  networkType: {
    type: "circlepack",
    hierarchySum: d => d.value
  },
  nodeStyle: d => ({
    fill: "none",
    stroke: theme[d.depth]
  }),
  size: [700, 400]
};

const treemap = {
  ...circlepack,
  networkType: {
    type: "treemap",
    nodePadding: 5,
    hierarchySum: d => d.value
  }
};

export default class HierarchicalDiagrams extends React.Component {
  constructor(props) {
    super(props);

    fetch(`${ROOT}/data/flare.json`)
      .then(response => response.json())
      .then(data => {
        this.setState({ data });
      });
  }

  render() {
    if (!this.state) return null;

    return (
      <div>
        <MarkdownText
          text={`
## Dendrogram


`}
        />
        <DocumentFrame
          frameProps={{ ...tree, edges: this.state.data }}
          overrideProps={overrideProps}
          type={NetworkFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
    `}
        />

        <MarkdownText
          text={`

## Circle Pack

`}
        />
        <DocumentFrame
          frameProps={{ ...circlepack, edges: this.state.data }}
          overrideProps={overrideProps}
          type={NetworkFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
  `}
        />

        <MarkdownText
          text={`

## Treemap

`}
        />

        <DocumentFrame
          frameProps={{ ...treemap, edges: this.state.data }}
          overrideProps={overrideProps}
          type={NetworkFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
`}
        />

        <MarkdownText
          text={`

## Partition

        
    `}
        />

        <DocumentFrame
          frameProps={{ ...partition, edges: this.state.data }}
          overrideProps={partitionOverrideProps}
          type={NetworkFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
        `}
        />
        <MarkdownText
          text={`

## Sunburst
        
    `}
        />

        <DocumentFrame
          frameProps={{ ...sunburst, edges: this.state.data }}
          overrideProps={overrideProps}
          type={NetworkFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
        `}
        />
      </div>
    );
  }
}
