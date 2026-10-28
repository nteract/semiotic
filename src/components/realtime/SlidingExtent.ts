/** Monotonic queues make FIFO extrema eviction amortized O(1), including ties. */
export class SlidingExtent {
  private needsRebuild = false
  private minima: number[] = []
  private maxima: number[] = []
  private minHead = 0
  private maxHead = 0

  push(value: number): void {
    if (!Number.isFinite(value)) return
    while (
      this.minima.length > this.minHead &&
      this.minima[this.minima.length - 1] > value
    )
      this.minima.pop()
    while (
      this.maxima.length > this.maxHead &&
      this.maxima[this.maxima.length - 1] < value
    )
      this.maxima.pop()
    this.minima.push(value)
    this.maxima.push(value)
  }

  /** Only for evicting values in the same order they were pushed. */
  evictOldest(value: number): void {
    if (!Number.isFinite(value) || this.dirty) return
    if (this.minima[this.minHead] === value) this.minHead++
    if (this.maxima[this.maxHead] === value) this.maxHead++
    // Compact geometrically so long-lived streams retain O(window) memory.
    if (this.minHead * 2 >= this.minima.length) {
      this.minima = this.minima.slice(this.minHead)
      this.minHead = 0
    }
    if (this.maxHead * 2 >= this.maxima.length) {
      this.maxima = this.maxima.slice(this.maxHead)
      this.maxHead = 0
    }
  }

  /** Arbitrary removals/edits require rebuilding queues from retained data. */
  evict(value: number): void {
    if (Number.isFinite(value)) this.needsRebuild = true
  }

  recalculate<T>(values: Iterable<T>, accessor?: (value: T) => number): void {
    this.clear()
    for (const value of values)
      this.push(accessor ? accessor(value) : (value as number))
  }

  clear(): void {
    this.needsRebuild = false
    this.minima = []
    this.maxima = []
    this.minHead = 0
    this.maxHead = 0
  }

  get min(): number {
    return this.minima[this.minHead] ?? Infinity
  }

  get extent(): [number, number] {
    return [this.min, this.maxima[this.maxHead] ?? -Infinity]
  }

  get dirty(): boolean {
    return this.needsRebuild
  }
}
