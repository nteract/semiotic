import type { RingBuffer } from "../../realtime/RingBuffer"

/** Grow geometrically unless the caller sets a FIFO retention limit. */
export function reserveChartRows<T>(rows: RingBuffer<T>, incoming: number, windowSize?: number): T[] {
  const limit = windowSize && Number.isSafeInteger(windowSize) && windowSize > 0 ? windowSize : Infinity
  if (rows.capacity > limit) return rows.resize(limit)
  const needed = Math.min(limit, rows.size + incoming)
  if (needed > rows.capacity) rows.resize(Math.min(limit, Math.max(needed, rows.capacity * 2)))
  return []
}
