import type { Datum } from "../shared/datumTypes"

/**
 * Resolve ring-buffer capacity for bounded data and ref-based push mode.
 * An explicit windowSize wins. Otherwise max(data.length, 200) retains all
 * bounded rows and supplies a 200-row streaming window when data is absent.
 */
export function resolveRealtimeWindowSize(
  windowSizeProp: number | undefined,
  data: Datum[] | undefined,
  capacityProp?: number,
): number {
  const explicit = windowSizeProp ?? capacityProp
  if (explicit != null) return explicit
  return Math.max(data?.length ?? 0, 200)
}
