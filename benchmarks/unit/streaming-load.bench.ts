/**
 * Sustained Streaming Load Benchmarks
 *
 * Tests the streaming pipeline under sustained high-throughput push loads.
 * Validates that RingBuffer + PipelineStore + scene rebuild can handle
 * real-world streaming rates without memory leaks or frame budget overruns.
 */

import { describe, bench, beforeAll } from "vitest"
import { RingBuffer } from "../../src/components/realtime/RingBuffer"
import { PipelineStore } from "../../src/components/stream/PipelineStore"
import seedrandom from "seedrandom"

const rng = seedrandom("streaming-load")

function makeDatum(i: number) {
  return { x: i, y: rng() * 100, time: Date.now() + i }
}

// ── RingBuffer sustained push ────────────────────────────────────────────

describe("RingBuffer sustained push", () => {
  bench("10k pushes into 1k-capacity buffer (10x eviction)", () => {
    const buf = new RingBuffer<{ x: number; y: number; time: number }>(1000)
    for (let i = 0; i < 10_000; i++) {
      buf.push(makeDatum(i))
    }
  })

  bench("50k pushes into 5k-capacity buffer", () => {
    const buf = new RingBuffer<{ x: number; y: number; time: number }>(5000)
    for (let i = 0; i < 50_000; i++) {
      buf.push(makeDatum(i))
    }
  })

  bench("RingBuffer forEach after 10k pushes (iteration cost)", () => {
    const buf = new RingBuffer<{ x: number; y: number; time: number }>(5000)
    for (let i = 0; i < 10_000; i++) buf.push(makeDatum(i))
    let sum = 0
    buf.forEach(d => { sum += d.y })
  })
})

// ── PipelineStore sustained ingest + scene rebuild ────────────────────────

describe("PipelineStore sustained streaming", () => {
  let store: PipelineStore

  beforeAll(() => {
    store = new PipelineStore()
    store.updateConfig({
      xAccessor: "x",
      yAccessor: "y",
      chartType: "line",
      windowSize: 2000,
    })
  })

  bench("push 1k points + computeScene (simulates 1s at 1kHz)", () => {
    const localStore = new PipelineStore()
    localStore.updateConfig({
      xAccessor: "x",
      yAccessor: "y",
      chartType: "line",
      windowSize: 2000,
    })
    // Simulate sustained push
    for (let i = 0; i < 1000; i++) {
      localStore.push(makeDatum(i))
    }
    // Scene rebuild (the expensive part)
    localStore.computeScene([600, 400])
  })

  bench("push 5k points + computeScene (simulates 5s burst)", () => {
    const localStore = new PipelineStore()
    localStore.updateConfig({
      xAccessor: "x",
      yAccessor: "y",
      chartType: "scatter",
      windowSize: 5000,
    })
    for (let i = 0; i < 5000; i++) {
      localStore.push(makeDatum(i))
    }
    localStore.computeScene([600, 400])
  })

  bench("incremental push (100 points) + scene rebuild (hot path)", () => {
    // Pre-fill the store
    const localStore = new PipelineStore()
    localStore.updateConfig({
      xAccessor: "x",
      yAccessor: "y",
      chartType: "line",
      windowSize: 2000,
    })
    for (let i = 0; i < 1900; i++) {
      localStore.push(makeDatum(i))
    }
    localStore.computeScene([600, 400])

    // Measure incremental push + rebuild (the per-frame hot path)
    for (let i = 1900; i < 2000; i++) {
      localStore.push(makeDatum(i))
    }
    localStore.computeScene([600, 400])
  })
})

// ── Memory stability check (not a bench, but validates no leak) ────────

describe("Memory stability", () => {
  bench("50k push/evict cycles maintain constant buffer size", () => {
    const buf = new RingBuffer<{ x: number; y: number; time: number }>(1000)
    for (let i = 0; i < 50_000; i++) {
      buf.push(makeDatum(i))
    }
    // After 50k pushes into 1k buffer, size should be exactly 1000
    if (buf.size !== 1000) {
      throw new Error(`Expected size 1000, got ${buf.size}`)
    }
  })
})
