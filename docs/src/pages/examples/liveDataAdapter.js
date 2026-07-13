export const LIVE_DATA_KINDS = Object.freeze([
  "live",
  "snapshot",
  "fallback",
  "error",
])

export const LIVE_DATA_AVAILABILITY = Object.freeze([
  "available",
  "unavailable",
  "no-match",
])

export const DEFAULT_LIVE_DATA_MESSAGE = "A bundled data snapshot is ready to explore."

const LIVE_DATA_KIND_SET = new Set(LIVE_DATA_KINDS)
const LIVE_DATA_AVAILABILITY_SET = new Set(LIVE_DATA_AVAILABILITY)

function hasValidRequestId(value) {
  return Number.isFinite(value) && value >= 0
}

function normalizeKind(kind, defaultKind) {
  return LIVE_DATA_KIND_SET.has(kind) ? kind : defaultKind
}

function normalizeBoolean(value) {
  return typeof value === "boolean" ? value : false
}

function normalizeRequestId(value) {
  return hasValidRequestId(value) ? value : 0
}

function normalizeMessage(value, defaultMessage) {
  return typeof value === "string" ? value : defaultMessage
}

function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim() ? value : null
}

function normalizeAvailability(value) {
  return LIVE_DATA_AVAILABILITY_SET.has(value) ? value : "available"
}

/**
 * One provenance record describes one contributing source. A response that
 * mixes a live service with a checked-in fixture can keep both records instead
 * of presenting the combined result as one undifferentiated source.
 */
export function createLiveDataProvenance({
  kind = "snapshot",
  source = null,
  sourceUrl = null,
  capturedAt = null,
  freshness = null,
  availability = "available",
} = {}) {
  return {
    kind: normalizeKind(kind, "snapshot"),
    source: normalizeOptionalString(source),
    sourceUrl: normalizeOptionalString(sourceUrl),
    capturedAt: normalizeOptionalString(capturedAt),
    freshness: normalizeOptionalString(freshness),
    availability: normalizeAvailability(availability),
  }
}

function normalizeProvenance(value) {
  const entries = Array.isArray(value) ? value : value ? [value] : []
  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => createLiveDataProvenance(entry))
}

/**
 * Creates a settled-state reducer for browser data examples. Loading remains
 * transient so an aborted request can retain the last settled data kind.
 * Consumers can opt out of the provenance field while migrating legacy state
 * shapes without weakening the shared state machine.
 */
export function createLiveDataAdapter({
  defaultMessage = DEFAULT_LIVE_DATA_MESSAGE,
  defaultKind = "snapshot",
  includeProvenance = true,
} = {}) {
  const normalizedDefaultMessage = normalizeMessage(defaultMessage, DEFAULT_LIVE_DATA_MESSAGE)
  const normalizedDefaultKind = normalizeKind(defaultKind, "snapshot")
  const supportsProvenance = includeProvenance === true

  function withProvenance(state, provenance) {
    if (!supportsProvenance) return state
    return {
      ...state,
      provenance: normalizeProvenance(provenance),
    }
  }

  function createDataAdapterState({
    requestId = 0,
    message = normalizedDefaultMessage,
    kind = normalizedDefaultKind,
    isLoading = false,
    isSlow = false,
    provenance,
  } = {}) {
    const loading = normalizeBoolean(isLoading)
    return withProvenance(
      {
        requestId: normalizeRequestId(requestId),
        kind: normalizeKind(kind, normalizedDefaultKind),
        isLoading: loading,
        isSlow: loading && normalizeBoolean(isSlow),
        message: normalizeMessage(message, normalizedDefaultMessage),
      },
      provenance,
    )
  }

  function createPureDataAdapterState({
    kind = normalizedDefaultKind,
    message = normalizedDefaultMessage,
    provenance,
  } = {}) {
    return withProvenance(
      {
        kind: normalizeKind(kind, normalizedDefaultKind),
        message: normalizeMessage(message, normalizedDefaultMessage),
      },
      provenance,
    )
  }

  function validateDataAdapterState(state) {
    return createDataAdapterState({
      requestId: state?.requestId,
      kind: state?.kind,
      isLoading: state?.isLoading,
      isSlow: state?.isSlow,
      message: state?.message,
      provenance: state?.provenance,
    })
  }

  function validatePureDataAdapterState(state) {
    return createPureDataAdapterState({
      kind: state?.kind,
      message: state?.message,
      provenance: state?.provenance,
    })
  }

  function nextProvenance(current, action) {
    return action.provenance === undefined ? current.provenance : action.provenance
  }

  function transitionDataAdapter(state, action = {}) {
    const current = validateDataAdapterState(state)

    switch (action.type) {
      case "begin-load":
        return {
          ...current,
          requestId: normalizeRequestId(action.requestId),
          isLoading: true,
          isSlow: false,
          message: normalizeMessage(action.message, normalizedDefaultMessage),
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
        return withProvenance(
          {
            ...current,
            isLoading: false,
            isSlow: false,
            kind: normalizeKind(action.kind ?? current.kind, normalizedDefaultKind),
            message: normalizeMessage(action.message ?? current.message, normalizedDefaultMessage),
          },
          nextProvenance(current, action),
        )
      case "set-view":
        if (
          action.requestId !== undefined &&
          normalizeRequestId(action.requestId) !== current.requestId
        ) {
          return current
        }
        return withProvenance(
          {
            ...current,
            kind: normalizeKind(action.kind ?? current.kind, normalizedDefaultKind),
            isLoading: false,
            isSlow: false,
            message: normalizeMessage(action.message ?? current.message, normalizedDefaultMessage),
          },
          nextProvenance(current, action),
        )
      case "set-message":
        if (
          action.requestId !== undefined &&
          normalizeRequestId(action.requestId) !== current.requestId
        ) {
          return current
        }
        return {
          ...current,
          message: normalizeMessage(action.message, normalizedDefaultMessage),
        }
      case "set-provenance":
        if (
          action.requestId !== undefined &&
          normalizeRequestId(action.requestId) !== current.requestId
        ) {
          return current
        }
        return withProvenance(current, action.provenance)
      default:
        return current
    }
  }

  function transitionPureDataAdapter(state, action = {}) {
    const current = validatePureDataAdapterState(state)

    switch (action.type) {
      case "set-result":
      case "set-view":
        return withProvenance(
          {
            ...current,
            kind: normalizeKind(action.kind ?? current.kind, normalizedDefaultKind),
            message: normalizeMessage(action.message ?? current.message, normalizedDefaultMessage),
          },
          nextProvenance(current, action),
        )
      case "set-message":
        return {
          ...current,
          message: normalizeMessage(action.message, normalizedDefaultMessage),
        }
      case "set-provenance":
        return withProvenance(current, action.provenance)
      default:
        return current
    }
  }

  return Object.freeze({
    createDataAdapterState,
    createPureDataAdapterState,
    transitionDataAdapter,
    transitionPureDataAdapter,
    validateDataAdapterState,
    validatePureDataAdapterState,
  })
}

/**
 * Keeps monotonically increasing request identifiers separate from a concrete
 * transport. Hooks can still own AbortControllers, streams, or fan-out work.
 */
export function createLiveDataRequestVersioner(initialRequestId = 0) {
  let currentRequestId = normalizeRequestId(initialRequestId)

  return Object.freeze({
    current() {
      return currentRequestId
    },
    next() {
      currentRequestId += 1
      return currentRequestId
    },
    isCurrent(requestId) {
      return hasValidRequestId(requestId) && requestId === currentRequestId
    },
  })
}
