/**
 * Render Pipeline Benchmarks
 *
 * Measures the core hot paths in Semiotic's streaming render pipeline:
 * 1. Scene builder throughput — scatter, line, area, stacked area at various data sizes
 * 2. RingBuffer push/iteration — the data structure underlying all streaming charts
 * 3. End-to-end ingest → scene build (PipelineStore-level)
 *
 * These benchmarks exercise the real production code paths, not simplified proxies.
 */

import { describe, bench, beforeAll } from 'vitest'
import { generateScatterData, generateXYData } from '../setup/data-generators'
import { buildPointScene } from '../../src/components/stream/xySceneBuilders/pointScene'
import { buildLineScene } from '../../src/components/stream/xySceneBuilders/lineScene'
import { buildAreaScene, buildStackedAreaScene } from '../../src/components/stream/xySceneBuilders/areaScene'
import { buildHeatmapScene } from '../../src/components/stream/xySceneBuilders/heatmapScene'
import type { XYSceneContext } from '../../src/components/stream/xySceneBuilders/types'
import { RingBuffer } from '../../src/components/realtime/RingBuffer'
import seedrandom from 'seedrandom'

// ── Shared test context factory ────────────────────────────────────────────

function makeCtx(overrides: Partial<XYSceneContext> = {}): XYSceneContext {
  const identity = (v: number) => v
  const identityScale = Object.assign(identity, {
    domain: () => [0, 100],
    range: () => [0, 800],
  })
  return {
    scales: { x: identityScale, y: identityScale } as any,
    config: {},
    getX: (d) => d.x,
    getY: (d) => d.y,
    resolveLineStyle: () => ({ stroke: '#4e79a7' }),
    resolveAreaStyle: () => ({ fill: '#4e79a7', fillOpacity: 0.5 }),
    resolveBoundsStyle: () => ({ fill: '#ccc' }),
    resolveColorMap: () => new Map(),
    resolveGroupColor: () => null,
    groupData: (data) => {
      const map = new Map<string, any[]>()
      for (const d of data) {
        const key = d.group ?? d.series ?? 'default'
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(d)
      }
      return Array.from(map, ([key, data]) => ({ key, data }))
    },
    ...overrides,
  }
}

// ── Data generation (run once, reuse across benchmarks) ────────────────────

const scatter1k = generateScatterData(1_000)
const scatter10k = generateScatterData(10_000)
const scatter50k = generateScatterData(50_000)

const line1k = generateXYData(1_000, 1)
const line10k = generateXYData(10_000, 1)
const line5x2k = generateXYData(2_000, 5)   // 10k points across 5 series
const line20x500 = generateXYData(500, 20)   // 10k points across 20 series

// Stacked area data: multiple groups at shared x positions
function generateStackedData(xCount: number, groupCount: number) {
  const rng = seedrandom('stacked-bench')
  const data: any[] = []
  const groups = Array.from({ length: groupCount }, (_, i) => `G${i}`)
  for (let x = 0; x < xCount; x++) {
    for (const group of groups) {
      data.push({ x, y: 5 + rng() * 20, group })
    }
  }
  return data
}

const stacked500x5 = generateStackedData(500, 5)
const stacked1kx10 = generateStackedData(1_000, 10)
const stacked2kx5 = generateStackedData(2_000, 5)

const defaultLayout = { width: 800, height: 600, x: 0, y: 0 }

// ── 1. Scene Builder Throughput ────────────────────────────────────────────

describe('Scene Builders — Scatter/Point', () => {
  const ctx = makeCtx()

  bench('scatter-1k', () => {
    buildPointScene(ctx, scatter1k)
  })

  bench('scatter-10k', () => {
    buildPointScene(ctx, scatter10k)
  })

  bench('scatter-50k', () => {
    buildPointScene(ctx, scatter50k)
  })
})

describe('Scene Builders — Line', () => {
  const ctx = makeCtx()

  bench('line-1k-single-series', () => {
    buildLineScene(ctx, line1k)
  })

  bench('line-10k-single-series', () => {
    buildLineScene(ctx, line10k)
  })

  bench('line-10k-across-5-series', () => {
    buildLineScene(ctx, line5x2k)
  })

  bench('line-10k-across-20-series', () => {
    buildLineScene(ctx, line20x500)
  })
})

