import { useState, useEffect, useMemo } from "react"
import { resolveReferenceGeography, isReferenceGeography, type ReferenceGeography } from "./referenceGeography"

export type AreasProp = GeoJSON.Feature[] | ReferenceGeography

/**
 * Hook that resolves an `areas` prop — either GeoJSON features passed directly,
 * or a string reference ("world-110m", etc.) that triggers an async load.
 *
 * Returns `null` while loading, resolved features when ready.
 *
 * When `areas` is already an array, the value is returned synchronously via
 * useMemo (no stale-frame lag between prop changes). The useState+useEffect
 * path is only used for async reference string resolution.
 */
export function useReferenceAreas(
  areas: AreasProp | undefined
): GeoJSON.Feature[] | null {
  // Synchronous path: areas is already a GeoJSON array — return it directly
  // via useMemo so prop changes are reflected immediately (no effect delay).
  const syncResult = useMemo(
    () => (Array.isArray(areas) ? areas : undefined),
    [areas]
  )

  // Async path: areas is a reference string that needs dynamic import
  const [asyncResolved, setAsyncResolved] = useState<GeoJSON.Feature[] | null>(null)

  useEffect(() => {
    // Only run the async path for string references
    if (!areas || Array.isArray(areas)) {
      setAsyncResolved(null)
      return
    }

    if (isReferenceGeography(areas)) {
      let cancelled = false
      setAsyncResolved(null) // clear previous while loading
      resolveReferenceGeography(areas).then(features => {
        if (!cancelled) setAsyncResolved(features)
      })
      return () => { cancelled = true }
    }

    // Unknown string — warn and pass null
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[semiotic] Unknown areas reference: "${areas}". ` +
        `Supported: "world-110m", "world-50m", "land-110m", "land-50m".`
      )
    }
    setAsyncResolved(null)
  }, [areas])

  // Sync path takes priority; fall back to async result for string references
  return syncResult !== undefined ? syncResult : asyncResolved
}
