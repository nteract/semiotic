import React from "react";
import MarkdownText from "../MarkdownText";
import DocumentFrame from "../DocumentFrame";
import { NetworkFrame } from "semiotic";
import theme from "../theme";
import { forceSimulation, forceY, forceCollide } from "d3-force";

const frameProps = {
  networkType: {
    type: "force",
    iterations: 100,
    forceManyBody: -250,
    distanceMax: 500,
    edgeStrength: 2
  },
  nodeSizeAccessor: 2,
  edgeStyle: { stroke: theme[2] },
  nodeIDAccessor: "name"
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
## Network Graph





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
## Network Graph Custom Simulation

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
    edgeStrength: 2
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