describe('Scene Builders — Area', () => {
  const ctx = makeCtx()

  bench('area-1k-single', () => {
    buildAreaScene(ctx, line1k)
  })

  bench('area-10k-single', () => {
    buildAreaScene(ctx, line10k)
  })

  bench('area-10k-across-5-series', () => {
    buildAreaScene(ctx, line5x2k)
  })
})

describe('Scene Builders — Stacked Area', () => {
  const ctx = makeCtx()

  bench('stacked-area-500x5 (2.5k points)', () => {
    buildStackedAreaScene(ctx, stacked500x5)
  })

  bench('stacked-area-1kx10 (10k points)', () => {
    buildStackedAreaScene(ctx, stacked1kx10)
  })

  bench('stacked-area-2kx5 (10k points)', () => {
    buildStackedAreaScene(ctx, stacked2kx5)
  })

  bench('stacked-area-2kx5-with-points', () => {
    const ctxWithPoints = makeCtx({
      config: { pointStyle: () => ({ fill: '#000', r: 3 }) },
    })
    buildStackedAreaScene(ctxWithPoints, stacked2kx5)
  })

  bench('stacked-area-1kx10-normalized', () => {
    const ctxNorm = makeCtx({ config: { normalize: true } })
    buildStackedAreaScene(ctxNorm, stacked1kx10)
  })
})

describe('Scene Builders — Heatmap (static)', () => {
  const ctx = makeCtx({
    config: {
      xAccessor: 'x',
      yAccessor: 'y',
      valueAccessor: 'value',
    },
  })

  bench('heatmap-static-1k', () => {
    buildHeatmapScene(ctx, scatter1k, defaultLayout)
  })

  bench('heatmap-static-10k', () => {
    buildHeatmapScene(ctx, scatter10k, defaultLayout)
  })

  bench('heatmap-static-50k', () => {
    buildHeatmapScene(ctx, scatter50k, defaultLayout)
  })
})

describe('Scene Builders — Heatmap (streaming aggregation)', () => {
  const ctx20 = makeCtx({
    config: { heatmapAggregation: 'count', heatmapXBins: 20, heatmapYBins: 20, valueAccessor: 'value' },
  })
  const ctx50 = makeCtx({
    config: { heatmapAggregation: 'count', heatmapXBins: 50, heatmapYBins: 50, valueAccessor: 'value' },
  })
  const ctx100 = makeCtx({
    config: { heatmapAggregation: 'mean', heatmapXBins: 100, heatmapYBins: 100, valueAccessor: 'value' },
  })

  bench('heatmap-stream-10k-20x20', () => {
    buildHeatmapScene(ctx20, scatter10k, defaultLayout)
  })

  bench('heatmap-stream-50k-20x20', () => {
    buildHeatmapScene(ctx20, scatter50k, defaultLayout)
  })

  bench('heatmap-stream-50k-50x50', () => {
    buildHeatmapScene(ctx50, scatter50k, defaultLayout)
  })

  bench('heatmap-stream-50k-100x100-mean', () => {
    buildHeatmapScene(ctx100, scatter50k, defaultLayout)
  })
})

// ── 2. RingBuffer Operations ───────────────────────────────────────────────

describe('RingBuffer — Push Throughput', () => {
  bench('push-1k-into-10k-buffer', () => {
    const buf = new RingBuffer<any>(10_000)
    for (let i = 0; i < 1_000; i++) {
      buf.push({ x: i, y: i * 2 })
    }
  })

  bench('push-10k-into-10k-buffer (eviction)', () => {
    const buf = new RingBuffer<any>(10_000)
    // Fill first
    for (let i = 0; i < 10_000; i++) {
      buf.push({ x: i, y: i * 2 })
    }
    // Now push with eviction
    for (let i = 0; i < 10_000; i++) {
      buf.push({ x: i + 10_000, y: i * 3 })
    }
  })

  bench('pushMany-10k-batch', () => {
    const buf = new RingBuffer<any>(20_000)
    const batch = Array.from({ length: 10_000 }, (_, i) => ({ x: i, y: i * 2 }))
    buf.pushMany(batch)
  })
})

