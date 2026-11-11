/**
 * Scene-work benchmark for the XY pipeline. Node only: no canvas, no React.
 *
 * It times the work a Stream Frame does between a data or layout change and
 * the paint: ingest, scale and scene rebuild, the spatial index, and a hit
 * test. Paint cost is measured separately by the browser harness in
 * `./browser/`.
 *
 * Run:
 *   npm run bench:scene-work
 *   npm run bench:scene-work -- --sizes=10000,50000 --load-sizes=200000 --json
 *
 * Report-only. Nothing here gates CI, and results from different machines are
 * not comparable. See ../README.md for how to read each column.
 */
import { PipelineStore } from "../../src/components/stream/PipelineStore"
import { registerBuiltInXYPlugins } from "../../src/components/stream/xyPlugins/registerBuiltIn"
import { findNearestNode } from "../../src/components/stream/CanvasHitTester"
import { DataSourceAdapter } from "../../src/components/stream/DataSourceAdapter"
import {
  LAYOUT,
  RESIZED_LAYOUT,
  describeMachine,
  hasFlag,
  latticeDatum,
  lineConfig,
  lineDatum,
  medianMs,
  numberListArg,
  printTable,
  round,
  scatterConfig,
  type ScatterDatum
} from "./shared"

registerBuiltInXYPlugins()

const sizes = numberListArg("sizes", [10_000, 50_000, 100_000])
const loadSizes = numberListArg("load-sizes", [10_000, 50_000, 100_000, 200_000])
const lineSizes = numberListArg("line-sizes", [10_000, 100_000, 1_000_000])
const asJson = hasFlag("json")

function assertScene(store: PipelineStore, label: string): void {
  // A store without registered scene builders "runs" in microseconds and
  // measures nothing. Fail loudly instead of reporting an empty scene.
  if (store.scene.length === 0) {
    throw new Error(`${label}: scene is empty; the benchmark measured nothing`)
  }
}

function hitTest(store: PipelineStore): void {
  findNearestNode(store.scene, 300, 200, 30, store.quadtree, store.maxPointRadius)
}

// ── Update paths: one change to a chart that already holds N points ────────

interface UpdateRow {
  points: number
  coldLoadMs: number
  pushOneMs: number
  pushOneWithHitTestMs: number
  hitTestMs: number
  resizeMs: number
  styleChangeMs: number
  sameContentsNewArrayMs: number
  slidingWindowPushMs: number
}

function measureUpdates(points: number): UpdateRow {
  const data = Array.from({ length: points }, (_, i) => latticeDatum(i))

  const coldLoadMs = medianMs(() => {
    const cold = new PipelineStore(scatterConfig())
    cold.ingest({ inserts: data, bounded: true })
    cold.computeScene(LAYOUT)
  }, 7)

  const store = new PipelineStore(scatterConfig())
  store.ingest({ inserts: data, bounded: true })
  store.computeScene(LAYOUT)
  assertScene(store, `scatter ${points}`)

  let next = points
  const pushOne = (target: PipelineStore, appended: boolean) => {
    target.ingest({
      inserts: [latticeDatum(next++)],
      bounded: false,
      ...(appended ? { boundedAppend: true } : {})
    })
    target.computeScene(LAYOUT)
  }

  // No pointer over the chart: nothing reads the spatial index.
  const pushOneMs = medianMs(() => pushOne(store, true))
  // Pointer over the chart: every rebuild is followed by a hit test.
  const pushOneWithHitTestMs = medianMs(() => {
    pushOne(store, true)
    hitTest(store)
  })
  hitTest(store)
  const hitTestMs = medianMs(() => hitTest(store), 51)

  let flip = false
  const resizeMs = medianMs(() => {
    flip = !flip
    store.computeScene(flip ? RESIZED_LAYOUT : LAYOUT)
  })
  store.computeScene(LAYOUT)

  const styleChangeMs = medianMs(() => {
    store.updateConfig(
      scatterConfig({
        pointStyle: () => ({ fill: "#e15759", opacity: 0.8, r: 3 })
      })
    )
    store.computeScene(LAYOUT)
  })

  const sameContentsNewArrayMs = medianMs(() => {
    store.ingest({ inserts: data.slice(), bounded: true })
    store.computeScene(LAYOUT)
  }, 7)

  const windowed = new PipelineStore(
    scatterConfig({ runtimeMode: "streaming", windowSize: points })
  )
  windowed.ingest({ inserts: data, bounded: false })
  windowed.computeScene(LAYOUT)
  assertScene(windowed, `windowed scatter ${points}`)
  const slidingWindowPushMs = medianMs(() => pushOne(windowed, false))

  return {
    points,
    coldLoadMs: round(coldLoadMs),
    pushOneMs: round(pushOneMs),
    pushOneWithHitTestMs: round(pushOneWithHitTestMs),
    hitTestMs: round(hitTestMs, 3),
    resizeMs: round(resizeMs),
    styleChangeMs: round(styleChangeMs),
    sameContentsNewArrayMs: round(sameContentsNewArrayMs),
    slidingWindowPushMs: round(slidingWindowPushMs)
  }
}

