/**
 * Compact t-digest (Dunning) for streaming quantiles.
 *
 * Centroids merge under a size bound that is tight in the tails, so p95 /
 * p99 stay accurate without retaining every observation. `push` and
 * `merge` are the only mutating operations a windowed aggregator needs.
 */

interface Centroid {
  mean: number
  weight: number
}

export class TDigest {
  private centroids: Centroid[] = []
  private total = 0
  private readonly compression: number

  constructor(compression = 100) {
    this.compression = Math.max(20, compression)
  }

  push(value: number): void {
    if (!Number.isFinite(value)) return
    this.centroids.push({ mean: value, weight: 1 })
    this.total += 1
    if (this.centroids.length > this.compression * 2) this.compress()
  }

  merge(other: TDigest): void {
    if (other.total === 0) return
    if (this.total === 0) {
      this.centroids = other.centroids.map((c) => ({ ...c }))
      this.total = other.total
      return
    }
    this.centroids.push(...other.centroids.map((c) => ({ ...c })))
    this.total += other.total
    this.compress()
  }

  clone(): TDigest {
    const copy = new TDigest(this.compression)
    copy.centroids = this.centroids.map((c) => ({ ...c }))
    copy.total = this.total
    return copy
  }

  /** Inclusive quantile in (0, 1]. Empty digest returns NaN. */
  quantile(q: number): number {
    if (this.total === 0) return Number.NaN
    const p = Math.min(1, Math.max(0, q))
    this.compress()
    const target = p * this.total
    let cumulative = 0
    for (let i = 0; i < this.centroids.length; i++) {
      const next = cumulative + this.centroids[i].weight
      if (next >= target || i === this.centroids.length - 1) {
        if (i === 0 || target <= cumulative) return this.centroids[i].mean
        const prev = this.centroids[i - 1]
        const curr = this.centroids[i]
        const span = curr.weight
        const t = span === 0 ? 0 : (target - cumulative) / span
        return prev.mean + (curr.mean - prev.mean) * t
      }
      cumulative = next
    }
    return this.centroids[this.centroids.length - 1].mean
  }

  get count(): number {
    return this.total
  }

  private compress(): void {
    if (this.centroids.length <= 1) return
    this.centroids.sort((a, b) => a.mean - b.mean)
    const merged: Centroid[] = [{ ...this.centroids[0] }]
    let seen = 0
    const n = this.total
    const delta = this.compression
    for (let i = 1; i < this.centroids.length; i++) {
      const last = merged[merged.length - 1]
      const q = n === 0 ? 0 : (seen + last.weight / 2) / n
      const maxWeight = (4 * n * q * (1 - q)) / delta
      if (last.weight + this.centroids[i].weight <= Math.max(1, maxWeight)) {
        const weight = last.weight + this.centroids[i].weight
        last.mean =
          (last.mean * last.weight + this.centroids[i].mean * this.centroids[i].weight) /
          weight
        last.weight = weight
      } else {
        seen += last.weight
        merged.push({ ...this.centroids[i] })
      }
    }
    this.centroids = merged
  }
}

export function percentileKey(q: number): string {
  const pct = Math.round(q * 1000) / 10
  return Number.isInteger(pct) ? `p${pct}` : `p${String(pct).replace(".", "_")}`
}
