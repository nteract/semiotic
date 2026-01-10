/**
 * Data Accessor Benchmarks
 *
 * Tests the O(n × m × p) nested data accessor loops
 * This is the triple-nested loop pattern: data points × xAccessors × yAccessors
 *
 * Common in XYFrame when multiple accessors are used (e.g., plotting x1,x2 vs y1,y2)
 * Can quickly become expensive with multiple accessor combinations
 */

import { describe, bench } from 'vitest'
import { generateXYData } from '../setup/data-generators'

/**
 * Simplified accessor application (mimics pattern from dataFunctions.ts)
 */
function applyNestedAccessors(
  data: any[],
  xAccessors: Array<(d: any, i: number) => number>,
  yAccessors: Array<(d: any, i: number) => number>
) {
  const projectedData: any[] = []

  xAccessors.forEach((xAccessor, xIndex) => {
    yAccessors.forEach((yAccessor, yIndex) => {
      let i = 0
      for (const d of data) {
        const x = xAccessor(d, i)
        const y = yAccessor(d, i)

        projectedData.push({
          x,
          y,
          data: d,
          xIndex,
          yIndex
        })
        i++
      }
    })
  })

  return projectedData
}

describe('Data Accessor Performance (O(n×m×p))', () => {
  const testCases = [
    {
      name: '100pts-1x-1y',
      pointCount: 100,
      xAccessorCount: 1,
      yAccessorCount: 1,
      expectedOps: 100
    },
    {
      name: '1000pts-1x-1y',
      pointCount: 1000,
      xAccessorCount: 1,
      yAccessorCount: 1,
      expectedOps: 1000
    },
    {
      name: '1000pts-2x-2y',
      pointCount: 1000,
      xAccessorCount: 2,
      yAccessorCount: 2,
      expectedOps: 4000
    },
    {
      name: '1000pts-3x-3y',
      pointCount: 1000,
      xAccessorCount: 3,
      yAccessorCount: 3,
      expectedOps: 9000
    },
    {
      name: '5000pts-2x-2y',
      pointCount: 5000,
      xAccessorCount: 2,
      yAccessorCount: 2,
      expectedOps: 20000
    },
  ]

  for (const { name, pointCount, xAccessorCount, yAccessorCount, expectedOps } of testCases) {
    const data = generateXYData(pointCount, 1)

    // Create accessor functions
    const xAccessors = Array.from({ length: xAccessorCount }, (_, i) => (
      (d: any) => d.x + i * 0.1
    ))

    const yAccessors = Array.from({ length: yAccessorCount }, (_, i) => (
      (d: any) => d.y + i * 0.1
    ))

    bench(`accessor-${name}-${expectedOps}ops`, () => {
      const result = applyNestedAccessors(data, xAccessors, yAccessors)

      // Verify output size
      if (result.length !== expectedOps) {
        throw new Error(`Expected ${expectedOps} results, got ${result.length}`)
      }
    })
  }
})

describe('Data Accessor - Scaling by Data Size', () => {
  // Fixed accessors (2x2), vary data size
  const xAccessors = [(d: any) => d.x, (d: any) => d.x * 2]
  const yAccessors = [(d: any) => d.y, (d: any) => d.y * 2]

  const dataSizes = [100, 500, 1000, 5000]

  for (const size of dataSizes) {
    const data = generateXYData(size, 1)

    bench(`accessor-2x2-${size}pts`, () => {
      applyNestedAccessors(data, xAccessors, yAccessors)
    })
  }
})

describe('Data Accessor - Scaling by Accessor Count', () => {
  // Fixed data size (1000), vary accessor counts
  const data = generateXYData(1000, 1)

  const accessorCounts = [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
    { x: 4, y: 4 },
  ]

  for (const { x, y } of accessorCounts) {
    const xAccessors = Array.from({ length: x }, (_, i) => (
      (d: any) => d.x + i * 0.1
    ))

    const yAccessors = Array.from({ length: y }, (_, i) => (
      (d: any) => d.y + i * 0.1
    ))

    bench(`accessor-1000pts-${x}x${y}y`, () => {
      applyNestedAccessors(data, xAccessors, yAccessors)
    })
  }
})

describe('Data Accessor - Complex Accessor Functions', () => {
  // Test performance impact of complex accessor logic
  const data = generateXYData(1000, 1)

  const simpleAccessors = {
    x: [(d: any) => d.x],
    y: [(d: any) => d.y]
  }

  const complexAccessors = {
    x: [(d: any) => Math.sqrt(d.x * d.x + d.y * d.y)],
    y: [(d: any) => Math.atan2(d.y, d.x)]
  }

  const veryComplexAccessors = {
    x: [(d: any) => Math.sin(d.x) * Math.cos(d.y) + Math.log(Math.abs(d.x) + 1)],
    y: [(d: any) => Math.exp(d.y / 100) * Math.sqrt(Math.abs(d.x))]
  }

  bench('accessor-1000pts-simple', () => {
    applyNestedAccessors(data, simpleAccessors.x, simpleAccessors.y)
  })

  bench('accessor-1000pts-complex', () => {
    applyNestedAccessors(data, complexAccessors.x, complexAccessors.y)
  })

  bench('accessor-1000pts-very-complex', () => {
    applyNestedAccessors(data, veryComplexAccessors.x, veryComplexAccessors.y)
  })
})
