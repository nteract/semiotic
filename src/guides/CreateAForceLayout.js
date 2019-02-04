import React from "react";
import MarkdownText from "../MarkdownText";
import DocumentFrame from "../DocumentFrame";
import { NetworkFrame } from "semiotic";
import theme from "../theme";
import { forceSimulation, forceY, forceCollide } from "d3-force";

const frameProps = {
  networkType: {
    type: "force",
    forceManyBody: -250,
    distanceMax: 500,
    edgeStrength: 2
  },
  nodeSizeAccessor: 2,
  edgeStyle: { stroke: theme[2], fill: "none" },
  nodeIDAccessor: "name"
  // filterRenderedNodes: d => d.depth !== 0
};

const combinedFociNodes = [...Array(100)].map((d, i) => ({
  name: `Node ${i}`,
  r: Math.random() * 10 + (i % 4) * 2,
  fociX: (i % 2) * 200 + 50,
  fociY: Math.floor((i % 4) / 2) * 200,
  combinedY: (i % 4) * 75 + 150,
  color: theme[i % 4]
}));

const combinedFociSimulation = forceSimulation()
  .force("collide", forceCollide().radius(d => d.r))
  .force("y", forceY(d => d.combinedY));

const bubbleProps = {
  nodes: combinedFociNodes,
  networkType: {
    type: "force",
    iterations: 200,
    simulation: combinedFociSimulation,
    zoom: false
  },
  nodeStyle: d => ({ fill: d.color })
};

const pre = `
import { forceSimulation, forceY, forceCollide } from "d3-force";

const combinedFociSimulation = forceSimulation()
  .force("collide", forceCollide().radius(d => d.r))
  .force("y", forceY(d => d.combinedY));
`;

const bubbleOverrideProps = {
  networkType: `
  {
    type: "force",
    iterations: 200,
    simulation: combinedFociSimulation,
    zoom: false
  }
  `
};

const ROOT = process.env.PUBLIC_URL;

export default class ForceLayouts extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};

    fetch(`${ROOT}/data/flare.json`)
      .then(response => response.json())
      .then(data => {
        this.setState({ data });
      });
  }

  render() {
    if (!this.state.data) return "Loading...";

    return (
      <div>
        <MarkdownText
          text={`
## Force Layout

\`NetworkFrame\` allows you to render several data visualizations using a force layout created with [d3-force](https://github.com/d3/d3-force). For these examples you can pass a \`nodes\` and an \`edges\` list, or just an \`edges\` list and nodes with be inferred.

Edges can either be an array of objects with a \`source\` and a \`target\` property, or a hierarchical object with an array of \`children\` containing objects with \`children\` all the way down the hierarchy. The assumption is that each child's \`id\` property is unique, you can use the \`nodeIdAccessor\` to specify a different key for the id if needed. These types of hierarchies can be created easily from a parent/child  list with d3's [stratify](https://github.com/d3/d3-hierarchy#stratify) functionality.  

The built in force types are \`force\`, and \`motif\`.

    `}
        />

        <DocumentFrame
          frameProps={{ ...frameProps, edges: this.state.data }}
          // overrideProps={overrideProps}
          type={NetworkFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
  `}
        />
        <MarkdownText
          text={`
## Force Layout with Edge Type

This example is the same as the example above with the additional prop \`edgeType="linearc"\`
`}
        />

        <DocumentFrame
          frameProps={{
            ...frameProps,
            edges: this.state.data,
            edgeType: "linearc"
          }}
          // overrideProps={overrideProps}
          type={NetworkFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
`}
          startHidden
        />

        <MarkdownText
          text={`
### Force Layout Settings 

\`\`\`jsx
networkType={ 
  type: "force" // Can also be "motif" which would lay out several 
  zoom: true, //zoom the laid out nodes in or out so that they fit exactly in the specified size
  iterations: 500, // How many times to run forceSimulation
  edgeStrength: 0.1, // What modifier to use for the strength of connection between nodes with edges
  distanceMax: Infinity, //How far out, in pixels, to exert simulation effects
  edgeDistance: Infinity, //Optimal pixel distance of nodes that are connected
  forceManyBody:  d => -25 * nodeSizeAccessor(d)// Strength of the built in charge
}
edgeType={undefined} //Can take one of the following
  "angled"
  "linearc" //single curved edges 
  "curve" //double curved edges
  "ribbon" //filled area with a width equal to the width property of the edge (which you define via the networkFrame’s edgeWidthAccessor)
  "arrowhead" //a triangular arrowhead
  "halfarrow" //a half-triangle arrowhead
  "nail" //a fat end on the source and the sharp end on the target
  "comet" //a fat end on the target and the sharp end on the source
  "taffy" //the width of the edge width tapers in the center based on the distance between nodes (to highlight the distance that nodes have from each other in spite of being strongly connected)


\`\`\`
`}
        />

        <MarkdownText
          text={`
## Network Graph Custom Simulation

In addition to being able to specify parameters for the built in force simulation, you can also create one and pass it as the \`simulation\` parameter

\`\`\`jsx
const customSimulation = forceSimulation().force(
  "charge",
  forceManyBody()
    .distanceMax(100)
    .strength(-100)
)
      
<NetworkFrame
  edges={data}
  networkType={{
    type: "force",
    iterations: 500,
    simulation: customSimulation,
  }}
  nodeSizeAccessor={2}
  edgeStyle={{ stroke: "${theme[2]}" }}
  nodeIDAccessor="name"
/>
\`\`\`


  `}
        />

        <MarkdownText
          text={`


## Bubble Chart



  `}
        />

        <DocumentFrame
          frameProps={bubbleProps}
          overrideProps={bubbleOverrideProps}
          type={NetworkFrame}
          pre={pre}
        />

        <MarkdownText
          text={`
## What next?

For technical specifications on all of NetworkFrames's features, reference the [NetworkFrame API](#api/networkframe) docs.

`}
        />
      </div>
    );
  }
}
