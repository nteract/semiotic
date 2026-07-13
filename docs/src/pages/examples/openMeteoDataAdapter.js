export const OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE =
  "A local 1991–2020 reference is ready to explore."

/**
 * These are the durable data states exposed by the example contract. Loading
 * is deliberately modeled as a transient flag, rather than a fifth data kind:
 * aborting a request can then preserve the last useful live/snapshot/fallback
 * or error state instead of leaving the UI in a contradictory `loading` state.
 */
export const OPEN_METEO_DATA_KINDS = Object.freeze([
  "live",
  "snapshot",
  "fallback",
  "error",
])

const OPEN_METEO_DATA_KIND_SET = new Set(OPEN_METEO_DATA_KINDS)

function normalizeKind(kind) {
  return OPEN_METEO_DATA_KIND_SET.has(kind) ? kind : "snapshot"
}

function normalizeBoolean(value) {
  return typeof value === "boolean" ? value : false
}

function normalizeRequestId(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function normalizeMessage(value) {
  return typeof value === "string" ? value : OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE
}

/**
 * State for the shared Open-Meteo example adapter. `kind` always reports the
 * last settled data state. `isLoading` and `isSlow` report the active request
 * without obscuring a usable previous snapshot.
 */
export function createOpenMeteoDataAdapterState({
  requestId = 0,
  message = OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
  kind = "snapshot",
  isLoading = false,
  isSlow = false,
} = {}) {
  const loading = normalizeBoolean(isLoading)
  return {
    requestId: normalizeRequestId(requestId),
    kind: normalizeKind(kind),
    isLoading: loading,
    isSlow: loading && normalizeBoolean(isSlow),
    message: normalizeMessage(message),
  }
}

/**
 * The pure form is useful for tests, fixture replay, and non-React consumers
 * that need the canonical four-state result but no active request bookkeeping.
 */
export function createOpenMeteoPureDataAdapterState({
  kind = "snapshot",
  message = OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
} = {}) {
  return {
    kind: normalizeKind(kind),
    message: normalizeMessage(message),
  }
}

export function transitionOpenMeteoDataAdapter(state, action = {}) {
  const current = validateOpenMeteoDataAdapterState(state)

  switch (action.type) {
    case "begin-load":
      return {
        ...current,
        requestId: normalizeRequestId(action.requestId),
        isLoading: true,
        isSlow: false,
        message: normalizeMessage(action.message),
      }
    case "abort-load":
      if (normalizeRequestId(action.requestId) !== current.requestId) return current
      return {
        ...current,
        isLoading: false,
        isSlow: false,
      }
    case "set-slow":
      if (normalizeRequestId(action.requestId) !== current.requestId || !current.isLoading) {
        return current
      }
      return {
        ...current,
        isSlow: true,
      }
    case "set-result":
      if (
        normalizeRequestId(action.requestId) !== current.requestId ||
        (!current.isLoading && action.forceUpdate !== true)
      ) {
        return current
      }
      return {
        ...current,
        isLoading: false,
        isSlow: false,
        kind: normalizeKind(action.kind ?? current.kind),
        message: normalizeMessage(action.message ?? current.message),
      }
    case "set-view":
      if (
        action.requestId !== undefined &&
        normalizeRequestId(action.requestId) !== current.requestId
      ) {
        return current
      }
      return {
        ...current,
        kind: normalizeKind(action.kind ?? current.kind),
        isLoading: false,
        isSlow: false,
        message: normalizeMessage(action.message ?? current.message),
      }
    case "set-message":
      if (
        action.requestId !== undefined &&
        normalizeRequestId(action.requestId) !== current.requestId
      ) {
        return current
      }
      return {
        ...current,
        message: normalizeMessage(action.message),
      }
    default:
      return current
  }
}

export function transitionOpenMeteoPureDataAdapter(state, action = {}) {
  const current = validateOpenMeteoPureDataAdapterState(state)
  switch (action.type) {
    case "set-result":
    case "set-view":
      return {
        ...current,
        kind: normalizeKind(action.kind ?? current.kind),
        message: normalizeMessage(action.message ?? current.message),
      }
    case "set-message":
      return {
        ...current,
        message: normalizeMessage(action.message),
      }
    default:
      return current
  }
}

export const ADAPTER_KIND_TO_VIEW_KIND = Object.freeze({
  live: "live",
  snapshot: "historical",
  fallback: "historical",
  error: "historical",
})

export function mapAdapterKindToViewKind(kind) {
  return ADAPTER_KIND_TO_VIEW_KIND[normalizeKind(kind)]
}

/**
 * Validate adapter state at the docs boundary without adding a runtime schema
 * dependency to the example bundle. Invalid booleans are rejected rather than
 * coerced so malformed serialized state cannot claim an active load.
 */
export function validateOpenMeteoDataAdapterState(state) {
  return createOpenMeteoDataAdapterState({
    requestId: state?.requestId,
    kind: state?.kind,
    isLoading: state?.isLoading,
    isSlow: state?.isSlow,
    message: state?.message,
  })
}

export function validateOpenMeteoPureDataAdapterState(state) {
  return createOpenMeteoPureDataAdapterState({
    kind: state?.kind,
    message: state?.message,
  })
}
