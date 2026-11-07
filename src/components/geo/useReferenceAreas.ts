import { useState, useEffect } from "react"
import {
  resolveReferenceGeography,
  isReferenceGeography,
  type ReferenceGeography
} from "./referenceGeography"

export type AreasProp = GeoJSON.Feature[] | ReferenceGeography

/**
 * Hook that resolves an `areas` prop — either GeoJSON features passed directly,
 * or a string reference ("world-110m", etc.) that triggers an async load.
 *
 * Returns `null` while loading, resolved features when ready.
 *
 * Arrays resolve synchronously. Async results belong to their reference name,
 * so a new geography never commits a frame using the previous one's features.
 * Import failures reach the nearest chart error boundary.
 */
export function useReferenceAreas(
  areas: AreasProp | undefined
): GeoJSON.Feature[] | null {
  const [resolved, setResolved] = useState<
    | { source: ReferenceGeography; features: GeoJSON.Feature[] }
    | { source: ReferenceGeography; error: unknown }
    | null
  >(null)

  useEffect(() => {
    // Only run the async path for string references
    if (!areas || Array.isArray(areas)) {
      return
    }

    if (isReferenceGeography(areas)) {
      let cancelled = false
      resolveReferenceGeography(areas).then(
        (features) => {
          if (!cancelled) setResolved({ source: areas, features })
        },
        (error) => {
          if (!cancelled) setResolved({ source: areas, error })
        }
      )
      return () => {
        cancelled = true
      }
    }

    // Unknown string — warn and pass null
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[semiotic] Unknown areas reference: "${areas}". ` +
          `Supported: "world-110m", "world-50m", "land-110m", "land-50m".`
      )
    }
  }, [areas])

  if (Array.isArray(areas)) return areas
  if (!resolved || resolved.source !== areas) return null
  if ("error" in resolved) throw resolved.error
  return resolved.features
}
