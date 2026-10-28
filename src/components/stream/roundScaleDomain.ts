/** Widen a continuous value scale using d3's stable nice step, retaining pinned
 * ends from the already-resolved domain (including log-domain validation). */
export function roundScaleDomain(
  scale: {
    domain(): number[]
    domain(values: number[]): unknown
    nice(count?: number): { domain(): number[] }
  },
  count: number,
  pinned: readonly boolean[]
): void {
  if (count <= 0 || (pinned[0] && pinned[1])) return
  const original = scale.domain()
  scale.domain(
    // Coerce time-scale Dates to timestamps; adding zero normalizes -0.
    scale.nice(count).domain().map((value, index) => +(pinned[index] ? original[index] : value) + 0)
  )
}
