/**
 * Deterministic one-dimensional layout primitives shared by ordered bands,
 * lanes, and layered graphs. The helpers are deliberately geometry-agnostic:
 * callers provide relations, silhouettes, and cost functions while the kit
 * owns the guarded search and separation invariants.
 */

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
    throw new Error("placeWithMinGap: minGaps must have desired.length - 1 entries")
  }

  const offsets = new Array<number>(n).fill(0)
  for (let i = 1; i < n; i++) {
    offsets[i] = offsets[i - 1] + Math.max(0, Number.isFinite(minGaps[i - 1]) ? minGaps[i - 1] : 0)
  }

  interface Block { start: number; end: number; weight: number; mean: number }
  const blocks: Block[] = []
  for (let i = 0; i < n; i++) {
    const weight = Math.max(Number.EPSILON, Number.isFinite(weights?.[i]) ? weights![i] : 1)
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
        mean: (left.mean * left.weight + right.mean * right.weight) / mergedWeight,
      })
    }
  }

  const lower = Number.isFinite(options.min) ? options.min! : -Infinity
  const upper = Number.isFinite(options.max) ? options.max! - offsets[n - 1] : Infinity
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

export interface SilhouetteSample {
  /** Position along the independent axis (time, layer, or another index). */
  at: number
  /** Extent before the band's centerline (top for a vertical lane). */
  before: number
  /** Extent after the band's centerline (bottom for a vertical lane). */
  after: number
}

export interface PackedBands {
  /** Minimum silhouette clearance between each adjacent pair. */
  adjacentClearance: number[]
  /** Center coordinates starting at zero, including `gap`. */
  positions: number[]
}

