/**
 * Chord Matrix Benchmarks
 *
 * Tests the O(n²) matrix creation for chord diagrams
 * This creates a full n×n adjacency matrix which is expensive for large networks
 *
 * For n nodes, creates n² matrix cells (e.g., 500 nodes = 250,000 cells)
 */

import { describe, bench } from 'vitest'
import { generateNetworkData } from '../setup/data-generators'

/**
 * Simplified matrixify function from network.ts
 * Creates n×n adjacency matrix from edge list
 */
function matrixify(options: {
  edgeHash: Map<string, any>
  nodes: any[]
  edgeWidthAccessor: (edge: any) => number
  nodeIDAccessor: (node: any) => string
}) {
  const { edgeHash, nodes, edgeWidthAccessor, nodeIDAccessor } = options
  const matrix: number[][] = []

  nodes.forEach((nodeSource, sourceIndex) => {
    const sourceID = nodeIDAccessor(nodeSource)
    matrix[sourceIndex] = []

    nodes.forEach((nodeTarget, targetIndex) => {
      const targetID = nodeIDAccessor(nodeTarget)
      const edgeWeight = edgeHash.get(`${sourceID}|${targetID}`)

      matrix[sourceIndex][targetIndex] = edgeWeight
        ? edgeWidthAccessor(edgeWeight)
        : 0
    })
  })

  return matrix
}

describe('Chord Matrix Creation (O(n²))', () => {
  const testSizes = [
    { name: '20-nodes', nodeCount: 20, expectedOps: 400 },
    { name: '50-nodes', nodeCount: 50, expectedOps: 2500 },
    { name: '100-nodes', nodeCount: 100, expectedOps: 10000 },
    { name: '200-nodes', nodeCount: 200, expectedOps: 40000 },
    { name: '500-nodes', nodeCount: 500, expectedOps: 250000 },
  ]

  for (const { name, nodeCount, expectedOps } of testSizes) {
    const { nodes, edges } = generateNetworkData(nodeCount, 2.0)

    // Build edge hash (preprocessing, not part of benchmark)
    const edgeHash = new Map()
    edges.forEach(edge => {
      edgeHash.set(`${edge.source}|${edge.target}`, edge)
    })

    bench(`chord-matrix-${name}-${expectedOps}ops`, () => {
      const matrix = matrixify({
        edgeHash,
        nodes,
        edgeWidthAccessor: (edge) => edge.weight || 1,
        nodeIDAccessor: (node) => node.id
      })

      // Matrix should be n×n
      if (matrix.length !== nodeCount) {
        throw new Error(`Matrix size mismatch: ${matrix.length} vs ${nodeCount}`)
      }
    })
  }
})

describe('Chord Matrix - Scaling Verification', () => {
  // Verify that time grows as O(n²)
  const sizes = [20, 40, 80]

  for (const nodeCount of sizes) {
    const { nodes, edges } = generateNetworkData(nodeCount, 2.0)

    const edgeHash = new Map()
    edges.forEach(edge => {
      edgeHash.set(`${edge.source}|${edge.target}`, edge)
    })

    bench(`chord-matrix-scaling-${nodeCount}`, () => {
      matrixify({
        edgeHash,
        nodes,
        edgeWidthAccessor: (edge) => edge.weight || 1,
        nodeIDAccessor: (node) => node.id
      })
    })
  }
})

describe('Chord Matrix - Dense vs Sparse Networks', () => {
  const nodeCount = 100

  const densities = [
    { name: 'sparse-1x', density: 1.0 },
    { name: 'medium-3x', density: 3.0 },
    { name: 'dense-5x', density: 5.0 },
  ]

  for (const { name, density } of densities) {
    const { nodes, edges } = generateNetworkData(nodeCount, density)

    const edgeHash = new Map()
    edges.forEach(edge => {
      edgeHash.set(`${edge.source}|${edge.target}`, edge)
    })

    bench(`chord-matrix-100nodes-${name}`, () => {
      matrixify({
        edgeHash,
        nodes,
        edgeWidthAccessor: (edge) => edge.weight || 1,
        nodeIDAccessor: (node) => node.id
      })
    })
  }
})
