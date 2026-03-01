import { NetworkLayoutHandler } from "./types"

export const matrixLayout: NetworkLayoutHandler = ({
  projectedNodes,
  projectedEdges,
  networkSettings,
  adjustedSize
}) => {
  let sortedNodes = projectedNodes
  if (networkSettings.sort) {
    sortedNodes = [...projectedNodes].sort(networkSettings.sort)
  }

  const gridSize = Math.min(...adjustedSize)
  const stepSize = gridSize / (sortedNodes.length + 1)

  sortedNodes.forEach((node, index) => {
    node.x = 0
    node.y = (index + 1) * stepSize
  })

  return { projectedNodes: sortedNodes, projectedEdges }
}

export const arcLayout: NetworkLayoutHandler = ({
  projectedNodes,
  projectedEdges,
  networkSettings,
  adjustedSize
}) => {
  let sortedNodes = projectedNodes
  if (networkSettings.sort) {
    sortedNodes = [...projectedNodes].sort(networkSettings.sort)
  }

  const stepSize = adjustedSize[0] / (sortedNodes.length + 2)

  sortedNodes.forEach((node, index) => {
    node.x = (index + 1) * stepSize
    node.y = adjustedSize[1] / 2
  })

  return { projectedNodes: sortedNodes, projectedEdges }
}

export const simpleLayouts = {
  matrix: matrixLayout,
  arc: arcLayout
}
