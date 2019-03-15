import * as React from "react"
import { NetworkFrame } from "../../components"
import ProcessViz from "./ProcessViz"

const dematrixifiedEdges = [
  { source: "apples are amazing", target: "apples are amazing", value: 11975 },
  {
    source: "apples are amazing",
    target: "bananas become boring",
    value: 5871
  },
  {
    source: "apples are amazing",
    target: "cantaloupes can crush cars",
    value: 8916
  },
  {
    source: "apples are amazing",
    target: "dragonfruit don't dry darkly",
    value: 2868
  },
  {
    source: "bananas become boring",
    target: "apples are amazing",
    value: 1951
  },
  {
    source: "bananas become boring",
    target: "bananas become boring",
    value: 10048
  },
  {
    source: "bananas become boring",
    target: "cantaloupes can crush cars",
    value: 2060
  },
  {
    source: "bananas become boring",
    target: "dragonfruit don't dry darkly",
    value: 6171
  },
  {
    source: "cantaloupes can crush cars",
    target: "apples are amazing",
    value: 8010
  },
  {
    source: "cantaloupes can crush cars",
    target: "bananas become boring",
    value: 16145
  },
  {
    source: "cantaloupes can crush cars",
    target: "cantaloupes can crush cars",
    value: 8090
  },
  {
    source: "cantaloupes can crush cars",
    target: "dragonfruit don't dry darkly",
    value: 8045
  },
  {
    source: "dragonfruit don't dry darkly",
    target: "apples are amazing",
    value: 1013
  },
  {
    source: "dragonfruit don't dry darkly",
    target: "bananas become boring",
    value: 990
  },
  {
    source: "dragonfruit don't dry darkly",
    target: "cantaloupes can crush cars",
    value: 940
  },
  {
    source: "dragonfruit don't dry darkly",
    target: "dragonfruit don't dry darkly",
    value: 6907
  }
]

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]

const nodes = [
  {
    id: "apples are amazing",
    color: "orange"
  },
  {
    id: "bananas become boring",
    color: "purple"
  },
  {
    id: "cantaloupes can crush cars",
    color: "red"
  }
]

export default ({ padAngle = 0.01, annotations }) => {
  const chordChart = {
    size: [700, 700],
    edges: dematrixifiedEdges,
    nodes: nodes,
    nodeStyle: d => ({ fill: d.color || colors[d.index], stroke: "black" }),
    edgeStyle: d => ({
      fill: colors[d.source.index],
      stroke: "black",
      opacity: 0.5
    }),
    nodeSizeAccessor: 5,
    sourceAccessor: "source",
    targetAccessor: "target",
    hoverAnnotation: [
      { type: "highlight", style: { fill: "orange" } },
      { type: "frame-hover" }
    ],
    annotations: annotations,
    edgeWidthAccessor: "value",
    networkType: { type: "chord", padAngle },
    nodeLabels: true,
    margin: 50
  }
  return (
    <div>
      <ProcessViz frameSettings={chordChart} frameType="NetworkFrame" />
      <NetworkFrame {...chordChart} />
    </div>
  )
}
