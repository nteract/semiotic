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
  // Bound the unmerged buffer, not the total centroid count: a compressed
  // digest can itself exceed 2 * compression for long-tailed streams.
  private pending = 0
  private readonly compression: number

  constructor(compression = 100) {
    this.compression = Math.max(20, compression)
  }

  push(value: number): void {
    if (!Number.isFinite(value)) return
    this.centroids.push({ mean: value, weight: 1 })
    this.total += 1
    this.pending++
    if (this.pending >= this.compression * 2) this.compress()
  }

  merge(other: TDigest): void {
    if (other.total === 0) return
    const empty = this.total === 0
    // Capture the length so self-merge doubles the sketch exactly once, and
    // avoid an argument spread for callers using a large compression setting.
    const count = other.centroids.length
    for (let i = 0; i < count; i++)
      this.centroids.push({ ...other.centroids[i] })
    this.total += other.total
    this.pending =
      empty && this.compression === other.compression
        ? other.pending
        : this.pending + count
    if (!empty) this.compress()
  }

  clone(): TDigest {
    const copy = new TDigest(this.compression)
    copy.merge(this)
    return copy
  }

  /** Quantile in [0, 1], interpolated between centroid centers. Empty returns NaN. */
  quantile(q: number): number {
    if (this.total === 0 || Number.isNaN(q)) return Number.NaN
    const p = Math.min(1, Math.max(0, q))
    this.compress()
    const target = p * this.total
    let center = this.centroids[0].weight / 2
    if (target <= center) return this.centroids[0].mean
    for (let i = 1; i < this.centroids.length; i++) {
      const prev = this.centroids[i - 1]
      const curr = this.centroids[i]
      const span = (prev.weight + curr.weight) / 2
      const next = center + span
      if (target <= next) {
        const t = (target - center) / span
        return prev.mean + (curr.mean - prev.mean) * t
      }
      center = next
    }
    return this.centroids[this.centroids.length - 1].mean
  }

  get count(): number {
    return this.total
  }

  private compress(): void {
    if (this.pending === 0) return
    this.pending = 0
    if (this.centroids.length <= 1) return
    this.centroids.sort((a, b) => a.mean - b.mean)
    // Centroids are owned by this digest (merge copies incoming objects), so
    // compact in place without allocating another array and centroid copies.
    let write = 0
    let seen = 0
    const n = this.total
    const delta = this.compression
    for (let i = 1; i < this.centroids.length; i++) {
      const last = this.centroids[write]
      const current = this.centroids[i]
      const q = (seen + last.weight / 2) / n
      const maxWeight = (4 * n * q * (1 - q)) / delta
      if (last.weight + current.weight <= Math.max(1, maxWeight)) {
        const weight = last.weight + current.weight
        last.mean =
          (last.mean * last.weight + current.mean * current.weight) / weight
        last.weight = weight
      } else {
        seen += last.weight
        this.centroids[++write] = current
      }
    }
    this.centroids.length = write + 1
  }
}

export function percentileKey(q: number): string {
  const pct = Math.round(q * 1000) / 10
  return `p${String(pct).replace(".", "_")}`
}
