// Online running statistics — Welford's method.
//
// A bounded, O(1)-per-update summary of a stream of numbers: count,
// mean, variance/stddev, min, max. Updated incrementally on `push`,
// so a streaming mean line or ±σ band costs O(1) per ingest instead
// of re-scanning the buffer each frame.
//
// `merge` is the parallel-variance combine (Chan et al.): it folds two
// independently-accumulated `RunningStats` into one without revisiting
// the underlying data. That is the operation a windowed-aggregation
// rollup relies on — fine-resolution windows merge into coarse parents
// in O(1), and parallel/sharded ingest streams join the same way.
//
// Relationship to `IncrementalExtent`: that class tracks min/max only
// and stays on the hot extent path. `RunningStats` is a superset (it
// also tracks min/max) for the aggregation/overlay paths that need
// mean and variance; it does not replace `IncrementalExtent`.

/**
 * Accumulates count, mean, variance, standard deviation, min, and max
 * over a stream of numbers using Welford's online algorithm.
 *
 * Numerically stable in a single pass — preferred over the naive
 * "sum of squares minus square of sum" form, which loses precision
 * when values are large or closely clustered.
 */
export class RunningStats {
  private _count: number = 0
  private _mean: number = 0
  // Sum of squares of differences from the running mean (Welford's M2).
  private _m2: number = 0
  private _min: number = Infinity
  private _max: number = -Infinity

  /**
   * Incorporate a value. O(1). Non-finite values (NaN, ±Infinity) are
   * ignored — they would corrupt every downstream statistic — matching
   * `IncrementalExtent`'s filter so all accumulators agree on what counts.
   */
  push(value: number): void {
    if (!Number.isFinite(value)) return
    this._count += 1
    const delta = value - this._mean
    this._mean += delta / this._count
    const delta2 = value - this._mean
    this._m2 += delta * delta2
    if (value < this._min) this._min = value
    if (value > this._max) this._max = value
  }

  /**
   * Fold another accumulator's statistics into this one, in O(1),
   * without revisiting the underlying values. Uses the parallel
   * variance combine (Chan, Golub & LeVeque). Associative and
   * commutative up to floating-point rounding — `a.merge(b)` then
   * `a.merge(c)` yields the same result as merging in any order.
   *
   * Merging an empty accumulator is a no-op; merging into an empty
   * accumulator copies the other's state.
   */
  merge(other: RunningStats): void {
    if (other._count === 0) return
    if (this._count === 0) {
      this._count = other._count
      this._mean = other._mean
      this._m2 = other._m2
      this._min = other._min
      this._max = other._max
      return
    }
    const n = this._count + other._count
    const delta = other._mean - this._mean
    this._mean += (delta * other._count) / n
    this._m2 +=
      other._m2 + (delta * delta * this._count * other._count) / n
    this._count = n
    if (other._min < this._min) this._min = other._min
    if (other._max > this._max) this._max = other._max
  }

  /** Reset to the empty state. */
  clear(): void {
    this._count = 0
    this._mean = 0
    this._m2 = 0
    this._min = Infinity
    this._max = -Infinity
  }

  /** A detached copy — useful for snapshotting a window before rollup. */
  clone(): RunningStats {
    const copy = new RunningStats()
    copy._count = this._count
    copy._mean = this._mean
    copy._m2 = this._m2
    copy._min = this._min
    copy._max = this._max
    return copy
  }

  /** Number of values incorporated. */
  get count(): number {
    return this._count
  }

  /** Arithmetic mean, or 0 when empty. */
  get mean(): number {
    return this._count === 0 ? 0 : this._mean
  }

  /**
   * Sum of all values. Derived as `mean × count`, so it carries the
   * same (tiny) floating drift as the running mean rather than a
   * separate exact accumulator.
   */
  get sum(): number {
    return this._count === 0 ? 0 : this._mean * this._count
  }

  /**
   * Population variance (divides by `count`). 0 when fewer than two
   * values have been seen. Use this for a complete window of points —
   * the window *is* the population. See {@link sampleVariance} for the
   * unbiased estimator over a sample.
   */
  get variance(): number {
    return this._count < 2 ? 0 : this._m2 / this._count
  }

  /** Population standard deviation — `sqrt(variance)`. */
  get stddev(): number {
    return Math.sqrt(this.variance)
  }

  /**
   * Sample variance (divides by `count − 1`, Bessel's correction).
   * 0 when fewer than two values have been seen.
   */
  get sampleVariance(): number {
    return this._count < 2 ? 0 : this._m2 / (this._count - 1)
  }

  /** Sample standard deviation — `sqrt(sampleVariance)`. */
  get sampleStddev(): number {
    return Math.sqrt(this.sampleVariance)
  }

  /** Smallest value seen, or `Infinity` when empty. */
  get min(): number {
    return this._min
  }

  /** Largest value seen, or `-Infinity` when empty. */
  get max(): number {
    return this._max
  }
}
