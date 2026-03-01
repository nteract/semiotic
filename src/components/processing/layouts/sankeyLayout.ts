import {
  sankeyCircular,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify
} from "d3-sankey-circular"
import { NetworkLayoutHandler } from "./types"

export const sankeyOrientHash = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify
}

export const sankeyLayout: NetworkLayoutHandler = ({
  projectedNodes,
  projectedEdges,
  networkSettings,
  adjustedSize,
  nodeIDAccessor
}) => {
  const {
    orient = "center",
    iterations = 100,
    nodePadding,
    nodePaddingRatio = nodePadding ? undefined : 0.5,
    nodeWidth = networkSettings.type === "flowchart" ? 2 : 24,
    customSankey,
    direction = "right",
    showArrows = false
  } = networkSettings

  const sankeyOrient = sankeyOrientHash[orient]

  const actualSankey = customSankey || sankeyCircular

  let frameExtent = [[0, 0], adjustedSize]

  if (
    networkSettings.direction === "up" ||
    networkSettings.direction === "down"
  ) {
    frameExtent = [
      [0, 0],
      [adjustedSize[1], adjustedSize[0]]
    ]
  }

  // CREATE FAKE EDGES TO GET UP TO PASSED VALUE
  let resultEdges = projectedEdges
  const generateEphemeralEdges = projectedNodes.some(
    (n) => !n.createdByFrame && n.value > 0
  )
  if (generateEphemeralEdges) {
    const edgeValueMap = new Map()
    for (const edge of projectedEdges) {
      if (!edgeValueMap.has(edge.source.id)) {
        edgeValueMap.set(edge.source.id, {
          source: 0,
          target: 0
        })
      }
      if (!edgeValueMap.has(edge.target.id)) {
        edgeValueMap.set(edge.target.id, {
          source: 0,
          target: 0
        })
      }
      edgeValueMap.get(edge.source.id).source += edge.value
      edgeValueMap.get(edge.target.id).target += edge.value
    }
    for (const node of projectedNodes) {
      if (!node.createdByFrame) {
        let maxEdgeValue = 0
        if (edgeValueMap.has(node.id)) {
          maxEdgeValue = Math.max(
            edgeValueMap.get(node.id).source,
            edgeValueMap.get(node.id).target
          )
        }
        if (node.value > maxEdgeValue) {
          projectedEdges.push({
            source: node,
            target: node,
            value: node.value - maxEdgeValue,
            ephemeral: true
          })
        }
      }
    }
  }

  const frameSankey = actualSankey()
    .extent(frameExtent)
    .links(projectedEdges)
    .nodes(projectedNodes)
    .nodeAlign(sankeyOrient)
    .nodeId(nodeIDAccessor)
    .nodeWidth(nodeWidth)
    .iterations(iterations)

  if (generateEphemeralEdges) {
    resultEdges = projectedEdges.filter((e) => !e.ephemeral)
  }

  if (frameSankey.nodePaddingRatio && nodePaddingRatio) {
    frameSankey.nodePaddingRatio(nodePaddingRatio)
  } else if (nodePadding) {
    frameSankey.nodePadding(nodePadding)
  }

  frameSankey()

  projectedNodes.forEach((d) => {
    d.height = d.y1 - d.y0
    d.width = d.x1 - d.x0
    d.x = d.x0 + d.width / 2
    d.y = d.y0 + d.height / 2
    d.radius = d.height / 2
    d.direction = direction
  })

  const finalEdges = generateEphemeralEdges ? resultEdges : projectedEdges
  finalEdges.forEach((d) => {
    d.showArrows = showArrows
    d.sankeyWidth = d.width
    d.direction = direction
    d.width = undefined
  })

  return { projectedNodes, projectedEdges: finalEdges }
}
