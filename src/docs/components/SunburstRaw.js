import React from "react"
import { NetworkFrame } from "../../components"
import data from "../sampledata/flare"
import { cluster } from "d3-hierarchy"

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]

console.log("data", data)

export default ({ annotations = [], type = "partition", projection }) => (
  <NetworkFrame
    size={[700, 700]}
    edges={data}
    //    nodes={treeNodes}
    nodeStyle={(d, i) => ({
      fill: colors[d.depth],
      stroke: "black",
      opacity: 0.75
    })}
    edgeStyle={(d, i) => ({
      fill: colors[d.source.depth],
      stroke: colors[d.source.depth],
      opacity: 0.5
    })}
    //    nodeSizeAccessor={}
    nodeIDAccessor={"name"}
    hoverAnnotation={true}
    networkType={{
      type,
      projection: projection,
      //      layout: cluster,
      nodePadding: 1,
      forceManyBody: -15,
      edgeStrength: 1.5,
      padding: 0,
      hierarchySum: d => d.size
    }}
    tooltipContent={d => (
      <div className="tooltip-content">
        {d.parent ? <p>{d.parent.data.name}</p> : undefined}
        <p>{d.data.name}</p>
      </div>
    )}
    annotationSettings={{
      layout: "bump",
      pointSizeFunction: () => 5,
      labelSizeFunction: noteData => {
        return (noteData.note.title || noteData.note.label).length * 1
      }
    }}
    annotations={annotations}
    margin={50}
    nodeLabels={true}
  />
)
