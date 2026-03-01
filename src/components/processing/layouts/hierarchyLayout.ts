import {
  tree,
  pack,
  cluster,
  treemap,
  partition
} from "d3-hierarchy"
import { NetworkLayoutHandler, NetworkLayoutMap } from "./types"

export const hierarchicalTypeHash = {
  dendrogram: tree,
  tree,
  circlepack: pack,
  cluster,
  treemap,
  partition
}

// Hierarchy layouts don't use the standard layout handler pattern because
// they are applied during data loading (via hierarchicalTypeHash), not during
// the layout dispatch phase. These entries exist so the layout map recognizes
// these types as valid and falls through to the default node positioning.
const hierarchyFallthrough: NetworkLayoutHandler = ({
  projectedNodes,
  projectedEdges
}) => {
  projectedNodes.forEach((node) => {
    node.x = node.x === undefined ? (node.x0 + node.x1) / 2 : node.x
    node.y = node.y === undefined ? node.y0 : node.y
  })

  return { projectedNodes, projectedEdges }
}

export const hierarchyLayouts: NetworkLayoutMap = {
  tree: hierarchyFallthrough,
  dendrogram: hierarchyFallthrough,
  cluster: hierarchyFallthrough,
  treemap: hierarchyFallthrough,
  circlepack: hierarchyFallthrough,
  partition: hierarchyFallthrough
}