describe('RingBuffer — Iteration', () => {
  let buf10k: RingBuffer<any>
  let buf50k: RingBuffer<any>

  beforeAll(() => {
    buf10k = new RingBuffer<any>(10_000)
    for (let i = 0; i < 10_000; i++) buf10k.push({ x: i, y: i * 2 })

    buf50k = new RingBuffer<any>(50_000)
    for (let i = 0; i < 50_000; i++) buf50k.push({ x: i, y: i * 2 })
  })

  bench('toArray-10k', () => {
    buf10k.toArray()
  })

  bench('toArray-50k', () => {
    buf50k.toArray()
  })

  bench('forEach-10k', () => {
    let sum = 0
    buf10k.forEach((d) => { sum += d.y })
    if (sum === 0) throw new Error('sanity')
  })

  bench('forEach-50k', () => {
    let sum = 0
    buf50k.forEach((d) => { sum += d.y })
    if (sum === 0) throw new Error('sanity')
  })

  bench('iterator-10k', () => {
    let sum = 0
    for (const d of buf10k) { sum += d.y }
    if (sum === 0) throw new Error('sanity')
  })

  bench('iterator-50k', () => {
    let sum = 0
    for (const d of buf50k) { sum += d.y }
    if (sum === 0) throw new Error('sanity')
  })
})

describe('RingBuffer — Resize', () => {
  bench('resize-10k-to-20k', () => {
    const buf = new RingBuffer<any>(10_000)
    for (let i = 0; i < 10_000; i++) buf.push({ x: i, y: i })
    buf.resize(20_000)
  })

  bench('resize-50k-to-100k', () => {
    const buf = new RingBuffer<any>(50_000)
    for (let i = 0; i < 50_000; i++) buf.push({ x: i, y: i })
    buf.resize(100_000)
  })
})

// ── 3. Combined: RingBuffer + Scene Build (simulates ingest → render) ──────

describe('End-to-End: Ingest + Scene Build', () => {
  bench('push-1k-then-build-scatter-scene', () => {
    const buf = new RingBuffer<any>(10_000)
    for (let i = 0; i < 1_000; i++) {
      buf.push(scatter1k[i % scatter1k.length])
    }
    const data = buf.toArray()
    const ctx = makeCtx()
    buildPointScene(ctx, data)
  })

  bench('push-10k-then-build-scatter-scene', () => {
    const buf = new RingBuffer<any>(10_000)
    for (let i = 0; i < 10_000; i++) {
      buf.push(scatter10k[i % scatter10k.length])
    }
    const data = buf.toArray()
    const ctx = makeCtx()
    buildPointScene(ctx, data)
  })

  bench('push-2k-then-build-stacked-area-5-groups', () => {
    const buf = new RingBuffer<any>(20_000)
    buf.pushMany(stacked2kx5)
    const data = buf.toArray()
    const ctx = makeCtx()
    buildStackedAreaScene(ctx, data)
  })

  bench('push-10k-then-build-line-5-series', () => {
    const buf = new RingBuffer<any>(20_000)
    buf.pushMany(line5x2k)
    const data = buf.toArray()
    const ctx = makeCtx()
    buildLineScene(ctx, data)
  })

  // Simulates steady-state streaming: buffer is full, push new data, rebuild scene
  bench('steady-state-scatter-10k (push 100 + evict + rebuild)', () => {
    const buf = new RingBuffer<any>(10_000)
    for (let i = 0; i < 10_000; i++) {
      buf.push(scatter10k[i])
    }
    // Steady-state: push 100 new points (evicts 100 old ones)
    for (let i = 0; i < 100; i++) {
      buf.push({ x: Math.random() * 100, y: Math.random() * 100, category: 'A', size: 5 })
    }
    const data = buf.toArray()
    const ctx = makeCtx()
    buildPointScene(ctx, data)
  })

  bench('steady-state-line-5-series (push 50 + rebuild)', () => {
    const buf = new RingBuffer<any>(10_000)
    buf.pushMany(line5x2k)
    // Steady-state: push 50 new points
    for (let i = 0; i < 50; i++) {
      buf.push({ x: 2000 + i, y: Math.random() * 100, series: `Series ${String.fromCharCode(65 + (i % 5))}` })
    }
    const data = buf.toArray()
    const ctx = makeCtx()
    buildLineScene(ctx, data)
  })
})
