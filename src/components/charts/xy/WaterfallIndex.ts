import type { Datum } from "../shared/datumTypes"

/** Bounded categorical labels and IDs; caller-owned rows are never stamped. */
export class WaterfallIndex {
  private next = 0
  private indices = new WeakMap<Datum, number>()
  private ids = new Map<string, number>()
  private entries = new Map<number, { id: string; label: unknown }>()

  index(row: Datum, id: string, label: unknown, capacity: number): number {
    const known = this.indices.get(row)
    // Extent eviction can re-read old rows; never resurrect their labels or IDs.
    if (known != null && !this.entries.has(known)) return known
    const previous = known ?? (id ? this.ids.get(id) : undefined)
    const index =
      previous != null && this.entries.has(previous) ? previous : this.next++
    const prior = this.entries.get(index)
    if (prior?.id && prior.id !== id && this.ids.get(prior.id) === index) this.ids.delete(prior.id)
    this.indices.set(row, index)
    if (id) this.ids.set(id, index)
    this.entries.set(index, { id, label })
    while (this.entries.size > Math.max(1, capacity))
      this.forgetIndex(this.entries.keys().next().value!)
    return index
  }

  label(index: number): unknown {
    return this.entries.get(index)?.label
  }

  forget(row: Datum): void {
    const index = this.indices.get(row)
    this.indices.delete(row)
    if (index != null) this.forgetIndex(index)
  }

  private forgetIndex(index: number): void {
    const entry = this.entries.get(index)
    if (entry?.id && this.ids.get(entry.id) === index) this.ids.delete(entry.id)
    this.entries.delete(index)
  }
}
