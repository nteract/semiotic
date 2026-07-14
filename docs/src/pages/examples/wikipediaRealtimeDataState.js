import { createLiveDataAdapter, createLiveDataProvenance } from "./liveDataAdapter"

export const WIKIPEDIA_STREAM_DATA_ADAPTER = createLiveDataAdapter({
  defaultMessage: "Waiting for the Wikimedia EventStreams connection.",
})

export const WIKIPEDIA_ENRICHMENT_DATA_ADAPTER = createLiveDataAdapter({
  defaultMessage: "Editor groups use the event payload until the users API responds.",
})

export function createInitialWikipediaStreamState() {
  return WIKIPEDIA_STREAM_DATA_ADAPTER.createDataAdapterState({
    kind: "error",
    isLoading: true,
    message: "Connecting to Wikimedia EventStreams.",
    provenance: [],
  })
}

export function createWikipediaStreamLiveProvenance() {
  return createLiveDataProvenance({
    kind: "live",
    source: "Wikimedia EventStreams recentchange",
    sourceUrl: "https://stream.wikimedia.org/v2/stream/recentchange",
    freshness: "Live EventSource connection",
  })
}

export function createWikipediaStreamUnavailableProvenance() {
  return createLiveDataProvenance({
    kind: "error",
    source: "Wikimedia EventStreams recentchange",
    sourceUrl: "https://stream.wikimedia.org/v2/stream/recentchange",
    freshness: "No active EventSource connection",
    availability: "unavailable",
  })
}

export function createInitialWikipediaEnrichmentState() {
  return WIKIPEDIA_ENRICHMENT_DATA_ADAPTER.createDataAdapterState({
    kind: "fallback",
    message: "Editor groups use the event payload until the users API responds.",
    provenance: [createWikipediaEnrichmentFallbackProvenance()],
  })
}

export function createWikipediaEnrichmentLiveProvenance() {
  return createLiveDataProvenance({
    kind: "live",
    source: "MediaWiki users API",
    sourceUrl: "https://en.wikipedia.org/w/api.php",
    freshness: "Current browser response",
  })
}

export function createWikipediaEnrichmentFallbackProvenance() {
  return createLiveDataProvenance({
    kind: "fallback",
    source: "Browser-side editor classification fallback",
    freshness: "Used when the MediaWiki users API is unavailable",
  })
}