function silhouetteAt(samples: readonly SilhouetteSample[], at: number): SilhouetteSample {
  let lo = 0
  let hi = samples.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (samples[mid].at <= at) { found = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  return found < 0 ? { at, before: 0, after: 0 } : samples[found]
}

/**
 * Pack ordered bands using their sampled silhouettes. Adjacent clearance is
 * the worst simultaneous `lower.after + upper.before` extent, so peaks that
 * occur at different positions can nest without overlap.
 */
export function packBandsBySilhouette(
  bands: readonly (readonly SilhouetteSample[])[],
  gap = 0,
): PackedBands {
  if (bands.length === 0) return { adjacentClearance: [], positions: [] }
  const adjacentClearance: number[] = []
  const positions = [0]
  for (let i = 0; i < bands.length - 1; i++) {
    const upper = bands[i]
    const lower = bands[i + 1]
    const times = [...new Set([...upper.map((d) => d.at), ...lower.map((d) => d.at)])]
      .sort((a, b) => a - b)
    let clearance = 0
    for (const at of times) {
      const a = silhouetteAt(upper, at)
      const b = silhouetteAt(lower, at)
      clearance = Math.max(clearance, a.after + b.before)
    }
    adjacentClearance.push(clearance)
    positions.push(positions[positions.length - 1] + clearance + gap)
  }
  return { adjacentClearance, positions }
}

export interface WeightedOrderRelation<T> {
  source: T
  target: T
  weight?: number
}

export interface GuardedOrderOptions<T> {
  passes?: number
  /** Stable, locale-independent tie-break supplied by the caller. */
  compare?: (a: T, b: T) => number
  /** Hard cap on evaluated candidates; deterministic unlike a wall-clock cap. */
  maxEvaluations?: number
}

/** Guarded weighted-barycenter sweeps that retain the best observed order. */
export function orderByBarycenter<T>(
  input: readonly T[],
  relations: readonly WeightedOrderRelation<T>[],
  cost: (order: readonly T[]) => number,
  options: GuardedOrderOptions<T> = {},
): T[] {
  let order = [...input]
  if (order.length <= 1) return order
  let best = [...order]
  let bestCost = cost(order)
  let evaluations = 1
  const passes = Math.max(0, options.passes ?? 6)
  const budget = Math.max(1, options.maxEvaluations ?? Infinity)
  for (let pass = 0; pass < passes && evaluations < budget; pass++) {
    const position = new Map(order.map((item, index) => [item, index]))
    const sums = new Map<T, number>()
    const weights = new Map<T, number>()
    for (const relation of relations) {
      const sourcePosition = position.get(relation.source)
      const targetPosition = position.get(relation.target)
      if (sourcePosition == null || targetPosition == null) continue
      const weight = Number.isFinite(relation.weight) && relation.weight! > 0 ? relation.weight! : 1
      sums.set(relation.source, (sums.get(relation.source) ?? 0) + targetPosition * weight)
      weights.set(relation.source, (weights.get(relation.source) ?? 0) + weight)
      sums.set(relation.target, (sums.get(relation.target) ?? 0) + sourcePosition * weight)
      weights.set(relation.target, (weights.get(relation.target) ?? 0) + weight)
    }
    order = order
      .map((item, index) => ({
        item,
        index,
        barycenter: (sums.get(item) ?? index) / (weights.get(item) ?? 1),
      }))
      .sort((a, b) =>
        a.barycenter - b.barycenter ||
        (options.compare?.(a.item, b.item) ?? a.index - b.index),
      )
      .map((d) => d.item)
    const nextCost = cost(order)
    evaluations++
    if (nextCost < bestCost) {
      bestCost = nextCost
      best = [...order]
    } else if (nextCost === bestCost) {
      break
    }
  }
  return best
}

/** Guarded adjacent-transpose refinement under a caller-provided cost. */
export function refineByAdjacentSwaps<T>(
  input: readonly T[],
  cost: (order: readonly T[]) => number,
  options: GuardedOrderOptions<T> = {},
): T[] {
  const order = [...input]
  if (order.length <= 1) return order
  let currentCost = cost(order)
  let evaluations = 1
  const passes = Math.max(0, options.passes ?? 6)
  const budget = Math.max(1, options.maxEvaluations ?? Infinity)
  for (let pass = 0; pass < passes && evaluations < budget; pass++) {
    let improved = false
    for (let i = 0; i < order.length - 1 && evaluations < budget; i++) {
      ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
      const nextCost = cost(order)
      evaluations++
      if (nextCost < currentCost) {
        currentCost = nextCost
        improved = true
      } else {
        ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
      }
    }
    if (!improved) break
  }
  return order
}

/** Exhaustive Heap-permutation ordering for small item sets. */
export function orderExactSmall<T>(
  input: readonly T[],
  cost: (order: readonly T[]) => number,
  options: Pick<GuardedOrderOptions<T>, "maxEvaluations"> & { maxItems?: number } = {},
): T[] {
  const order = [...input]
  const n = order.length
  if (n <= 1 || n > (options.maxItems ?? 8)) return order
  const budget = Math.max(1, options.maxEvaluations ?? Infinity)
  let evaluations = 0
  let best = [...order]
  let bestCost = Infinity
  const evaluate = () => {
    if (evaluations >= budget) return
    const nextCost = cost(order)
    evaluations++
    if (nextCost < bestCost) { bestCost = nextCost; best = [...order] }
  }
  evaluate()
  const counters = new Array<number>(n).fill(0)
  let i = 0
  while (i < n && evaluations < budget) {
    if (counters[i] < i) {
      const j = i % 2 === 0 ? 0 : counters[i]
      ;[order[j], order[i]] = [order[i], order[j]]
      evaluate()
      counters[i]++
      i = 0
    } else {
      counters[i] = 0
      i++
    }
  }
  return best
}

/** Count endpoint-order inversions, optionally filtering candidate pairs. */
export function countPairwiseCrossings<T>(
  items: readonly T[],
  endpoints: (item: T) => readonly [number, number],
  comparePair: (a: T, b: T) => boolean = () => true,
): number {
  let crossings = 0
  for (let i = 0; i < items.length; i++) {
    const [a0, a1] = endpoints(items[i])
    for (let j = i + 1; j < items.length; j++) {
      if (!comparePair(items[i], items[j])) continue
      const [b0, b1] = endpoints(items[j])
      // Equal endpoints fan in/out but do not cross each other.
      if ((a0 - b0) * (a1 - b1) < 0) crossings++
    }
  }
  return crossings
}
