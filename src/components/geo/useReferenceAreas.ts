import { useState, useEffect } from "react"
import { resolveReferenceGeography, isReferenceGeography, type ReferenceGeography } from "./referenceGeography"

export type AreasProp = GeoJSON.Feature[] | ReferenceGeography

/**
 * Hook that resolves an `areas` prop — either GeoJSON features passed directly,
 * or a string reference ("world-110m", etc.) that triggers an async load.
 *
 * Returns `null` while loading, resolved features when ready.
 */
export function useReferenceAreas(
  areas: AreasProp | undefined
): GeoJSON.Feature[] | null {
  const [resolved, setResolved] = useState<GeoJSON.Feature[] | null>(
    // If already an array, use it immediately (no flash)
    Array.isArray(areas) ? areas : null
  )

  useEffect(() => {
    if (!areas) {
      setResolved(null)
      return
    }

    if (Array.isArray(areas)) {
      setResolved(areas)
      return
    }

    if (isReferenceGeography(areas)) {
      let cancelled = false
      resolveReferenceGeography(areas).then(features => {
        if (!cancelled) setResolved(features)
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
    setResolved(null)
  }, [areas])

  return resolved
}
