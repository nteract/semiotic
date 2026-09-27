/** Range maximum with monotone range updates for overlapping circular bands. */
export class ColumnOccupancy {
  private readonly maximum: Float64Array
  private readonly floor: Float64Array

  constructor(private readonly size: number) {
    this.maximum = new Float64Array(4 * size)
    this.floor = new Float64Array(4 * size)
  }

  query(start: number, end: number): number {
    const visit = (node: number, lo: number, hi: number): number => {
      if (start <= lo && hi <= end) return this.maximum[node]
      const mid = (lo + hi) >>> 1
      return Math.max(
        this.floor[node],
        start <= mid ? visit(node * 2, lo, mid) : 0,
        end > mid ? visit(node * 2 + 1, mid + 1, hi) : 0
      )
    }
    return visit(1, 0, this.size - 1)
  }

  reserve(start: number, end: number, value: number): void {
    const visit = (node: number, lo: number, hi: number): void => {
      this.maximum[node] = Math.max(this.maximum[node], value)
      if (start <= lo && hi <= end) {
        this.floor[node] = Math.max(this.floor[node], value)
        return
      }
      const mid = (lo + hi) >>> 1
      if (start <= mid) visit(node * 2, lo, mid)
      if (end > mid) visit(node * 2 + 1, mid + 1, hi)
    }
    visit(1, 0, this.size - 1)
  }
}
