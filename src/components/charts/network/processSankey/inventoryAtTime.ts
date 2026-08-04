/**
 * Pure inventory ledger for ProcessSankey-style stock-and-flow graphs.
 *
 * Persistent institutions (and other nodes whose stock is only implied by
 * edge events) compute "how much sits in this node at time t" by folding
 * arrivals and departures. Predecessor/source nodes that begin with authored
 * stock rather than an inbound transaction are handled by lifting the running
 * balance so it never goes negative — the same convention the United States
 * history-river example used inline before extraction.
 */

export interface InventoryEdge {
  source: string
  target: string
  value: number
  /** Time mass leaves the source (ribbon depart / transfer start). */
  startTime: number
  /** Time mass arrives at the target (ribbon arrive / transfer end). */
  endTime: number
  /**
   * Optional lifecycle exit from the target band (e.g. colonial administration
   * ending). When set, counts as a departure from `target` at this time.
   */
  systemOutTime?: number | null
}

export interface InventoryAtTimeOptions {
  /**
   * When true (default), infer an opening stock so the running balance never
   * dips below zero. When false, report the raw cumulative sum of events at
   * `time` (may be negative for incomplete ledgers).
   */
  inferOpeningStock?: boolean
}

/**
 * Inventory of `nodeId` at `time` from an edge ledger.
 *
 * Events:
 * - inbound: `target === nodeId` at `endTime` (+value)
 * - outbound: `source === nodeId` at `startTime` (−value)
 * - lifecycle exit: `target === nodeId` with `systemOutTime` (−value)
 */
export function inventoryAtTime(
  nodeId: string,
  time: number,
  edges: readonly InventoryEdge[],
  options: InventoryAtTimeOptions = {},
): number {
  const inferOpeningStock = options.inferOpeningStock !== false
  const events: Array<{ time: number; delta: number }> = []

  for (const edge of edges) {
    const value = Number(edge.value)
    if (!Number.isFinite(value)) continue
    if (edge.target === nodeId) {
      events.push({ time: edge.endTime, delta: value })
    }
    if (edge.source === nodeId) {
      events.push({ time: edge.startTime, delta: -value })
    }
    if (edge.target === nodeId && edge.systemOutTime != null) {
      const t = Number(edge.systemOutTime)
      if (Number.isFinite(t)) events.push({ time: t, delta: -value })
    }
  }

  events.sort((a, b) => a.time - b.time || b.delta - a.delta)

  let running = 0
  let minimum = 0
  let balanceAtTime = 0
  for (const event of events) {
    running += event.delta
    minimum = Math.min(minimum, running)
    if (event.time <= time) balanceAtTime += event.delta
  }

  if (!inferOpeningStock) return balanceAtTime
  return balanceAtTime - minimum
}
