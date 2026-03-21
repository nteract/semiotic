"use client"
import { useMemo } from "react"
import { useObservationSelector } from "./ObservationStore"
import type { ChartObservation, ObservationStoreState } from "./ObservationStore"

export interface UseChartObserverOptions {
  /** Max observations to return (default 50) */
  limit?: number
  /** Filter by observation type(s) */
  types?: ChartObservation["type"][]
  /** Filter by chart instance id */
  chartId?: string
}

export interface UseChartObserverResult {
  /** Recent observations (newest last), filtered by options */
  observations: ChartObservation[]
  /** Latest observation matching the filter, or null */
  latest: ChartObservation | null
  /** Clear all observations in the store */
  clear: () => void
}

export function useChartObserver(
  options: UseChartObserverOptions = {}
): UseChartObserverResult {
  const { limit = 50, types, chartId } = options

  // Subscribe to version (cheap number comparison) rather than the array
  const version = useObservationSelector(
    (state: ObservationStoreState) => state.version
  )

  const allObservations = useObservationSelector(
    (state: ObservationStoreState) => state.observations
  )

  const clearObservations = useObservationSelector(
    (state: ObservationStoreState) => state.clearObservations
  )

  const filtered = useMemo(() => {
    let result = allObservations

    if (types && types.length > 0) {
      const typeSet = new Set(types)
      result = result.filter(o => typeSet.has(o.type))
    }

    if (chartId) {
      result = result.filter(o => o.chartId === chartId)
    }

    if (result.length > limit) {
      result = result.slice(result.length - limit)
    }

    return result
    // version triggers recompute when new observations are pushed
  }, [allObservations, types, chartId, limit, version])

  const latest = filtered.length > 0 ? filtered[filtered.length - 1] : null

  return { observations: filtered, latest, clear: clearObservations }
}
