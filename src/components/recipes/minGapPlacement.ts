export interface MinGapPlacementOptions {
  /** Preferred coordinate for each item, in order. */
  desired: readonly number[]
  /** Minimum distance between item i and i + 1. */
  minGaps: readonly number[]
  /** Optional least-squares weight per desired coordinate. */
  weights?: readonly number[]
  /** Optional lower bound for the first coordinate. */
  min?: number
  /** Optional upper bound for the last coordinate. */
  max?: number
}

/**
 * Least-squares placement with fixed order and per-pair minimum gaps.
 *
 * The gap constraints are removed with cumulative offsets, then weighted
 * isotonic regression (pool-adjacent-violators) solves the remaining
 * non-decreasing placement. Bounds apply to the whole ordered sequence.
 */
export function placeWithMinGap(options: MinGapPlacementOptions): number[] {
  const { desired, minGaps, weights } = options
  const n = desired.length
  if (n === 0) return []
  if (minGaps.length !== Math.max(0, n - 1)) {
    throw new Error(
      "placeWithMinGap: minGaps must have desired.length - 1 entries"
    )
  }

  const offsets = new Array<number>(n).fill(0)
  for (let i = 1; i < n; i++) {
    offsets[i] =
      offsets[i - 1] +
      Math.max(0, Number.isFinite(minGaps[i - 1]) ? minGaps[i - 1] : 0)
  }

  interface Block {
    start: number
    end: number
    weight: number
    mean: number
  }
  const blocks: Block[] = []
  for (let i = 0; i < n; i++) {
    const weight = Math.max(
      Number.EPSILON,
      Number.isFinite(weights?.[i]) ? weights![i] : 1
    )
    const value = (Number.isFinite(desired[i]) ? desired[i] : 0) - offsets[i]
    blocks.push({ start: i, end: i, weight, mean: value })
    while (blocks.length > 1) {
      const right = blocks[blocks.length - 1]
      const left = blocks[blocks.length - 2]
      if (left.mean <= right.mean) break
      const mergedWeight = left.weight + right.weight
      blocks.splice(blocks.length - 2, 2, {
        start: left.start,
        end: right.end,
        weight: mergedWeight,
        mean:
          (left.mean * left.weight + right.mean * right.weight) / mergedWeight
      })
    }
  }

  const lower = Number.isFinite(options.min) ? options.min! : -Infinity
  const upper = Number.isFinite(options.max)
    ? options.max! - offsets[n - 1]
    : Infinity
  // A caller can provide infeasible bounds. Preserve every minimum gap and
  // anchor at the lower bound rather than compressing or emitting NaN.
  const boundedUpper = upper < lower ? lower : upper
  const result = new Array<number>(n)
  for (const block of blocks) {
    const mean = Math.max(lower, Math.min(boundedUpper, block.mean))
    for (let i = block.start; i <= block.end; i++) result[i] = mean + offsets[i]
  }
  return result
}
