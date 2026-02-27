/**
 * Large Dataset Processing Benchmarks
 *
 * Tests performance for large scatter/point datasets like the CanvasInteraction
 * diamonds example (~54k points) and the data projection pipeline used by XYFrame.
 *
 * Key operations:
 * - CSV text parsing into typed objects
 * - Point data projection (accessor application at scale)
 * - Extent calculation over large arrays
 */

import { describe, bench } from 'vitest'
import { generateScatterData } from '../setup/data-generators'
import seedrandom from 'seedrandom'

/**
 * Generate CSV-like text data (mimics diamonds.csv structure)
 */
function generateCsvText(rowCount: number, seed: string = 'semiotic-csv-bench'): string {
  const rng = seedrandom(seed)
  const cuts = ['Ideal', 'Premium', 'Good', 'Very Good', 'Fair']
  const clarities = ['SI1', 'VS2', 'SI2', 'VS1', 'VVS2', 'VVS1', 'IF', 'I1']

  const header = 'carat,cut,color,clarity,depth,table,price,x,y,z'
  const rows = [header]

  for (let i = 0; i < rowCount; i++) {
    const carat = (0.2 + rng() * 4.8).toFixed(2)
    const cut = cuts[Math.floor(rng() * cuts.length)]
    const color = String.fromCharCode(68 + Math.floor(rng() * 7)) // D-J
    const clarity = clarities[Math.floor(rng() * clarities.length)]
    const depth = (55 + rng() * 15).toFixed(1)
    const table = (50 + rng() * 15).toFixed(0)
    const price = Math.floor(300 + rng() * 18000)
    const x = (3 + rng() * 7).toFixed(2)
    const y = (3 + rng() * 7).toFixed(2)
    const z = (2 + rng() * 4).toFixed(2)

    rows.push(`${carat},${cut},${color},${clarity},${depth},${table},${price},${x},${y},${z}`)
  }

  return rows.join('\n')
}

/**
 * Simple CSV parser (mirrors what d3-dsv csvParse does)
 */
function parseCsv(text: string): any[] {
  const lines = text.split('\n')
  const headers = lines[0].split(',')
  const results: any[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue
    const values = lines[i].split(',')
    const row: any = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]
    }
    results.push(row)
  }

  return results
}

describe('CSV Parsing Performance', () => {
  const testSizes = [
    { name: '1k-rows', count: 1000 },
    { name: '10k-rows', count: 10000 },
    { name: '50k-rows', count: 50000 },
  ]

  for (const { name, count } of testSizes) {
    const csvText = generateCsvText(count)

    bench(`csv-parse-${name}`, () => {
      const rows = parseCsv(csvText)

      if (rows.length !== count) {
        throw new Error(`Expected ${count} rows, got ${rows.length}`)
      }
    })
  }
})

describe('Point Data Transformation (CSV → typed points)', () => {
  // This mirrors CanvasInteraction's data pipeline:
  // parse CSV → map to {x, y, color, size, ...} objects with type coercion

  const cutHash: Record<string, string> = {
    Ideal: '#00a2ce',
    Premium: '#b6a756',
    Good: '#4d430c',
    'Very Good': '#b3331d',
    Fair: '#00a2ce'
  }

  const testSizes = [
    { name: '1k-points', count: 1000 },
    { name: '10k-points', count: 10000 },
    { name: '50k-points', count: 50000 },
  ]

  for (const { name, count } of testSizes) {
    const csvText = generateCsvText(count)
    const parsedRows = parseCsv(csvText)

    bench(`transform-${name}`, () => {
      const points: any[] = []
      parsedRows.forEach((d: any) => {
        points.push({
          y: +d.price,
          x: +d.carat,
          size: +d.table,
          color: cutHash[d.cut],
          clarity: d.clarity
        })
      })

      if (points.length !== count) {
        throw new Error(`Expected ${count} points, got ${points.length}`)
      }
    })
  }
})

describe('Point Data Projection (XYFrame accessor loop)', () => {
  // XYFrame applies accessors to every point to produce projected coordinates
  // This is the hot path for large scatter plots

  const testSizes = [
    { name: '1k', count: 1000 },
    { name: '10k', count: 10000 },
    { name: '50k', count: 50000 },
  ]

  for (const { name, count } of testSizes) {
    const data = generateScatterData(count)
    const xAccessor = (d: any) => d.x
    const yAccessor = (d: any) => d.y

    bench(`project-points-${name}`, () => {
      const projected: any[] = []

      for (let i = 0; i < data.length; i++) {
        const d = data[i]
        projected.push({
          x: xAccessor(d),
          y: yAccessor(d),
          data: d,
          index: i
        })
      }

      if (projected.length !== count) {
        throw new Error(`Expected ${count} projected, got ${projected.length}`)
      }
    })
  }
})

describe('Extent Calculation at Scale', () => {
  // Computing min/max extents over large datasets for axis scaling

  const testSizes = [
    { name: '1k', count: 1000 },
    { name: '10k', count: 10000 },
    { name: '50k', count: 50000 },
  ]

  for (const { name, count } of testSizes) {
    const data = generateScatterData(count)

    bench(`extent-xy-${name}`, () => {
      let xMin = Infinity
      let xMax = -Infinity
      let yMin = Infinity
      let yMax = -Infinity

      for (let i = 0; i < data.length; i++) {
        const d = data[i]
        if (d.x < xMin) xMin = d.x
        if (d.x > xMax) xMax = d.x
        if (d.y < yMin) yMin = d.y
        if (d.y > yMax) yMax = d.y
      }

      if (xMin > xMax) {
        throw new Error('Invalid extent')
      }
    })
  }
})

describe('Full Scatter Pipeline (parse + transform + project + extent)', () => {
  // End-to-end pipeline mimicking CanvasInteraction data loading

  const cutHash: Record<string, string> = {
    Ideal: '#00a2ce',
    Premium: '#b6a756',
    Good: '#4d430c',
    'Very Good': '#b3331d',
    Fair: '#00a2ce'
  }

  const testSizes = [
    { name: '1k', count: 1000 },
    { name: '10k', count: 10000 },
    { name: '50k', count: 50000 },
  ]

  for (const { name, count } of testSizes) {
    const csvText = generateCsvText(count)

    bench(`full-scatter-pipeline-${name}`, () => {
      // Step 1: Parse CSV
      const rows = parseCsv(csvText)

      // Step 2: Transform to typed points
      const points: any[] = []
      for (const d of rows) {
        points.push({
          x: +d.carat,
          y: +d.price,
          size: +d.table,
          color: cutHash[d.cut],
          clarity: d.clarity
        })
      }

      // Step 3: Calculate extents
      let xMin = Infinity
      let xMax = -Infinity
      let yMin = Infinity
      let yMax = -Infinity

      for (const p of points) {
        if (p.x < xMin) xMin = p.x
        if (p.x > xMax) xMax = p.x
        if (p.y < yMin) yMin = p.y
        if (p.y > yMax) yMax = p.y
      }

      // Step 4: Project points (accessor application)
      const projected: any[] = []
      for (let i = 0; i < points.length; i++) {
        projected.push({
          x: points[i].x,
          y: points[i].y,
          data: points[i],
          index: i
        })
      }

      if (projected.length !== count) {
        throw new Error(`Expected ${count}, got ${projected.length}`)
      }
    })
  }
})
