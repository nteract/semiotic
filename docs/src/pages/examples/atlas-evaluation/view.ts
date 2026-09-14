import { overviewBranches } from "../../../../../scripts/network-atlas/workloads"
import type { AtlasEvaluation } from "./prepare"

export function atlasEvaluationChartProps(result: AtlasEvaluation, region: number) {
  const summary = `${result.facts.nodes.toLocaleString("en-US")} vertices, ${result.facts.edges.toLocaleString("en-US")} original edges and ${result.facts.stock.toLocaleString("en-US")} units of stock across 20 bands. Layout compression does not remove evidence.`
  return {
    forest: result.forest,
    collapsedNodeIds: overviewBranches(result.groups, region),
    width: 2400,
    height: 1400,
    reading: "organize" as const,
    title: "Atlas acceptance overview",
    description: `${summary} Synthetic directed structure. Three regions are open; collapsed glyphs count their hidden vertices and original internal links. Capacity and completion measurements are not supplied.`,
    summary,
    accessibleTable: true,
  }
}

function nextFrame(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error("Selection measurement cancelled"))
    const abort = () => {
      cancelAnimationFrame(frame)
      cleanup()
      reject(new Error("Selection measurement cancelled"))
    }
    const visibility = () => {
      if (document.hidden) abort()
    }
    const cleanup = () => {
      signal.removeEventListener("abort", abort)
      document.removeEventListener("visibilitychange", visibility)
    }
    const frame = requestAnimationFrame(() => {
      cleanup()
      resolve()
    })
    signal.addEventListener("abort", abort, { once: true })
    document.addEventListener("visibilitychange", visibility)
  })
}

/** Includes browser scheduling: select, let React and canvas paint, observe at
 * the following frame. This is a local response probe, not a reader study.
 */
export async function measureAtlasSelections(
  select: (id: string) => void,
  ids: string[],
  signal: AbortSignal,
) {
  const samples: number[] = []
  for (let i = 0; i < 53; i++) {
    if (document.hidden || signal.aborted) throw new Error("Selection measurement cancelled")
    const start = performance.now()
    select(ids[i % ids.length])
    await nextFrame(signal)
    await nextFrame(signal)
    if (i >= 3) samples.push(performance.now() - start)
  }
  const sorted = [...samples].sort((a, b) => a - b)
  return {
    recordedAt: new Date().toISOString(),
    method:
      "Three warm-ups, then 50 selections. Each sample waits for two animation frames after selection; preparation is already complete.",
    samples: samples.length,
    sampleDurationsMs: samples,
    medianMs: (sorted[24] + sorted[25]) / 2,
    p95Ms: sorted[47],
    targetMs: 50,
    targetMet: sorted[47] < 50,
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency,
  }
}
