// Keep the synchronous chart entry independent of worker transport/validation.
export type ProcessSankeyLayoutExecution = "auto" | "worker" | "sync"
export const processSankeyWorkerAvailability = { failed: false }

/**
 * Default cost threshold for `execution: "auto"`.
 * Dense rivers (≈100 nodes × packing×ordering) sit well above this;
 * small docs demos stay on the main thread.
 */
export const DEFAULT_PROCESS_SANKEY_WORKER_THRESHOLD = 50_000

export function estimateProcessSankeyLayoutCost(
  nodeCount: number,
  edgeCount: number,
  packing: "off" | "reuse" = "reuse",
  laneOrder: string = "crossing-min",
): number {
  const packingFactor = packing === "reuse" ? 80 : 1
  const orderFactor = laneOrder && laneOrder !== "insertion" ? 40 : 1
  return (
    nodeCount * nodeCount * packingFactor +
    edgeCount * edgeCount * orderFactor +
    (nodeCount + edgeCount) * 10
  )
}

export function shouldUseProcessSankeyWorker(
  execution: ProcessSankeyLayoutExecution,
  nodeCount: number,
  edgeCount: number,
  packing: "off" | "reuse" = "reuse",
  laneOrder: string = "crossing-min",
  threshold = DEFAULT_PROCESS_SANKEY_WORKER_THRESHOLD,
): boolean {
  if (execution === "sync") return false
  if (execution === "worker") return true
  return estimateProcessSankeyLayoutCost(nodeCount, edgeCount, packing, laneOrder) >= threshold
}

export function canUseProcessSankeyWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined" && !processSankeyWorkerAvailability.failed
}

