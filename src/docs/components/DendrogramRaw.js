import React from "react";
import { NetworkFrame } from "../../components";
import { data } from "../sampledata/d3_api";
import { cluster } from "d3-hierarchy";

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

export default ({ annotations = [], type = "dendrogram" }) => (
  <NetworkFrame
    size={[700, 400]}
    edges={data}
    //    nodes={treeNodes}
    nodeStyle={(d, i) => ({ fill: colors[d.depth], stroke: colors[d.depth] })}
    edgeStyle={(d, i) => ({
      fill: colors[d.source.depth],
      stroke: colors[d.source.depth],
      opacity: 0.5
    })}
    nodeSizeAccessor={1}
    nodeIDAccessor={"name"}
    hoverAnnotation={true}
    networkType={{
      type: "force",
      projection: "horizontal",
      //      layout: cluster,
      nodePadding: 1,
      forceManyBody: -15,
      edgeStrength: 1.5
    }}
    tooltipContent={d => (
      <div className="tooltip-content">
        {d.parent ? <p>{d.parent.data.name}</p> : undefined}
        <p>{d.data.name}</p>
      </div>
    )}
    annotations={annotations}
    margin={20}
  />
);
