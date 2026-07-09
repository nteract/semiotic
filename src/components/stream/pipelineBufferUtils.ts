import type { RingBuffer } from "../realtime/RingBuffer"

/**
 * Resize a data buffer and its optional timestamp companion to fit a bounded
 * replacement dataset. Keeps timestamp/data indices aligned for pulse logic.
 */
export function ensureRingBufferCapacity<T>(
  buffer: RingBuffer<T>,
  targetSize: number,
  timestampBuffer?: RingBuffer<number> | null
): void {
  if (targetSize <= buffer.capacity) return
  buffer.resize(targetSize)
  if (timestampBuffer && targetSize > timestampBuffer.capacity) {
    timestampBuffer.resize(targetSize)
  }
}

/**
 * Push a datum and its ingest timestamp in lockstep. Returns any evicted datum
 * from the data buffer so callers can update extents/categories.
 */
export function pushWithTimestamp<T>(
  buffer: RingBuffer<T>,
  datum: T,
  timestampBuffer: RingBuffer<number> | null | undefined,
  timestamp: number
): T | undefined {
  const evicted = buffer.push(datum)
  if (timestampBuffer) timestampBuffer.push(timestamp)
  return evicted
}

/**
 * Compact a timestamp ring buffer before removing matching rows from the data
 * ring buffer. The predicate must be the same one passed to `buffer.remove()`.
 */
export function compactTimestampBufferForRemoval<T>(
  buffer: RingBuffer<T>,
  timestampBuffer: RingBuffer<number> | null | undefined,
  predicate: (item: T) => boolean
): void {
  if (!timestampBuffer || timestampBuffer.size === 0) return

  const removeSet = new Set<number>()
  buffer.forEach((item, i) => {
    if (predicate(item)) removeSet.add(i)
  })
  if (removeSet.size === 0) return

  const oldTimestamps = timestampBuffer.toArray()
  timestampBuffer.clear()
  for (let i = 0; i < oldTimestamps.length; i++) {
    if (!removeSet.has(i)) timestampBuffer.push(oldTimestamps[i])
  }
}
