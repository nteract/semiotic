/**
 * Sustained Streaming Load Benchmarks
 *
 * Tests the streaming pipeline under sustained high-throughput push loads.
 * Validates that RingBuffer + PipelineStore + scene rebuild can handle
 * real-world streaming rates without memory leaks or frame budget overruns.
 */

import { describe, bench } from "vitest"
import { RingBuffer } from "../../src/components/realtime/RingBuffer"
import {
  PipelineStore,
  type PipelineConfig,
} from "../../src/components/stream/PipelineStore"

const SCENE_LAYOUT = { width: 600, height: 400 }

function makeDatum(i: number) {
  // Keep the load shape reproducible. Date.now() and a shared RNG made
  // successive samples describe slightly different scenes.
  return {
    x: i,
    y: ((i * 48_271) % 2_147_483_647) / 2_147_483_647 * 100,
    time: i,
  }
}

function makeStreamingStore(
  chartType: "line" | "scatter",
  windowSize: number,
): PipelineStore {
  const config: PipelineConfig = {
    chartType,
    runtimeMode: "streaming",
    windowSize,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.05,
    timeAccessor: "time",
    valueAccessor: "y",
  }
  return new PipelineStore(config)
}

function ingestRange(store: PipelineStore, start: number, end: number): void {
  for (let i = start; i < end; i++) {
    // PipelineStore's public streaming API accepts changesets, not individual
    // `push` calls. One-datum changesets mirror a high-frequency source.
    store.ingest({ inserts: [makeDatum(i)], bounded: false })
  }
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
  bench("ingest 1k points + computeScene (simulates 1s at 1kHz)", () => {
    const localStore = makeStreamingStore("line", 2000)
    ingestRange(localStore, 0, 1000)
    // Scene rebuild (the expensive part)
    localStore.computeScene(SCENE_LAYOUT)
  })

  bench("ingest 5k points + computeScene (simulates 5s burst)", () => {
    const localStore = makeStreamingStore("scatter", 5000)
    ingestRange(localStore, 0, 5000)
    localStore.computeScene(SCENE_LAYOUT)
  })

  bench("incremental ingest (100 points) + scene rebuild (hot path)", () => {
    // Pre-fill the store
    const localStore = makeStreamingStore("line", 2000)
    ingestRange(localStore, 0, 1900)
    localStore.computeScene(SCENE_LAYOUT)

    // Measure incremental ingest + rebuild (the per-frame hot path)
    ingestRange(localStore, 1900, 2000)
    localStore.computeScene(SCENE_LAYOUT)
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
