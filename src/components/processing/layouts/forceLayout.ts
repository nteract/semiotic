import {
  forceSimulation,
  forceX,
  forceY,
  forceLink,
  forceManyBody
} from "d3-force"
import { scaleLinear } from "d3-scale"
import { min, max } from "d3-array"
import { breadthFirstCompontents } from "../hierarchyUtils"
import { NetworkLayoutHandler } from "./types"

export const forceLayout: NetworkLayoutHandler = ({
  projectedNodes,
  projectedEdges,
  networkSettings,
  adjustedSize,
  nodeSizeAccessor
}) => {
  // Adaptive iteration count for force layout: reduce iterations for large networks
  const nodeCount = projectedNodes.length
  const adaptiveIterations = Math.max(
    50,
    Math.min(300, Math.floor(300 - (nodeCount - 30) * 2))
  )

  const {
    iterations = adaptiveIterations,
    edgeStrength = 0.1,
    distanceMax = Infinity,
    edgeDistance,
    forceManyBody: nsForceMB = (d) => -25 * nodeSizeAccessor(d)
  } = networkSettings

  // Set deterministic initial positions for nodes that don't have x/y yet.
  // d3-force uses Math.random() for unpositioned nodes which produces
  // different layouts on every render. A phyllotaxis spiral gives
  // evenly-distributed starting positions based on index alone.
  const cx = adjustedSize[0] / 2
  const cy = adjustedSize[1] / 2
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  projectedNodes.forEach((node, i) => {
    if (node.x == null || node.y == null) {
      const r = Math.sqrt(i + 0.5) * 10
      const theta = i * goldenAngle
      node.x = cx + r * Math.cos(theta)
      node.y = cy + r * Math.sin(theta)
    }
  })

  const linkForce = forceLink().strength((d) =>
    Math.min(2.5, d.weight ? d.weight * edgeStrength : edgeStrength)
  )

  if (edgeDistance) {
    linkForce.distance(edgeDistance)
  }

  const simulation =
    networkSettings.simulation ||
    forceSimulation().force(
      "charge",
      forceManyBody().distanceMax(distanceMax).strength(nsForceMB)
    )

  simulation.nodes(projectedNodes)

  const forceMod = adjustedSize[1] / adjustedSize[0]

  if (!simulation.force("x")) {
    simulation.force(
      "x",
      forceX(adjustedSize[0] / 2).strength(forceMod * 0.1)
    )
  }
  if (!simulation.force("y")) {
    simulation.force("y", forceY(adjustedSize[1] / 2).strength(0.1))
  }

  if (projectedEdges.length !== 0 && !simulation.force("link")) {
    simulation.force("link", linkForce)
    simulation.force("link").links(projectedEdges)
  }

  //reset alpha if it's too cold
  if (simulation.alpha() < 0.1) {
    simulation.alpha(1)
  }

  simulation.stop()

  for (let i = 0; i < iterations; ++i) {
    simulation.tick()
  }

  return { projectedNodes, projectedEdges }
}

export const motifsLayout: NetworkLayoutHandler = ({
  projectedNodes,
  projectedEdges,
  networkSettings,
  adjustedSize,
  nodeSizeAccessor,
  size
}) => {
  const componentMap = new Map()
  projectedEdges.forEach((edge) => {
    ;[edge.source, edge.target].forEach((node) => {
      if (!componentMap.get(node)) {
        componentMap.set(node, {
          node,
          component: -99,
          connectedNodes: [],
          edges: []
        })
      }
    })

    componentMap.get(edge.source).connectedNodes.push(edge.target)
    componentMap.get(edge.target).connectedNodes.push(edge.source)
    componentMap.get(edge.source).edges.push(edge)
  })

  const components = breadthFirstCompontents(projectedNodes, componentMap)

  const largestComponent = Math.max(
    projectedNodes.length / 3,
    components[0].componentNodes.length
  )

  const layoutSize = size[0] > size[1] ? size[1] : size[0]
  const layoutDirection = size[0] > size[1] ? "horizontal" : "vertical"

  // Adaptive iteration count for motifs layout (same as force layout)
  const nodeCount = projectedNodes.length
  const adaptiveIterations = Math.max(
    50,
    Math.min(300, Math.floor(300 - (nodeCount - 30) * 2))
  )

  const {
    iterations = adaptiveIterations,
    edgeStrength = 0.1,
    edgeDistance,
    padding = 0
  } = networkSettings

  let currentX = padding
  let currentY = padding

  components.forEach(({ componentNodes, componentEdges }) => {
    const linkForce = forceLink().strength((d) =>
      Math.min(2.5, d.weight ? d.weight * edgeStrength : edgeStrength)
    )

    if (edgeDistance) {
      linkForce.distance(edgeDistance)
    }

    const componentLayoutSize =
      Math.max(componentNodes.length / largestComponent, 0.2) * layoutSize

    const xBound = componentLayoutSize + currentX
    const yBound = componentLayoutSize + currentY

    if (layoutDirection === "horizontal") {
      if (yBound > size[1]) {
        currentX = componentLayoutSize + currentX + padding
        currentY = componentLayoutSize + padding
      } else {
        currentY = componentLayoutSize + currentY + padding
      }
    } else {
      if (xBound > size[0]) {
        currentY = componentLayoutSize + currentY + padding
        currentX = componentLayoutSize + padding
      } else {
        currentX = componentLayoutSize + currentX + padding
      }
    }

    const xCenter = currentX - componentLayoutSize / 2
    const yCenter = currentY - componentLayoutSize / 2

    const simulation = forceSimulation()
      .force(
        "charge",
        forceManyBody().strength(
          networkSettings.forceManyBody ||
            ((d) => -25 * nodeSizeAccessor(d))
        )
      )
      .force("link", linkForce)

    simulation
      .force("x", forceX(xCenter))
      .force("y", forceY(yCenter))
      .nodes(componentNodes)

    simulation.force("link").links(componentEdges)

    simulation.stop()

    for (let i = 0; i < iterations; ++i) simulation.tick()

    const maxX = max(componentNodes.map((d) => d.x))
    const maxY = max(componentNodes.map((d) => d.y))
    const minX = min(componentNodes.map((d) => d.x))
    const minY = min(componentNodes.map((d) => d.y))

    const resetX = scaleLinear()
      .domain([minX, maxX])
      .range([currentX - componentLayoutSize, currentX - 20])
    const resetY = scaleLinear()
      .domain([minY, maxY])
      .range([currentY - componentLayoutSize, currentY - 20])

    componentNodes.forEach((node) => {
      node.x = resetX(node.x)
      node.y = resetY(node.y)
    })
  })

  return { projectedNodes, projectedEdges, components }
}
