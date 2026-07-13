import { describe, expect, it } from "vitest"
import {
  createLiveDataAdapter,
  createLiveDataProvenance,
  createLiveDataRequestVersioner,
} from "./liveDataAdapter"

describe("live data adapter foundation", () => {
  it("keeps settled data state and contributing-source provenance together", () => {
    const adapter = createLiveDataAdapter({ defaultMessage: "Fixture ready." })
    const snapshot = createLiveDataProvenance({
      kind: "snapshot",
      source: "Bundled fixture",
      capturedAt: "2026-06-26",
      freshness: "fixed replay",
    })
    const live = createLiveDataProvenance({
      kind: "live",
      source: "Current service",
      freshness: "current response",
    })

    const initial = adapter.createDataAdapterState({ provenance: [snapshot] })
    const loading = adapter.transitionDataAdapter(initial, {
      type: "begin-load",
      requestId: 4,
      message: "Loading current data.",
    })
    const stale = adapter.transitionDataAdapter(loading, {
      type: "set-result",
      requestId: 3,
      kind: "live",
      message: "Stale response.",
    })
    const settled = adapter.transitionDataAdapter(loading, {
      type: "set-result",
      requestId: 4,
      kind: "live",
      message: "Current data ready.",
      provenance: [live, snapshot],
    })

    expect(initial).toMatchObject({
      kind: "snapshot",
      isLoading: false,
      message: "Fixture ready.",
      provenance: [snapshot],
    })
    expect(stale).toEqual(loading)
    expect(settled).toMatchObject({
      requestId: 4,
      kind: "live",
      isLoading: false,
      isSlow: false,
      message: "Current data ready.",
      provenance: [live, snapshot],
    })
  })

  it("allows compatibility adapters to retain their prior state shape", () => {
    const adapter = createLiveDataAdapter({
      defaultMessage: "Historical reference ready.",
      includeProvenance: false,
    })

    expect(adapter.createDataAdapterState()).toEqual({
      requestId: 0,
      kind: "snapshot",
      isLoading: false,
      isSlow: false,
      message: "Historical reference ready.",
    })
  })

  it("issues monotonic request versions and rejects stale identifiers", () => {
    const versions = createLiveDataRequestVersioner(6)

    expect(versions.current()).toBe(6)
    expect(versions.next()).toBe(7)
    expect(versions.isCurrent(6)).toBe(false)
    expect(versions.isCurrent(7)).toBe(true)
    expect(versions.isCurrent("7")).toBe(false)
  })
})
