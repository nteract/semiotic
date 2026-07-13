import { describe, expect, it } from "vitest"
import {
  OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
  createOpenMeteoPureDataAdapterState,
  transitionOpenMeteoPureDataAdapter,
  validateOpenMeteoPureDataAdapterState,
  createOpenMeteoDataAdapterState,
  mapAdapterKindToViewKind,
  transitionOpenMeteoDataAdapter,
  validateOpenMeteoDataAdapterState,
} from "./openMeteoDataAdapter"

function beginLoad(state, requestId, message = "Loading") {
  return transitionOpenMeteoDataAdapter(state, {
    type: "begin-load",
    requestId,
    message,
  })
}

function settleLoad(state, requestId, kind, message) {
  return transitionOpenMeteoDataAdapter(state, {
    type: "set-result",
    requestId,
    kind,
    message,
  })
}

describe("openMeteoDataAdapter state transitions", () => {
  it("starts with a validated snapshot baseline", () => {
    expect(createOpenMeteoDataAdapterState()).toEqual({
      requestId: 0,
      kind: "snapshot",
      isLoading: false,
      isSlow: false,
      message: OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
    })
  })

  it("tracks loading separately from its last settled data kind", () => {
    const state = beginLoad(createOpenMeteoDataAdapterState({ kind: "live" }), 7)

    expect(state).toEqual({
      requestId: 7,
      kind: "live",
      isLoading: true,
      isSlow: false,
      message: "Loading",
    })
  })

  it("marks slow loads only for active requests", () => {
    const loading = beginLoad(createOpenMeteoDataAdapterState(), 12)
    const ignored = transitionOpenMeteoDataAdapter(loading, {
      type: "set-slow",
      requestId: 3,
    })

    expect(ignored.isSlow).toBe(false)

    const flagged = transitionOpenMeteoDataAdapter(loading, {
      type: "set-slow",
      requestId: 12,
    })
    expect(flagged.isSlow).toBe(true)
  })

  it("transitions active result payloads to live, fallback, or error", () => {
    const live = settleLoad(beginLoad(createOpenMeteoDataAdapterState(), 3), 3, "live", "Live")
    const fallback = settleLoad(beginLoad(live, 4), 4, "fallback", "Using cached baseline")
    const error = settleLoad(beginLoad(fallback, 5), 5, "error", "Open-Meteo unavailable")

    expect(live).toMatchObject({ kind: "live", isLoading: false, isSlow: false })
    expect(fallback).toMatchObject({ kind: "fallback", isLoading: false })
    expect(error).toMatchObject({ kind: "error", message: "Open-Meteo unavailable" })
  })

  it("ignores stale or terminal result updates and preserves settled data after abort", () => {
    const loading = beginLoad(createOpenMeteoDataAdapterState({ kind: "live" }), 10)
    const stale = settleLoad(loading, 7, "fallback", "stale")
    const aborted = transitionOpenMeteoDataAdapter(loading, {
      type: "abort-load",
      requestId: 10,
    })
    const terminal = settleLoad(aborted, 10, "error", "too late")

    expect(stale).toEqual(loading)
    expect(aborted).toMatchObject({ kind: "live", isLoading: false, isSlow: false })
    expect(terminal).toEqual(aborted)
  })

  it("supports view-kind mapping for the legacy docs presentation", () => {
    expect(mapAdapterKindToViewKind("live")).toBe("live")
    expect(mapAdapterKindToViewKind("snapshot")).toBe("historical")
    expect(mapAdapterKindToViewKind("fallback")).toBe("historical")
    expect(mapAdapterKindToViewKind("error")).toBe("historical")
    expect(mapAdapterKindToViewKind("loading")).toBe("historical")
  })

  it("provides a pure live/snapshot/fallback/error adapter state machine", () => {
    const initial = createOpenMeteoPureDataAdapterState()
    const live = transitionOpenMeteoPureDataAdapter(initial, {
      type: "set-result",
      kind: "live",
      message: "Live baseline",
    })
    const fallback = transitionOpenMeteoPureDataAdapter(live, {
      type: "set-view",
      kind: "fallback",
      message: "No live source; showing baseline",
    })
    const error = transitionOpenMeteoPureDataAdapter(fallback, {
      type: "set-view",
      kind: "error",
      message: "Live service unavailable",
    })

    expect(initial).toEqual({
      kind: "snapshot",
      message: OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
    })
    expect(live).toMatchObject({ kind: "live", message: "Live baseline" })
    expect(fallback).toMatchObject({ kind: "fallback" })
    expect(error).toEqual({ kind: "error", message: "Live service unavailable" })
  })

  it("validates malformed state defensively without coercing truthy values", () => {
    const sanitized = validateOpenMeteoDataAdapterState({
      requestId: "bad",
      kind: "unknown",
      isLoading: "true",
      isSlow: 1,
      message: null,
    })
    const pure = validateOpenMeteoPureDataAdapterState({
      kind: "error",
      message: null,
      unexpected: true,
    })

    expect(sanitized).toEqual({
      requestId: 0,
      kind: "snapshot",
      isLoading: false,
      isSlow: false,
      message: OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
    })
    expect(pure).toEqual({ kind: "error", message: OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE })
  })
})
