import React from "react";
import { NetworkFrame } from "../../components";
import { tree, hierarchy } from "d3-hierarchy";
import { data } from "../sampledata/d3_api";

const root = hierarchy(data, d => d.children);

const treeChart = tree();
treeChart.size([500, 500]);

const treeNodes = treeChart(root).descendants();
treeNodes.forEach((d, i) => {
  d.id = `node-${i}`;
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

export default (
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
);
