import {
  hierarchicalRectNodeGenerator,
  radialRectNodeGenerator,
  chordNodeGenerator,
  chordEdgeGenerator,
  matrixNodeGenerator,
  matrixEdgeGenerator,
  arcEdgeGenerator,
  sankeyNodeGenerator,
  circleNodeGenerator,
  dagreEdgeGenerator,
  sankeyArrowGenerator
} from "../svg/networkDrawing"

// Re-export from new locations for backwards compatibility
export { hierarchicalTypeHash } from "./layouts/hierarchyLayout"
export { sankeyOrientHash } from "./layouts/sankeyLayout"

export function determineNodeIcon(baseCustomNodeIcon, networkSettings, size, nodes) {
  if (baseCustomNodeIcon) return baseCustomNodeIcon

  const center = [size[0] / 2, size[1] / 2]

  switch (networkSettings.type) {
    case "sankey":
      return sankeyNodeGenerator
    case "partition":
      return networkSettings.projection === "radial"
        ? radialRectNodeGenerator(size, center, networkSettings)
        : hierarchicalRectNodeGenerator
    case "treemap":
      return networkSettings.projection === "radial"
        ? radialRectNodeGenerator(size, center, networkSettings)
        : hierarchicalRectNodeGenerator
    case "circlepack":
      return circleNodeGenerator
    case "chord":
      return chordNodeGenerator(size)
    case "dagre":
      return hierarchicalRectNodeGenerator
    case "matrix":
      return matrixNodeGenerator(size, nodes)
  }

  return circleNodeGenerator
}

export function determineEdgeIcon({
  baseCustomEdgeIcon,
  networkSettings,
  size,
  graph,
  nodes
}) {
  if (baseCustomEdgeIcon) return baseCustomEdgeIcon
  switch (networkSettings.type) {
    case "partition":
      return () => null
    case "treemap":
      return () => null
    case "circlepack":
      return () => null
    case "chord":
      return chordEdgeGenerator(size)
    case "matrix":
      return matrixEdgeGenerator(size, nodes)
    case "arc":
      return arcEdgeGenerator(size)
    case "dagre":
      if (graph) return dagreEdgeGenerator(graph.graph().rankdir)
    case "sankey":
      return sankeyArrowGenerator
  }
  return undefined
}

export const basicMiddle = (d) => ({
  edge: d,
  x: (d.source.x + d.target.x) / 2,
  y: (d.source.y + d.target.y) / 2
})

export const edgePointHash = {
  sankey: (d) => ({
    edge: d,
    x: (d.source.x1 + d.target.x0) / 2,
    y: d.circularPathData
      ? d.circularPathData.verticalFullExtent
      : ((d.y0 + d.y1) / 2 + (d.y0 + d.y1) / 2) / 2
  }),
  force: basicMiddle,
  tree: basicMiddle,
  cluster: basicMiddle,
  matrix: (d) => {
    return {
      edge: d,
      x: d.source.y,
      y: d.target.y
    }
  }
}

export const hierarchicalProjectable = {
  partition: true,
  cluster: true,
  tree: true,
  dendrogram: true
}

export const radialProjectable = {
  partition: true,
  cluster: true,
  tree: true,
  dendrogram: true
}
