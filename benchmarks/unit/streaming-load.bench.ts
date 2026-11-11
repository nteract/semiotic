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
import { registerBuiltInXYPlugins } from "../../src/components/stream/xyPlugins/registerBuiltIn"

// Scene builders are registered by chart components at render time, not at
// import. A bare PipelineStore without them accepts data and returns an empty
// scene, which is how these cases once timed ingest alone while claiming to
// time the rebuild.
registerBuiltInXYPlugins()

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

/** Rebuild the scene and fail the benchmark if nothing was built. */
function rebuildScene(store: PipelineStore): void {
  store.computeScene(SCENE_LAYOUT)
  if (store.scene.length === 0) {
    throw new Error(
      "streaming-load benchmark built an empty scene; it would time ingest only"
    )
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
  // These three cases were renamed when they began building a real scene:
  // their earlier names recorded ingest-only timings and are not comparable.
  bench("ingest 1k points + line scene rebuild (1s at 1kHz)", () => {
    const localStore = makeStreamingStore("line", 2000)
    ingestRange(localStore, 0, 1000)
    // Scene rebuild (the expensive part)
    rebuildScene(localStore)
  })

  bench("ingest 5k points + scatter scene rebuild (5s burst)", () => {
    const localStore = makeStreamingStore("scatter", 5000)
    ingestRange(localStore, 0, 5000)
    rebuildScene(localStore)
  })

  bench("ingest 100 more points + line scene rebuild (hot path)", () => {
    // Pre-fill the store
    const localStore = makeStreamingStore("line", 2000)
    ingestRange(localStore, 0, 1900)
    rebuildScene(localStore)

    // Measure incremental ingest + rebuild (the per-frame hot path)
    ingestRange(localStore, 1900, 2000)
    rebuildScene(localStore)
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
