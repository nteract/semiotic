export class IncrementalExtent {
  private _min: number = Infinity
  private _max: number = -Infinity
  private _dirty: boolean = false

  push(value: number): void {
    if (Number.isNaN(value)) return
    if (value < this._min) this._min = value
    if (value > this._max) this._max = value
  }

  evict(value: number): void {
    if (value === this._min || value === this._max) {
      this._dirty = true
    }
  }

  recalculate(
    values: Iterable<any>,
    accessor?: (v: any) => number
  ): void {
    this._min = Infinity
    this._max = -Infinity
    for (const v of values) {
      const n = accessor ? accessor(v) : (v as number)
      if (Number.isNaN(n)) continue
      if (n < this._min) this._min = n
      if (n > this._max) this._max = n
    }
    this._dirty = false
  }

  clear(): void {
    this._min = Infinity
    this._max = -Infinity
    this._dirty = false
  }

  get extent(): [number, number] {
    return [this._min, this._max]
  }

  get min(): number {
    return this._min
  }

  get max(): number {
    return this._max
  }

  get dirty(): boolean {
    return this._dirty
  }
}
