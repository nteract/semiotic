/**
 * Deterministic data generators for performance benchmarks
 * All generators use seeded random for reproducible results
 */

import seedrandom from 'seedrandom'

const DEFAULT_SEED = 'semiotic-benchmark-2026'

/**
 * Generate XY data for line/scatter plots
 */
export function generateXYData(
  pointCount: number,
  lineCount: number = 1,
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  const lines = []

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    const lineName = `Series ${String.fromCharCode(65 + lineIndex)}`
    const baseValue = 50 + rng() * 50
    const volatility = 5 + rng() * 15

    for (let i = 0; i < pointCount; i++) {
      const noise = (rng() - 0.5) * volatility
      const trend = (i / pointCount) * 20
      const value = baseValue + trend + noise

      lines.push({
        x: i,
        y: Math.max(0, value),
        series: lineName
      })
    }
  }

  return lines
}

/**
 * Generate scatter plot data
 */
export function generateScatterData(
  pointCount: number,
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  const categories = ['A', 'B', 'C', 'D']
  const data = []

  for (let i = 0; i < pointCount; i++) {
    const category = categories[Math.floor(rng() * categories.length)]
    const baseX = categories.indexOf(category) * 25
    const baseY = categories.indexOf(category) * 25

    data.push({
      x: baseX + (rng() - 0.5) * 40,
      y: baseY + (rng() - 0.5) * 40,
      category,
      size: 3 + rng() * 7
    })
  }

  return data
}

/**
 * Generate ordinal data for bar charts
 */
export function generateOrdinalData(
  categoryCount: number,
  pointsPerCategory: number = 1,
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  const data = []

  for (let catIndex = 0; catIndex < categoryCount; catIndex++) {
    const category = `Category ${catIndex + 1}`

    for (let pointIndex = 0; pointIndex < pointsPerCategory; pointIndex++) {
      const series = pointsPerCategory > 1 ? `Series ${String.fromCharCode(65 + pointIndex)}` : undefined

      data.push({
        category,
        series,
        value: 10 + rng() * 90,
        column: category
      })
    }
  }

  return data
}

/**
 * Generate network data (nodes and edges)
 */
export function generateNetworkData(
  nodeCount: number,
  edgeDensity: number = 2.0, // avg edges per node
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  const nodes = []
  const edges = []

  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      label: `Node ${i}`,
      value: 5 + rng() * 20
    })
  }

  // Generate edges based on density
  const targetEdgeCount = Math.floor(nodeCount * edgeDensity)

  for (let i = 0; i < targetEdgeCount; i++) {
    const sourceIndex = Math.floor(rng() * nodeCount)
    let targetIndex = Math.floor(rng() * nodeCount)

    // Avoid self-loops
    while (targetIndex === sourceIndex) {
      targetIndex = Math.floor(rng() * nodeCount)
    }

    edges.push({
      source: nodes[sourceIndex].id,
      target: nodes[targetIndex].id,
      weight: 1 + rng() * 5
    })
  }

  return { nodes, edges }
}

/**
 * Generate hierarchical tree data
 */
export function generateHierarchyData(
  depth: number,
  branchingFactor: number,
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  let nodeId = 0

  function createNode(level: number): any {
    const id = nodeId++
    const node: any = {
      id: `node-${id}`,
      name: `Node ${id}`,
      value: 1 + rng() * 10
    }

    if (level < depth) {
      const childCount = Math.floor(branchingFactor * (0.7 + rng() * 0.6))
      if (childCount > 0) {
        node.children = []
        for (let i = 0; i < childCount; i++) {
          node.children.push(createNode(level + 1))
        }
      }
    }

    return node
  }

  return createNode(0)
}

/**
 * Generate data for swarm layout testing
 */
export function generateSwarmData(
  categoryCount: number,
  pointsPerCategory: number,
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  const columns = []

  for (let catIndex = 0; catIndex < categoryCount; catIndex++) {
    const category = `Cat-${catIndex}`
    const pieces = []

    for (let i = 0; i < pointsPerCategory; i++) {
      pieces.push({
        value: 20 + rng() * 60,
        data: {
          id: `${category}-${i}`,
          category
        }
      })
    }

    columns.push({
      name: category,
      pieces,
      pieceData: pieces.map((p, i) => ({
        ...p,
        scaledValue: p.value,
        scaledVerticalValue: p.value,
        x: 0,
        y: p.value
      })),
      middle: 50 + catIndex * 100,
      width: 80
    })
  }

  return columns
}

/**
 * Generate data for line transformation testing
 */
export function generateLineTransformData(
  pointCount: number,
  lineCount: number,
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  const lines = []

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    const coordinates = []

    for (let i = 0; i < pointCount; i++) {
      coordinates.push({
        x: i,
        y: 10 + rng() * 40,
        value: 10 + rng() * 40
      })
    }

    lines.push({
      coordinates,
      key: `line-${lineIndex}`,
      data: { name: `Line ${lineIndex}` }
    })
  }

  return lines
}

/**
 * Generate Sankey data (nodes + links)
 */
export function generateSankeyData(
  nodeCount: number,
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  const nodes = []
  const links = []

  // Create nodes in layers
  const layerCount = Math.ceil(Math.sqrt(nodeCount))
  const nodesPerLayer = Math.ceil(nodeCount / layerCount)

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      name: `Node ${i}`,
      layer: Math.floor(i / nodesPerLayer)
    })
  }

  // Create links between adjacent layers
  for (let i = 0; i < nodeCount - nodesPerLayer; i++) {
    const layer = Math.floor(i / nodesPerLayer)
    const nextLayerStart = (layer + 1) * nodesPerLayer
    const nextLayerEnd = Math.min(nextLayerStart + nodesPerLayer, nodeCount)

    // Each node connects to 1-3 nodes in next layer
    const connectionCount = 1 + Math.floor(rng() * 3)
    for (let j = 0; j < connectionCount && nextLayerStart < nextLayerEnd; j++) {
      const targetIndex = nextLayerStart + Math.floor(rng() * (nextLayerEnd - nextLayerStart))

      links.push({
        source: nodes[i].id,
        target: nodes[targetIndex].id,
        value: 1 + rng() * 10
      })
    }
  }

  return { nodes, links }
}

/**
 * Generate contour/heatmap data
 */
export function generateContourData(
  pointCount: number,
  seed: string = DEFAULT_SEED
) {
  const rng = seedrandom(seed)
  const data = []

  // Create clusters of points
  const clusterCount = 3
  const clusters = []

  for (let i = 0; i < clusterCount; i++) {
    clusters.push({
      x: 20 + rng() * 60,
      y: 20 + rng() * 60,
      spread: 5 + rng() * 10
    })
  }

  for (let i = 0; i < pointCount; i++) {
    const cluster = clusters[Math.floor(rng() * clusterCount)]

    data.push({
      x: cluster.x + (rng() - 0.5) * cluster.spread * 2,
      y: cluster.y + (rng() - 0.5) * cluster.spread * 2
    })
  }

  return data
}
