/**
 * First-fit track allocation without scanning every occupied track. Each tree
 * entry holds the earliest end in its track range, letting a search skip whole
 * occupied ranges while still choosing the lowest available track index.
 *
 * Starts need not be ordered (span-arc packing sorts by width). NaN leaves
 * represent unavailable tracks, including unused capacity; unlike Infinity,
 * they never qualify even when an interval starts at Infinity.
 */
export class FirstAvailableTrack {
  count = 0
  private capacity = 1
  private tree = new Float64Array(2).fill(NaN)

  assign(start: number, end: number): number {
    let track: number
    if (this.tree[1] <= start) {
      let index = 1
      while (index < this.capacity) {
        index *= 2
        if (!(this.tree[index] <= start)) index++
      }
      track = index - this.capacity
    } else {
      track = this.count++
      if (track === this.capacity) this.grow()
    }

    let index = this.capacity + track
    this.tree[index] = end
    while (index > 1) {
      index = Math.floor(index / 2)
      const next = this.minimum(index)
      if (this.tree[index] === next) break
      this.tree[index] = next
    }
    return track
  }

  private minimum(index: number): number {
    const left = this.tree[index * 2]
    const right = this.tree[index * 2 + 1]
    return left <= right || Number.isNaN(right) ? left : right
  }

  private grow(): void {
    const previous = this.tree
    const oldCapacity = this.capacity
    this.capacity *= 2
    this.tree = new Float64Array(this.capacity * 2).fill(NaN)
    this.tree.set(previous.subarray(oldCapacity), this.capacity)
    for (let index = this.capacity - 1; index > 0; index--) {
      this.tree[index] = this.minimum(index)
    }
  }
}