// ── Large-array load through the real DataSourceAdapter ────────────────────

interface LoadRow {
  rows: number
  singlePassMs: number
  adapterTotalMs: number
  adapterDeliveries: number
  adapterLongestFrameMs: number
  ratio: number
}

/**
 * Drive the adapter the way a frame does: each delivery ingests a changeset
 * and the frame then rebuilds the scene once. `requestAnimationFrame` is
 * replaced by a queue so the schedule runs back to back without real frames.
 */
function loadThroughAdapter(data: ScatterDatum[]): {
  totalMs: number
  deliveries: number
  longestFrameMs: number
} {
  const frames: Array<() => void> = []
  const scope = globalThis as unknown as {
    requestAnimationFrame: (callback: (time: number) => void) => number
    cancelAnimationFrame: (handle: number) => void
  }
  const previous = {
    request: scope.requestAnimationFrame,
    cancel: scope.cancelAnimationFrame
  }
  scope.requestAnimationFrame = (callback) => {
    frames.push(() => callback(0))
    return frames.length
  }
  scope.cancelAnimationFrame = () => {}

  try {
    const store = new PipelineStore(scatterConfig())
    let dirty = false
    let deliveries = 0
    let longestFrameMs = 0
    const adapter = new DataSourceAdapter<ScatterDatum>((changeset) => {
      deliveries++
      if (store.ingest(changeset)) dirty = true
    })
    const frame = (work: () => void) => {
      const start = performance.now()
      work()
      if (dirty) {
        store.computeScene(LAYOUT)
        dirty = false
      }
      longestFrameMs = Math.max(longestFrameMs, performance.now() - start)
    }

    const start = performance.now()
    frame(() => adapter.setBoundedData(data))
    while (frames.length > 0) frame(frames.shift()!)
    const totalMs = performance.now() - start

    if (store.size !== data.length) {
      throw new Error(
        `adapter load delivered ${store.size} of ${data.length} rows`
      )
    }
    assertScene(store, `adapter load ${data.length}`)
    return { totalMs, deliveries, longestFrameMs }
  } finally {
    scope.requestAnimationFrame = previous.request
    scope.cancelAnimationFrame = previous.cancel
  }
}

function measureLoad(rows: number): LoadRow {
  const data = Array.from({ length: rows }, (_, i) => latticeDatum(i))
  const singlePassMs = medianMs(() => {
    const store = new PipelineStore(scatterConfig())
    store.ingest({ inserts: data, bounded: true })
    store.computeScene(LAYOUT)
  }, 5)

  const samples: ReturnType<typeof loadThroughAdapter>[] = []
  for (let i = 0; i < 5; i++) samples.push(loadThroughAdapter(data.slice()))
  samples.sort((a, b) => a.totalMs - b.totalMs)
  const median = samples[Math.floor(samples.length / 2)]

  return {
    rows,
    singlePassMs: round(singlePassMs),
    adapterTotalMs: round(median.totalMs),
    adapterDeliveries: median.deliveries,
    adapterLongestFrameMs: round(median.longestFrameMs),
    ratio: round(median.totalMs / singlePassMs, 1)
  }
}

// ── Lines: one path node, so cost is vertices, not marks ───────────────────

interface LineRow {
  vertices: number
  coldLoadMs: number
  pushOneMs: number
  hitTestMs: number
  resizeMs: number
}

