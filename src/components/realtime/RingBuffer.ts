export class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private head: number = 0
  private _size: number = 0

  constructor(private _capacity: number) {
    if (!Number.isSafeInteger(_capacity) || _capacity < 1) {
      throw new Error("RingBuffer capacity must be a positive safe integer")
    }
    this.buffer = new Array(_capacity)
  }

  push(value: T): T | undefined {
    let evicted: T | undefined
    if (this._size === this._capacity) {
      // Buffer is full — the slot at head is the oldest item
      evicted = this.buffer[this.head]
    } else {
      this._size++
    }
    this.buffer[this.head] = value
    this.head = (this.head + 1) % this._capacity
    return evicted
  }

  pushMany(values: T[]): T[] {
    const evicted: T[] = []
    for (const v of values) {
      const e = this.push(v)
      if (e !== undefined) {
        evicted.push(e)
      }
    }
    return evicted
  }

  get(index: number): T | undefined {
    if (index < 0 || index >= this._size) return undefined
    const realIndex =
      (this.head - this._size + index + this._capacity) % this._capacity
    return this.buffer[realIndex]
  }

  peek(): T | undefined {
    return this.get(this._size - 1)
  }

  peekOldest(): T | undefined {
    return this.get(0)
  }

  [Symbol.iterator](): Iterator<T> {
    let i = 0
    const next = (): IteratorResult<T> => {
      if (i >= this._size) return { done: true, value: undefined } as IteratorReturnResult<undefined>
      return { done: false, value: this.get(i++)! }
    }
    return { next }
  }

  forEach(callback: (value: T, index: number) => void): void {
    const start = (this.head - this._size + this._capacity) % this._capacity
    for (let i = 0; i < this._size; i++) {
      callback(this.buffer[(start + i) % this._capacity]!, i)
    }
  }

  toArray(): T[] {
    const result = new Array<T>(this._size)
    this.forEach((value, index) => {
      result[index] = value
    })
    return result
  }

  resize(newCapacity: number): T[] {
    if (!Number.isSafeInteger(newCapacity) || newCapacity < 1) {
      throw new Error("RingBuffer capacity must be a positive safe integer")
    }
    if (this._capacity === newCapacity) return []
    const excess = Math.max(0, this._size - newCapacity)
    const evicted: T[] = []
    const buffer = new Array<T>(newCapacity)
    this.forEach((item, index) => {
      if (index < excess) evicted.push(item)
      else buffer[index - excess] = item
    })
    this.buffer = buffer
    this._capacity = newCapacity
    this._size -= excess
    this.head = this._size % newCapacity
    return evicted
  }

  /**
   * Update items in place. The updater receives each matching item and returns
   * the replacement. Returns the previous values of updated items.
   * O(n) scan, no compaction needed — buffer positions stay stable.
   */
  update(predicate: (item: T) => boolean, updater: (item: T) => T): T[] {
    const previous: T[] = []
    const start = (this.head - this._size + this._capacity) % this._capacity
    for (let i = 0; i < this._size; i++) {
      const idx = (start + i) % this._capacity
      const item = this.buffer[idx]!
      if (predicate(item)) {
        // Snapshot before calling updater so extent eviction sees original values
        let snapshot: T
        if (typeof item !== "object" || item === null) {
          snapshot = item
        } else if (Array.isArray(item)) {
          snapshot = [...item] as unknown as T
        } else {
          snapshot = { ...item } as T
        }
        previous.push(snapshot)
        this.buffer[idx] = updater(item)
      }
    }
    return previous
  }

  /**
   * Remove items matching a predicate. Returns removed items.
   * O(n) scan + compaction. Size decreases; capacity stays the same.
   */
  remove(predicate: (item: T) => boolean): T[] {
    const kept: T[] = []
    const removed: T[] = []
    this.forEach(item => {
      if (predicate(item)) {
        removed.push(item)
      } else {
        kept.push(item)
      }
    })
    if (removed.length === 0) return removed
    // Rebuild buffer from kept items
    this.clear()
    for (const item of kept) {
      this.push(item)
    }
    return removed
  }

  clear(): void {
    this.buffer = new Array(this._capacity)
    this.head = 0
    this._size = 0
  }

  get size(): number {
    return this._size
  }

  get capacity(): number {
    return this._capacity
  }

  get full(): boolean {
    return this._size === this._capacity
  }
}
