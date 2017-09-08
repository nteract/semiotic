import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { NetworkFrame } from "../../components";
import DendrogramRaw from "./DendrogramRaw";

const components = [];

components.push({
  name: "Dendrogram"
});

export default class Dendrogram extends React.Component {
  render() {
    const buttons = [];

    const examples = [];
    examples.push({
      name: "Basic",
      demo: DendrogramRaw,
      source: `import React from "react";
import { NetworkFrame } from "../../components";
import { tree, hierarchy } from "d3-hierarchy";
import { data } from "../sampledata/d3_api";

const root = hierarchy(data, d => d.children);

const treeChart = tree();
treeChart.size([500, 500]);

const treeNodes = treeChart(root).descendants();
treeNodes.forEach((d, i) => {
  d.id = ${"`node-${i}`;"}
});

const treeEdges = [
  ...treeNodes.filter(d => d.parent !== null).map(d => ({
    source: d.parent.id,
    target: d.id,
    weight: 1
  }))
];

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

const layoutFunction = ({ edges, nodes }) => ({ edges, nodes });

  <NetworkFrame
    size={[700, 400]}
    edges={treeEdges}
    nodes={treeNodes}
    nodeStyle={(d, i) => ({ fill: colors[d.depth], stroke: colors[d.depth] })}
    edgeStyle={(d, i) => ({
      fill: colors[d.source.depth],
      stroke: colors[d.source.depth],
      opacity: 0.5
    })}
    nodeSizeAccessor={1}
    sourceAccessor={"source"}
    targetAccessor={"target"}
    nodeIDAccessor={"id"}
    hoverAnnotation={true}
    networkType={{ type: layoutFunction }}
    tooltipContent={d => (
      <div className="tooltip-content">
        {d.parent ? <p>{d.parent.data.name}</p> : undefined}
        <p>{d.data.name}</p>
      </div>
    )}
    margin={20}
  />
`
    });

    return (
      <DocumentComponent
        name="Dendrogram"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          A dendrogram is a kind of tree diagram. This example passes a function
          to the networkType that just returns the nodes and edges because we've
          used D3's tree layout to calculate the nodes and then mapped those
          nodes into an array of source/target kinds of objects that
          NetworkFrame expects.
        </p>
        <p>The dataset is the D3v3 library.</p>
      </DocumentComponent>
    );
  }
}

Dendrogram.title = "Dendrogram";
