export const MAX_CACHED_PAINTS = 256

export interface CanvasPaintCache<T> {
  version: number
  paints: Map<string, T>
}

/** Move a hit to the end so the first key remains the least recently used. */
export function readCachedPaint<T>(paints: Map<string, T>, key: string): T | undefined {
  const paint = paints.get(key)
  if (paint !== undefined) {
    paints.delete(key)
    paints.set(key, paint)
  }
  return paint
}

export function cachePaint<T>(paints: Map<string, T>, key: string, paint: T, limit: number): void {
  paints.set(key, paint)
  if (paints.size > limit) paints.delete(paints.keys().next().value!)
}
