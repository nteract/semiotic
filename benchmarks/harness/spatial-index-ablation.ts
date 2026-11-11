/**
 * Spatial-index ablation: how much of a push-one rebuild is the point index?
 *
 * The XY store builds its quadtree on the first hit test after the scene
 * changes. This script runs the same sliding-window push twice:
 *
 *   - "push only": ingest one datum and rebuild the scene. Nothing reads the
 *     index, so none is built. This is a streaming chart with no pointer on it.
 *   - "push + hit test": the same, followed by one hit test, which builds the
 *     index. This is a streaming chart with the pointer over it.
 *
 * "index build" is the difference between the two minus the cost of a hit
 * test against a warm index. If "push only" ever climbs to meet
 * "push + hit test", something is building the index eagerly again.
 *
 * Run:
 *   npm run bench:spatial-index
 *   npm run bench:spatial-index -- --sizes=10000,50000,100000 --json
 *
 * Report-only. See ../README.md.
 */
import { PipelineStore } from "../../src/components/stream/PipelineStore"
import { registerBuiltInXYPlugins } from "../../src/components/stream/xyPlugins/registerBuiltIn"
import { findNearestNode } from "../../src/components/stream/CanvasHitTester"
import {
  LAYOUT,
  createUniformDatum,
  describeMachine,
  hasFlag,
  latticeDatum,
  numberListArg,
  printTable,
  round,
  scatterConfig,
  type ScatterDatum
} from "./shared"

registerBuiltInXYPlugins()

const sizes = numberListArg("sizes", [10_000, 50_000, 100_000])
const asJson = hasFlag("json")
const WARMUP = 20
const REPS = 60

interface AblationRow {
  distribution: string
  points: number
  pushOnlyMs: number
  pushAndHitTestMs: number
  warmHitTestMs: number
  indexBuildMs: number
  indexShareOfHoveredPush: string
}

function meanMs(fn: () => void): number {
  for (let i = 0; i < WARMUP; i++) fn()
  const start = performance.now()
  for (let i = 0; i < REPS; i++) fn()
  return (performance.now() - start) / REPS
}

function measure(
  distribution: string,
  makeDatum: (i: number) => ScatterDatum,
  points: number
): AblationRow {
  const data = Array.from({ length: points }, (_, i) => makeDatum(i))
  const store = new PipelineStore(
    scatterConfig({ runtimeMode: "streaming", windowSize: points })
  )
  store.ingest({ inserts: data, bounded: false })
  store.computeScene(LAYOUT)
  if (store.scene.length === 0) {
    throw new Error(`${distribution} ${points}: scene is empty`)
  }

  let next = points
  const push = () => {
    store.ingest({ inserts: [makeDatum(next++)], bounded: false })
    store.computeScene(LAYOUT)
  }
  const hit = () =>
    findNearestNode(store.scene, 300, 200, 30, store.quadtree, store.maxPointRadius)

  const pushOnlyMs = meanMs(push)
  const pushAndHitTestMs = meanMs(() => {
    push()
    hit()
  })
  hit()
  const warmHitTestMs = meanMs(hit)
  const indexBuildMs = Math.max(0, pushAndHitTestMs - pushOnlyMs - warmHitTestMs)

  return {
    distribution,
    points,
    pushOnlyMs: round(pushOnlyMs),
    pushAndHitTestMs: round(pushAndHitTestMs),
    warmHitTestMs: round(warmHitTestMs, 3),
    indexBuildMs: round(indexBuildMs),
    indexShareOfHoveredPush: `${Math.round((100 * indexBuildMs) / pushAndHitTestMs)}%`
  }
}

const rows: AblationRow[] = []
for (const points of sizes) rows.push(measure("lattice", latticeDatum, points))
for (const points of sizes) {
  rows.push(measure("uniform-random", createUniformDatum(), points))
}

if (asJson) {
  console.log(JSON.stringify({ machine: describeMachine(), rows }, null, 2))
} else {
  console.log(`Spatial-index ablation — ${describeMachine()}`)
  console.log(`Sliding-window scatter, mean of ${REPS} pushes after ${WARMUP} warm-up pushes (ms)\n`)
  printTable([
    [
      "distribution",
      "points",
      "push only",
      "push + hit test",
      "warm hit test",
      "index build",
      "index share"
    ],
    ...rows.map((row) => [
      row.distribution,
      row.points,
      row.pushOnlyMs,
      row.pushAndHitTestMs,
      row.warmHitTestMs,
      row.indexBuildMs,
      row.indexShareOfHoveredPush
    ])
  ])
}
