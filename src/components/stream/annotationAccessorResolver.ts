/**
 * Annotation-context accessors must be string keys — SVG overlay
 * rules look up coordinates with `data[xAccessor]`. When a chart's
 * user accessor is a function, we bake the resolved value under a
 * synthetic stable key on each annotation datum and forward the
 * synthetic key as the annotation's xAccessor / yAccessor.
 *
 * Originally inline in `StreamXYFrame.tsx`; lifted here so
 * `StreamOrdinalFrame` (and any future frame with the same need)
 * can share the same plumbing rather than re-implementing it.
 */
import type { Datum } from "../charts/shared/datumTypes"

export interface ResolvedAnnotationAccessor {
  /** String key the annotation context will read on each datum. */
  key: string | undefined
  /** Accessor function when the user supplied one (synthetic key
   *  gets baked from this); `null` when the user supplied a string
   *  or nothing. */
  fn: ((d: Datum) => any) | null
}

/**
 * Resolve an accessor pair to the (key, fn) shape the annotation
 * pipeline needs. Probes the primary accessor first, then the
 * fallback (e.g. `valueAccessor` when no `yAccessor` was supplied).
 *
 * - String accessor → use it as the key, no enrichment needed.
 * - Function accessor → use the synthetic resolved-key, run the fn
 *   per-datum to bake the value.
 * - Otherwise undefined.
 */
export function resolveAnnotationAccessor(
  primary: unknown,
  fallback: unknown,
  resolvedKey: string,
  fallbackKey: string,
): ResolvedAnnotationAccessor {
  if (typeof primary === "string") return { key: primary, fn: null }
  if (typeof primary === "function") return { key: resolvedKey, fn: primary as (d: Datum) => any }
  if (typeof fallback === "string") return { key: fallback, fn: null }
  if (typeof fallback === "function") return { key: fallbackKey, fn: fallback as (d: Datum) => any }
  return { key: undefined, fn: null }
}

/**
 * Build an `enrichAnnotationData(rawData)` function that walks the
 * data array and bakes synthetic-key values for any function
 * accessors. Returns the original array reference unchanged when no
 * enrichment is needed (no annotations, no function accessors, or
 * synthetic keys already present).
 */
export function buildEnrichAnnotationData(
  xResolved: ResolvedAnnotationAccessor,
  yResolved: ResolvedAnnotationAccessor,
  hasAnnotations: boolean,
) {
  return (rawData: Datum[] | undefined): Datum[] | undefined => {
    if (!rawData || !hasAnnotations || (!xResolved.fn && !yResolved.fn)) return rawData
    let didChange = false
    const result = rawData.map((d) => {
      const computeX = xResolved.fn && xResolved.key && !(xResolved.key in d)
      const computeY = yResolved.fn && yResolved.key && !(yResolved.key in d)
      if (!computeX && !computeY) return d
      didChange = true
      const copy = { ...d }
      if (computeX) copy[xResolved.key!] = xResolved.fn!(d)
      if (computeY) copy[yResolved.key!] = yResolved.fn!(d)
      return copy
    })
    return didChange ? result : rawData
  }
}