function measureLine(vertices: number): LineRow {
  const data = Array.from({ length: vertices }, (_, i) => lineDatum(i))
  const coldLoadMs = medianMs(() => {
    const cold = new PipelineStore(lineConfig())
    cold.ingest({ inserts: data, bounded: true })
    cold.computeScene(LAYOUT)
  }, 5)

  const store = new PipelineStore(lineConfig())
  store.ingest({ inserts: data, bounded: true })
  store.computeScene(LAYOUT)
  assertScene(store, `line ${vertices}`)

  let next = vertices
  const pushOneMs = medianMs(() => {
    store.ingest({
      inserts: [lineDatum(next++)],
      bounded: false,
      boundedAppend: true
    })
    store.computeScene(LAYOUT)
  }, 9)
  const hitTestMs = medianMs(() => hitTest(store), 31)
  let flip = false
  const resizeMs = medianMs(() => {
    flip = !flip
    store.computeScene(flip ? RESIZED_LAYOUT : LAYOUT)
  }, 9)

  return {
    vertices,
    coldLoadMs: round(coldLoadMs),
    pushOneMs: round(pushOneMs),
    hitTestMs: round(hitTestMs, 3),
    resizeMs: round(resizeMs)
  }
}

// ── Retained memory per datum (needs --expose-gc) ──────────────────────────

function measureRetainedBytesPerDatum(): number | null {
  const collect = (globalThis as { gc?: () => void }).gc
  if (!collect) return null
  const points = 50_000
  const data = Array.from({ length: points }, (_, i) => latticeDatum(i))
  const store = new PipelineStore(scatterConfig())
  store.ingest({ inserts: data, bounded: true })
  store.computeScene(LAYOUT)
  collect()
  const before = process.memoryUsage().heapUsed
  const keep: unknown[] = []
  const rounds = 5
  for (let i = 0; i < rounds; i++) {
    store.ingest({ inserts: data.slice(), bounded: true })
    store.computeScene(LAYOUT)
    hitTest(store)
    keep.push(store.scene, store.quadtree)
  }
  const after = process.memoryUsage().heapUsed
  return Math.round((after - before) / rounds / points)
}

// ── Report ─────────────────────────────────────────────────────────────────

const report = {
  machine: describeMachine(),
  updates: sizes.map(measureUpdates),
  load: loadSizes.map(measureLoad),
  line: lineSizes.map(measureLine),
  retainedBytesPerDatum: measureRetainedBytesPerDatum()
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`XY scene work — ${report.machine}`)
  console.log("\nScatter update paths (median ms)")
  printTable([
    [
      "points",
      "cold load",
      "push 1",
      "push 1 + hit test",
      "hit test",
      "resize",
      "style change",
      "same data, new array",
      "sliding-window push"
    ],
    ...report.updates.map((row) => [
      row.points,
      row.coldLoadMs,
      row.pushOneMs,
      row.pushOneWithHitTestMs,
      row.hitTestMs,
      row.resizeMs,
      row.styleChangeMs,
      row.sameContentsNewArrayMs,
      row.slidingWindowPushMs
    ])
  ])
  console.log("\nLarge-array load through DataSourceAdapter (median of 5)")
  printTable([
    [
      "rows",
      "single pass ms",
      "adapter total ms",
      "deliveries",
      "longest frame ms",
      "adapter / single"
    ],
    ...report.load.map((row) => [
      row.rows,
      row.singlePassMs,
      row.adapterTotalMs,
      row.adapterDeliveries,
      row.adapterLongestFrameMs,
      `${row.ratio}x`
    ])
  ])
  console.log("\nLine update paths (median ms)")
  printTable([
    ["vertices", "cold load", "push 1", "hit test", "resize"],
    ...report.line.map((row) => [
      row.vertices,
      row.coldLoadMs,
      row.pushOneMs,
      row.hitTestMs,
      row.resizeMs
    ])
  ])
  console.log(
    report.retainedBytesPerDatum === null
      ? "\nRetained memory: rerun with `node --expose-gc --import tsx benchmarks/harness/xy-scene-work.ts` for a per-datum estimate"
      : `\nRetained memory: about ${report.retainedBytesPerDatum} bytes per datum for a 50k scatter scene (data copy, scene nodes, styles, spatial index)`
  )
}
