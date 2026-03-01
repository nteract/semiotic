import { chord, ribbon } from "d3-chord"
import { arc } from "d3-shape"
import pathBounds from "svg-path-bounding-box"
import { matrixify } from "../hierarchyUtils"
import { NetworkLayoutHandler } from "./types"

export const chordLayout: NetworkLayoutHandler = ({
  projectedNodes,
  projectedEdges,
  networkSettings,
  adjustedSize,
  edgeHash,
  nodeIDAccessor,
  edgeWidthAccessor
}) => {
  const radius = adjustedSize[1] / 2

  const { groupWidth = 20, padAngle = 0.01, sortGroups } = networkSettings

  const arcGenerator = arc()
    .innerRadius(radius - groupWidth)
    .outerRadius(radius)

  const ribbonGenerator = ribbon().radius(radius - groupWidth)

  const matrixifiedNetwork = matrixify({
    edgeHash: edgeHash,
    nodes: projectedNodes,
    edgeWidthAccessor,
    nodeIDAccessor
  })

  const chordGenerator = chord().padAngle(padAngle)

  if (sortGroups) {
    chordGenerator.sortGroups(sortGroups)
  }

  const chords = chordGenerator(matrixifiedNetwork)
  const groups = chords.groups

  groups.forEach((group) => {
    const groupCentroid = arcGenerator.centroid(group)
    const groupD = arcGenerator(group)
    const groupNode = projectedNodes[group.index]
    groupNode.d = groupD
    groupNode.index = group.index
    groupNode.x = groupCentroid[0] + adjustedSize[0] / 2
    groupNode.y = groupCentroid[1] + adjustedSize[1] / 2
  })

  chords.forEach((generatedChord) => {
    const chordD = ribbonGenerator(generatedChord)

    const nodeSourceID = nodeIDAccessor(
      projectedNodes[generatedChord.source.index]
    )
    const nodeTargetID = nodeIDAccessor(
      projectedNodes[generatedChord.target.index]
    )
    // d3-chord always emits source.index < target.index, which may
    // not match the original edge direction. Try both key orders.
    const chordEdge =
      edgeHash.get(`${nodeSourceID}|${nodeTargetID}`) ||
      edgeHash.get(`${nodeTargetID}|${nodeSourceID}`)
    if (chordEdge) {
      chordEdge.d = chordD
      const chordBounds = pathBounds(chordD)
      chordEdge.x =
        adjustedSize[0] / 2 + (chordBounds.x1 + chordBounds.x2) / 2
      chordEdge.y =
        adjustedSize[1] / 2 + (chordBounds.y1 + chordBounds.y2) / 2
    }
  })

  return { projectedNodes, projectedEdges }
}
