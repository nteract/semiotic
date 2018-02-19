import React from 'react'
import { MinimapNetworkFrame } from '../../components'
import ProcessViz from './ProcessViz'

const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
const edges = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'a' },
  { source: 'c', target: 'b' }
]

const networkFrameSettings = {
  nodes: nodes,
  edges: edges,
  nodeStyle: { fill: 'red' },
  edgeStyle: { stroke: 'gold' }
}

export default (brushFunction, extent, selectedExtent) => {
  const minimapChart = {
    size: [700, 700],
    ...networkFrameSettings,
    matte: true,
    margin: { left: 50, top: 10, bottom: 50, right: 20 },
    minimap: {
      margin: { top: 20, bottom: 35, left: 20, right: 20 },
      ...networkFrameSettings,
      brushEnd: brushFunction,
      xBrushExtent: extent,
      size: [200, 200]
    }
  }
  return (
    <div>
      <ProcessViz
        frameSettings={minimapChart}
        frameType="MinimapNetworkFrame"
      />
      <MinimapNetworkFrame {...minimapChart} />
    </div>
  )
}
