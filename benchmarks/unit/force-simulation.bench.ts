/**
 * Force Simulation Benchmarks
 *
 * Tests the most expensive operations in Semiotic:
 * - swarmLayout: O(iterations × n²) with collision detection
 * - NetworkFrame force layout: O(iterations × n²) with many-body force
 *
 * These are critical bottlenecks that dominate rendering time for large datasets.
 */

import { describe, bench } from 'vitest'
import { forceSimulation, forceX, forceY, forceCollide, forceLink, forceManyBody } from 'd3-force'
import { generateSwarmData, generateNetworkData } from '../setup/data-generators'

describe('swarmLayout Performance', () => {
  const testSizes = [
    { name: 'small-50', categoryCount: 5, pointsPerCategory: 10, totalPoints: 50 },
    { name: 'medium-200', categoryCount: 10, pointsPerCategory: 20, totalPoints: 200 },
    { name: 'large-1000', categoryCount: 20, pointsPerCategory: 50, totalPoints: 1000 },
  ]

  for (const { name, categoryCount, pointsPerCategory, totalPoints } of testSizes) {
    const columns = generateSwarmData(categoryCount, pointsPerCategory)

    bench(`swarmLayout-${name}-120iter`, () => {
      const iterations = 120

      columns.forEach((column) => {
        const oData = column.pieceData
        const circleRadius = Math.max(2, Math.min(5, (4 * column.width) / oData.length))

        const simulation = forceSimulation(oData)
          .force('y', forceY((d: any) => d.scaledValue).strength(2))
          .force('x', forceX(column.middle))
          .force('collide', forceCollide(circleRadius))
          .stop()

        for (let i = 0; i < iterations; ++i) {
          simulation.tick()
        }
      })
    })
  }
})

describe('swarmLayout Iteration Scaling', () => {
  // Test how performance scales with iteration count
  const categoryCount = 10
  const pointsPerCategory = 20
  const columns = generateSwarmData(categoryCount, pointsPerCategory)

  const iterationCounts = [30, 60, 120, 240]

  for (const iterations of iterationCounts) {
    bench(`swarmLayout-200pts-${iterations}iter`, () => {
      columns.forEach((column) => {
        const oData = column.pieceData
        const circleRadius = Math.max(2, Math.min(5, (4 * column.width) / oData.length))

        const simulation = forceSimulation(oData)
          .force('y', forceY((d: any) => d.scaledValue).strength(2))
          .force('x', forceX(column.middle))
          .force('collide', forceCollide(circleRadius))
          .stop()

        for (let i = 0; i < iterations; ++i) {
          simulation.tick()
        }
      })
    })
  }
})

describe('NetworkFrame Force Layout', () => {
  const testSizes = [
    { name: 'small-50', nodeCount: 50, edgeDensity: 2.0 },
    { name: 'medium-100', nodeCount: 100, edgeDensity: 2.5 },
    { name: 'medium-200', nodeCount: 200, edgeDensity: 2.0 },
    { name: 'large-500', nodeCount: 500, edgeDensity: 1.5 },
  ]

  for (const { name, nodeCount, edgeDensity } of testSizes) {
    const networkData = generateNetworkData(nodeCount, edgeDensity)

    bench(`force-layout-${name}-500iter`, () => {
      const iterations = 500
      const adjustedSize = [600, 400]

      // Create node objects matching Semiotic's structure
      const projectedNodes = networkData.nodes.map((node, i) => ({
        ...node,
        x: adjustedSize[0] / 2,
        y: adjustedSize[1] / 2,
        index: i,
        vx: 0,
        vy: 0
      }))

      // Create edge objects
      const projectedEdges = networkData.edges.map(edge => ({
        ...edge,
        source: projectedNodes.find(n => n.id === edge.source),
        target: projectedNodes.find(n => n.id === edge.target)
      }))

      const linkForce = forceLink(projectedEdges)
        .strength((d: any) => Math.min(2.5, d.weight ? d.weight * 0.1 : 0.1))

      const simulation = forceSimulation(projectedNodes)
        .force('charge', forceManyBody().distanceMax(Infinity).strength(-25))
        .force('link', linkForce)
        .stop()

      simulation.force('x', forceX(adjustedSize[0] / 2).strength(0.06))
      simulation.force('y', forceY(adjustedSize[1] / 2).strength(0.06 * (adjustedSize[1] / adjustedSize[0])))

      for (let i = 0; i < iterations; ++i) {
        simulation.tick()
      }
    })
  }
})

describe('NetworkFrame Force Layout - Iteration Scaling', () => {
  const nodeCount = 100
  const edgeDensity = 2.0
  const networkData = generateNetworkData(nodeCount, edgeDensity)

  const iterationCounts = [100, 250, 500, 1000]

  for (const iterations of iterationCounts) {
    bench(`force-layout-100nodes-${iterations}iter`, () => {
      const adjustedSize = [600, 400]

      const projectedNodes = networkData.nodes.map((node, i) => ({
        ...node,
        x: adjustedSize[0] / 2,
        y: adjustedSize[1] / 2,
        index: i,
        vx: 0,
        vy: 0
      }))

      const projectedEdges = networkData.edges.map(edge => ({
        ...edge,
        source: projectedNodes.find(n => n.id === edge.source),
        target: projectedNodes.find(n => n.id === edge.target)
      }))

      const linkForce = forceLink(projectedEdges)
        .strength((d: any) => Math.min(2.5, d.weight ? d.weight * 0.1 : 0.1))

      const simulation = forceSimulation(projectedNodes)
        .force('charge', forceManyBody().distanceMax(Infinity).strength(-25))
        .force('link', linkForce)
        .force('x', forceX(adjustedSize[0] / 2).strength(0.06))
        .force('y', forceY(adjustedSize[1] / 2).strength(0.06))
        .stop()

      for (let i = 0; i < iterations; ++i) {
        simulation.tick()
      }
    })
  }
})

describe('NetworkFrame Force Layout - Edge Density Impact', () => {
  const nodeCount = 100
  const densities = [
    { name: 'sparse-1.5x', density: 1.5 },
    { name: 'medium-3x', density: 3.0 },
    { name: 'dense-5x', density: 5.0 },
  ]

  for (const { name, density } of densities) {
    const networkData = generateNetworkData(nodeCount, density)

    bench(`force-layout-100nodes-${name}-250iter`, () => {
      const iterations = 250
      const adjustedSize = [600, 400]

      const projectedNodes = networkData.nodes.map((node, i) => ({
        ...node,
        x: adjustedSize[0] / 2,
        y: adjustedSize[1] / 2,
        index: i,
        vx: 0,
        vy: 0
      }))

      const projectedEdges = networkData.edges.map(edge => ({
        ...edge,
        source: projectedNodes.find(n => n.id === edge.source),
        target: projectedNodes.find(n => n.id === edge.target)
      }))

      const linkForce = forceLink(projectedEdges)
        .strength((d: any) => Math.min(2.5, d.weight ? d.weight * 0.1 : 0.1))

      const simulation = forceSimulation(projectedNodes)
        .force('charge', forceManyBody().distanceMax(Infinity).strength(-25))
        .force('link', linkForce)
        .force('x', forceX(adjustedSize[0] / 2).strength(0.06))
        .force('y', forceY(adjustedSize[1] / 2).strength(0.06))
        .stop()

      for (let i = 0; i < iterations; ++i) {
        simulation.tick()
      }
    })
  }
})
