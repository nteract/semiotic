// Duration parsing for aggregation windows.
//
// Window specs (`size`, `hop`, `gap`) accept either a raw millisecond
// number or a compact duration string — `"500ms"`, `"10s"`, `"1m"`,
// `"2h"`, `"1d"`. Compound strings like `"1m30s"` are supported and
// summed left-to-right. This is the terse form a streaming-config
// author reaches for; ISO-8601 durations (`"P30D"`) remain the
// annotation-`ttlHint` vocabulary and are intentionally not accepted
// here to keep the streaming config readable.
//
// NB: this is the **aggregation window**, not the RingBuffer eviction
// "sliding window" (`WindowMode`). See WindowAccumulator for the
// distinction.

const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

// One `<number><unit>` term. `ms` must precede `m`/`s` in the alternation
// so the longer unit wins (regex alternation is leftmost-eager).
const TERM = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/g

/**
 * Parse a window duration to milliseconds.
 *
 * - A finite number is returned as-is (already milliseconds).
 * - A string is parsed as one or more `<number><unit>` terms summed
 *   together: `"1m"`, `"500ms"`, `"1m30s"`.
 *
 * Returns `null` for unparseable input (empty string, unknown unit,
 * non-positive result, non-finite number) so callers can fall back to
 * a default rather than silently bucketing on a zero-width window.
 */
export function parseWindowDuration(spec: number | string): number | null {
  if (typeof spec === "number") {
    return Number.isFinite(spec) && spec > 0 ? spec : null
  }
  if (typeof spec !== "string") return null

  const trimmed = spec.trim()
  if (trimmed === "") return null

  TERM.lastIndex = 0
  let total = 0
  let matchedLength = 0
  let match: RegExpExecArray | null
  while ((match = TERM.exec(trimmed)) !== null) {
    const amount = parseFloat(match[1])
    const unit = UNIT_MS[match[2]]
    if (unit == null || !Number.isFinite(amount)) return null
    total += amount * unit
    matchedLength += match[0].length
  }

  // Reject strings with leftover junk ("1m!", "abc", "10") — every
  // character must belong to a recognized term.
  if (matchedLength !== trimmed.length) return null
  return total > 0 ? total : null
}
