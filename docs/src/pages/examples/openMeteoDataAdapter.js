import { createLiveDataAdapter, LIVE_DATA_KINDS } from "./liveDataAdapter"

export const OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE =
  "A local 1991–2020 reference is ready to explore."

// Preserve the existing Open-Meteo names and state shape while the generic
// adapter becomes available to other examples.
export const OPEN_METEO_DATA_KINDS = LIVE_DATA_KINDS

const openMeteoAdapter = createLiveDataAdapter({
  defaultMessage: OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
  includeProvenance: false,
})

export const createOpenMeteoDataAdapterState = openMeteoAdapter.createDataAdapterState

export const createOpenMeteoPureDataAdapterState = openMeteoAdapter.createPureDataAdapterState

export const transitionOpenMeteoDataAdapter = openMeteoAdapter.transitionDataAdapter

export const transitionOpenMeteoPureDataAdapter = openMeteoAdapter.transitionPureDataAdapter

/**
 * The Open-Meteo pages keep their existing historical presentation labels
 * while their data state is represented by the shared settled-state contract.
 */
export const ADAPTER_KIND_TO_VIEW_KIND = Object.freeze({
  live: "live",
  snapshot: "historical",
  fallback: "historical",
  error: "historical",
})

export function mapAdapterKindToViewKind(kind) {
  const normalizedKind = LIVE_DATA_KINDS.includes(kind) ? kind : "snapshot"
  return ADAPTER_KIND_TO_VIEW_KIND[normalizedKind]
}

export const validateOpenMeteoDataAdapterState = openMeteoAdapter.validateDataAdapterState

export const validateOpenMeteoPureDataAdapterState =
  openMeteoAdapter.validatePureDataAdapterState
