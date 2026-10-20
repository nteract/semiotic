/**
 * Headless admission/retirement soak, not a browser FPS benchmark.
 * node --expose-gc --import tsx scripts/physics-live-soak.ts [seconds=1800]
 */
import assert from "node:assert/strict"
import { cpus, platform, arch } from "node:os"
import { performance } from "node:perf_hooks"
import { PhysicsPipelineStore } from "../src/components/stream/physics/PhysicsPipelineStore"

const seconds = Number(process.argv[2] ?? 1800)
assert(
  Number.isFinite(seconds) && seconds >= 60,
  "Run at least 60 simulated seconds"
)
const store = new PhysicsPipelineStore({
  bodyLimit: 400,
  eviction: "sleeping-first",
  kernel: { seed: 42, gravity: { x: 0, y: 900 } },
  emitters: {
    sources: [{ id: "source", ratePerSec: 10, jitter: "watermarks" }],
    seed: 42,
    timeUnit: "s",
    templates: { source: { x: 0, y: 0, shape: { type: "circle", radius: 4 } } }
  },
  eventDrop: {
    live: { follow: "now", horizon: 5, retain: 20 },
    windowSize: 2.5,
    size: [720, 400],
    ballRadius: 4,
    seed: 42,
    timeUnit: "s",
    watermark: { delay: 1 },
    sources: [{ id: "source", label: "Source" }],
    arrival: { mode: "travel", durationMs: 200 }
  }
})
const times = new Uint32Array(2001) // 0.01 ms bins, bounded memory.
const heapSamples: Array<{ seconds: number; bytes: number }> = []
let maxBodies = 0
let maxColliders = 0
const started = performance.now()
for (let frame = 1; frame <= Math.round(seconds * 60); frame++) {
  const before = performance.now()
  store.tick(1 / 60)
  times[
    Math.min(times.length - 1, Math.floor((performance.now() - before) * 100))
  ]++
  maxBodies = Math.max(maxBodies, store.liveBodyCount())
  if (frame % 3600 !== 0) continue
  const snapshot = store.snapshot()
  maxColliders = Math.max(maxColliders, snapshot.world.colliders.length)
  const admitted = snapshot.eventDrop!.ledger.windows.reduce(
    (n, row) => n + row.accepted + row.late,
    0
  )
  assert.equal(
    admitted + snapshot.eventDrop!.pending.length,
    snapshot.emitters!.progress.emitted
  )
  assert(maxBodies <= 400)
  assert(maxColliders < 40)
  globalThis.gc?.()
  heapSamples.push({
    seconds: frame / 60,
    bytes: process.memoryUsage().heapUsed
  })
}
let cumulative = 0
let p95 = 0
for (let i = 0; i < times.length; i++) {
  cumulative += times[i]
  if (cumulative >= seconds * 60 * 0.95) {
    p95 = (i + 1) / 100
    break
  }
}
const final = store.snapshot()
const first = heapSamples[0].bytes
const last = heapSamples.at(-1)!.bytes
console.log(
  JSON.stringify(
    {
      machine: { cpu: cpus()[0]?.model, platform: platform(), arch: arch() },
      simulatedSeconds: seconds,
      wallSeconds: (performance.now() - started) / 1000,
      emitted: final.emitters!.progress.emitted,
      admitted: final.eventDrop!.ledger.windows.reduce(
        (n, row) => n + row.accepted + row.late,
        0
      ),
      pending: final.eventDrop!.pending.length,
      historicalWindows: final.eventDrop!.ledger.windows.length,
      maxBodies,
      maxColliders,
      p95TickMsUpperBound: p95,
      gcAvailable: Boolean(globalThis.gc),
      heapGrowthAfterFirstMinutePercent: ((last - first) / first) * 100,
      heapSamples
    },
    null,
    2
  )
)
