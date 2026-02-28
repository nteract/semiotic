export class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private head: number = 0
  private _size: number = 0

  constructor(private _capacity: number) {
    if (_capacity < 1) {
      throw new Error("RingBuffer capacity must be at least 1")
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
    if (this._size === 0) return undefined
    return this.buffer[(this.head - 1 + this._capacity) % this._capacity]
  }

  peekOldest(): T | undefined {
    if (this._size === 0) return undefined
    return this.buffer[(this.head - this._size + this._capacity) % this._capacity]
  }

  [Symbol.iterator](): Iterator<T> {
    let i = 0
    const self = this
    return {
      next(): IteratorResult<T> {
        if (i >= self._size) return { done: true, value: undefined } as IteratorReturnResult<undefined>
        return { done: false, value: self.get(i++)! }
      }
    }
  }

  toArray(): T[] {
    const result: T[] = []
    for (const item of this) {
      result.push(item)
    }
    return result
  }

  resize(newCapacity: number): T[] {
    if (newCapacity < 1) {
      throw new Error("RingBuffer capacity must be at least 1")
    }
    const items = this.toArray()
    const evicted: T[] = []
    while (items.length > newCapacity) {
      evicted.push(items.shift()!)
    }
    this._capacity = newCapacity
    this.buffer = new Array(newCapacity)
    this.head = 0
    this._size = 0
    for (const item of items) {
      this.push(item)
    }
    return evicted
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
