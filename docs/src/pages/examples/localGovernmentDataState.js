import { createLiveDataAdapter, createLiveDataProvenance } from "./liveDataAdapter"

export const LOCAL_GOVERNMENT_SOURCE_KEYS = Object.freeze([
  "zip",
  "locus",
  "legistar",
  "fema",
  "spending",
  "civic",
])

const SOURCE_META = {
  zip: [
    {
      label: "Postal place",
      source: "Zippopotam.us / GeoNames",
      sourceUrl: "https://api.zippopotam.us",
    },
  ],
  locus: [
    {
      label: "Codified law",
      source: "LOCUS municipal law corpus",
      sourceUrl: "https://huggingface.co/datasets/LocalLaws/LOCUS-v1",
    },
  ],
  legistar: [
    {
      label: "Current activity",
      source: "Legistar public records",
      sourceUrl: "https://webapi.legistar.com",
    },
  ],
  fema: [
    {
      label: "County disaster record",
      source: "FCC Census Area API",
      sourceUrl: "https://geo.fcc.gov/api/census/area",
    },
    {
      label: "County disaster record",
      source: "OpenFEMA",
      sourceUrl: "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries",
    },
  ],
  spending: [
    {
      label: "Federal spending",
      source: "FCC Census Area API",
      sourceUrl: "https://geo.fcc.gov/api/census/area",
    },
    {
      label: "Federal spending",
      source: "USAspending.gov",
      sourceUrl: "https://api.usaspending.gov",
    },
  ],
  civic: [
    {
      label: "Local 311 signals",
      source: "City open-data portal",
      sourceUrl: null,
    },
  ],
}

export const LOCAL_GOVERNMENT_SOURCE_DATA_ADAPTER = createLiveDataAdapter({
  defaultMessage: "Waiting for source data.",
})

function sourceMeta(source) {
  return SOURCE_META[source] || []
}

function isSource(source) {
  return LOCAL_GOVERNMENT_SOURCE_KEYS.includes(source)
}

export function localGovernmentDataKindForStatus(status) {
  if (status === "live" || status === "snapshot" || status === "fallback") return status
  if (status === "no-match") return "live"
  return "error"
}

function availabilityForStatus(status) {
  if (status === "unavailable" || status === "no-match") return status
  return "available"
}

export function localGovernmentSourceMessage(source, status) {
  const label = sourceMeta(source)[0]?.label || "Source"
  return label + ": " + status + "."
}

export function createLocalGovernmentSourceProvenance(
  source,
  {
    status = "live",
    sourceLabel = null,
    sourceUrl = null,
    capturedAt = null,
    freshness = null,
  } = {},
) {
  const descriptors = sourceLabel
    ? [{ source: sourceLabel, sourceUrl }]
    : sourceMeta(source)
  const kind = localGovernmentDataKindForStatus(status)
  const availability = availabilityForStatus(status)

  return descriptors.map((descriptor) =>
    createLiveDataProvenance({
      kind,
      source: descriptor.source,
      sourceUrl: sourceUrl || descriptor.sourceUrl,
      capturedAt,
      freshness:
        freshness ||
        (status === "snapshot"
          ? "Bundled source snapshot"
          : status === "fallback"
            ? "Bundled fallback"
            : status === "unavailable"
              ? "No browser-readable source is configured"
              : "Current browser response"),
      availability,
    }),
  )
}

function createLocalGovernmentSourceState(source) {
  return {
    phase: "idle",
    data: LOCAL_GOVERNMENT_SOURCE_DATA_ADAPTER.createDataAdapterState({
      kind: "error",
      message: localGovernmentSourceMessage(source, "idle"),
      provenance: [],
    }),
  }
}

export function createLocalGovernmentSourceStates() {
  return Object.fromEntries(
    LOCAL_GOVERNMENT_SOURCE_KEYS.map((source) => [
      source,
      createLocalGovernmentSourceState(source),
    ]),
  )
}

export function transitionLocalGovernmentSourceStates(states, action = {}) {
  if (action.type === "reset-all") return createLocalGovernmentSourceStates()
  if (!isSource(action.source)) return states

  const current = states[action.source] || createLocalGovernmentSourceState(action.source)
  if (action.type === "begin-load") {
    return {
      ...states,
      [action.source]: {
        phase: "active",
        data: LOCAL_GOVERNMENT_SOURCE_DATA_ADAPTER.transitionDataAdapter(
          current.data,
          action,
        ),
      },
    }
  }

  if (action.type === "set-result") {
    const requestId = Number.isFinite(action.requestId) ? action.requestId : 0
    if (
      requestId !== current.data.requestId ||
      (!current.data.isLoading && action.forceUpdate !== true)
    ) {
      return states
    }
    return {
      ...states,
      [action.source]: {
        phase: "settled",
        data: LOCAL_GOVERNMENT_SOURCE_DATA_ADAPTER.transitionDataAdapter(
          current.data,
          action,
        ),
      },
    }
  }

  return states
}

export function localGovernmentSourceStatus(sourceState) {
  if (!sourceState || sourceState.phase === "idle") return "idle"
  if (sourceState.data.isLoading) return "loading"

  const availability = sourceState.data.provenance.find(
    (entry) => entry.availability === "unavailable" || entry.availability === "no-match",
  )?.availability
  if (availability) return availability
  return sourceState.data.kind
}

export function localGovernmentSourceStatuses(states) {
  return Object.fromEntries(
    LOCAL_GOVERNMENT_SOURCE_KEYS.map((source) => [
      source,
      localGovernmentSourceStatus(states[source]),
    ]),
  )
}
