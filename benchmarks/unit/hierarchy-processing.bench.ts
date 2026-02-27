/**
 * Hierarchy Processing Benchmarks
 *
 * Tests the core hierarchy operations used by HierarchicalDiagram and ForceLayout:
 * - nodesEdgesFromHierarchy: O(n) flattening of tree into node/edge lists
 * - d3-hierarchy layouts: tree, treemap, partition, circlepack
 *
 * These run on every render of hierarchy-based NetworkFrame components.
 */

import { describe, bench } from 'vitest'
import { hierarchy, tree, treemap, partition, pack } from 'd3-hierarchy'
import { generateHierarchyData } from '../setup/data-generators'

/**
 * Simplified nodesEdgesFromHierarchy (mirrors src/components/processing/network.ts)
 * Flattens hierarchical data into flat node/edge arrays for rendering.
 */
function nodesEdgesFromHierarchy(
  baseRootNode: any,
  idAccessor: (d: any) => string = (d) => d.name || d.id
) {
  const edges: any[] = []
  const nodes: any[] = []

  const rootNode = baseRootNode.descendants
    ? baseRootNode
    : hierarchy(baseRootNode)

  const descendants = rootNode.descendants()

  let i = 0
  for (const node of descendants) {
    node.descendantIndex = i
    i++
  }

  for (const node of descendants) {
    const nodeData = { ...node, ...node.data }
    const generatedID = idAccessor(nodeData)

    nodes.push({
      ...nodeData,
      hierarchicalID: generatedID,
      depth: node.depth
    })

    if (node.parent) {
      edges.push({
        source: node.parent,
        target: node,
        weight: 1
      })
    }
  }

  return { nodes, edges }
}

describe('nodesEdgesFromHierarchy - Size Scaling', () => {
  const testCases = [
    { name: 'small', depth: 3, branching: 3 },    // ~40 nodes
    { name: 'medium', depth: 4, branching: 4 },    // ~340 nodes
    { name: 'large', depth: 5, branching: 4 },     // ~1300 nodes
    { name: 'xlarge', depth: 5, branching: 5 },    // ~3900 nodes
  ]

  for (const { name, depth, branching } of testCases) {
    const data = generateHierarchyData(depth, branching)

    bench(`nodesEdgesFromHierarchy-${name}-d${depth}-b${branching}`, () => {
      const { nodes, edges } = nodesEdgesFromHierarchy(data)

      if (nodes.length === 0) {
        throw new Error('Expected non-empty nodes array')
      }
    })
  }
})

describe('nodesEdgesFromHierarchy - Pre-built vs Raw Hierarchy', () => {
  // Test whether passing a pre-built d3 hierarchy is faster than raw JSON
  const rawData = generateHierarchyData(4, 4)
  const preBuiltHierarchy = hierarchy(rawData)

  bench('nodesEdgesFromHierarchy-raw-json', () => {
    nodesEdgesFromHierarchy(rawData)
  })

  bench('nodesEdgesFromHierarchy-pre-built', () => {
    nodesEdgesFromHierarchy(preBuiltHierarchy)
  })
})

describe('d3-hierarchy Layout Performance', () => {
  // These layouts are computed inside NetworkFrame for hierarchical types
  const data = generateHierarchyData(4, 4)
  const size: [number, number] = [700, 700]

  const root = hierarchy(data)
    .sum((d: any) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))

  bench('tree-layout', () => {
    const layout = tree<any>().size(size)
    layout(hierarchy(data).sum((d: any) => d.value || 0))
  })

  bench('treemap-layout', () => {
    const layout = treemap<any>().size(size).padding(2)
    layout(hierarchy(data)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0)))
  })

  bench('partition-layout', () => {
    const layout = partition<any>().size(size)
    layout(hierarchy(data)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0)))
  })

  bench('circlepack-layout', () => {
    const layout = pack<any>().size(size)
    layout(hierarchy(data)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0)))
  })
})

describe('d3-hierarchy Layout - Size Scaling', () => {
  const size: [number, number] = [700, 700]

  const testCases = [
    { name: 'small', depth: 3, branching: 3 },
    { name: 'medium', depth: 4, branching: 4 },
    { name: 'large', depth: 5, branching: 4 },
  ]

  for (const { name, depth, branching } of testCases) {
    const data = generateHierarchyData(depth, branching)

    bench(`treemap-${name}-d${depth}-b${branching}`, () => {
      const layout = treemap<any>().size(size).padding(2)
      layout(hierarchy(data)
        .sum((d: any) => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0)))
    })

    bench(`partition-${name}-d${depth}-b${branching}`, () => {
      const layout = partition<any>().size(size)
      layout(hierarchy(data)
        .sum((d: any) => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0)))
    })
  }
})

describe('Full Hierarchy Pipeline (parse + layout + flatten)', () => {
  // End-to-end: raw JSON → d3 hierarchy → layout → nodes/edges
  // This is the full code path for HierarchicalDiagram renders

  const testCases = [
    { name: 'small', depth: 3, branching: 3 },
    { name: 'medium', depth: 4, branching: 4 },
    { name: 'large', depth: 5, branching: 4 },
  ]

  const size: [number, number] = [700, 700]

  for (const { name, depth, branching } of testCases) {
    const data = generateHierarchyData(depth, branching)

    bench(`full-pipeline-tree-${name}`, () => {
      // Step 1: Build hierarchy + layout
      const root = hierarchy(data)
        .sum((d: any) => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
      tree<any>().size(size)(root)

      // Step 2: Flatten to nodes/edges
      const { nodes, edges } = nodesEdgesFromHierarchy(root)

      if (nodes.length === 0) {
        throw new Error('Expected non-empty result')
      }
    })

    bench(`full-pipeline-treemap-${name}`, () => {
      const root = hierarchy(data)
        .sum((d: any) => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
      treemap<any>().size(size).padding(2)(root)

      const { nodes, edges } = nodesEdgesFromHierarchy(root)

      if (nodes.length === 0) {
        throw new Error('Expected non-empty result')
      }
    })
  }
})
