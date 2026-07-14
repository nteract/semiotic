import { describe, expect, it } from "vitest"
import {
  createInitialWikipediaEnrichmentState,
  createInitialWikipediaStreamState,
  createWikipediaEnrichmentFallbackProvenance,
  createWikipediaEnrichmentLiveProvenance,
  createWikipediaStreamLiveProvenance,
  WIKIPEDIA_ENRICHMENT_DATA_ADAPTER,
  WIKIPEDIA_STREAM_DATA_ADAPTER,
} from "./wikipediaRealtimeDataState"

describe("Wikipedia realtime data state", () => {
  it("settles the EventSource independently as live data", () => {
    const loading = WIKIPEDIA_STREAM_DATA_ADAPTER.transitionDataAdapter(
      createInitialWikipediaStreamState(),
      {
        type: "begin-load",
        requestId: 1,
        message: "Connecting to Wikimedia EventStreams.",
      },
    )
    const settled = WIKIPEDIA_STREAM_DATA_ADAPTER.transitionDataAdapter(loading, {
      type: "set-result",
      requestId: 1,
      kind: "live",
      message: "Receiving Wikimedia edits.",
      provenance: [createWikipediaStreamLiveProvenance()],
    })

    expect(settled).toMatchObject({
      kind: "live",
      isLoading: false,
      provenance: [{ source: "Wikimedia EventStreams recentchange", kind: "live" }],
    })
  })

  it("keeps user-group enrichment as a separate fallback when its API fails", () => {
    const loading = WIKIPEDIA_ENRICHMENT_DATA_ADAPTER.transitionDataAdapter(
      createInitialWikipediaEnrichmentState(),
      {
        type: "begin-load",
        requestId: 2,
        message: "Resolving editor groups.",
      },
    )
    const settled = WIKIPEDIA_ENRICHMENT_DATA_ADAPTER.transitionDataAdapter(loading, {
      type: "set-result",
      requestId: 2,
      kind: "fallback",
      message: "Using browser-side editor classification.",
      provenance: [createWikipediaEnrichmentFallbackProvenance()],
    })

    expect(settled).toMatchObject({
      kind: "fallback",
      isLoading: false,
      provenance: [
        {
          source: "Browser-side editor classification fallback",
          kind: "fallback",
        },
      ],
    })
    expect(createWikipediaEnrichmentLiveProvenance().kind).toBe("live")
  })
})
