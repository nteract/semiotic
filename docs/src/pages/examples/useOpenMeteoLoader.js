import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { fetchOpenMeteoExampleData } from "./openMeteoExampleData"
import { createLiveDataRequestVersioner } from "./liveDataAdapter"
import {
  ADAPTER_KIND_TO_VIEW_KIND,
  createOpenMeteoDataAdapterState,
  transitionOpenMeteoDataAdapter,
  OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
} from "./openMeteoDataAdapter"

export const HISTORICAL_READY_MESSAGE = OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE

const SLOW_TIMEOUT_MS = 2500
const REQUEST_TIMEOUT_MS = 10_000

function mapViewKindToAdapterKind(kind = "historical") {
  if (kind === "live") return "live"
  return "snapshot"
}

function mapAdapterStateToView(adapterState) {
  return {
    kind: adapterState.isLoading
      ? "loading"
      : ADAPTER_KIND_TO_VIEW_KIND[adapterState.kind] ?? "historical",
    dataKind: adapterState.kind,
    message: adapterState.message,
  }
}

function defaultCacheKey(profile) {
  if (typeof profile?.id === "string" && profile.id.trim()) return profile.id
  const latitude = Number(profile?.lat)
  const longitude = Number(profile?.lon)
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `${latitude.toFixed(3)},${longitude.toFixed(3)}`
  }
  return null
}

/**
 * The shared Open-Meteo loading state machine behind the Climate example
 * pages, extracted so request lifecycle can be tested independent of UI.
 */
export function useOpenMeteoLoader({
  initialProfile,
  buildFallback,
  fallbackKey,
  profileFromCoordinates,
  loadingMessage,
  locationLoadingMessage,
  liveMessage,
  failureMessage,
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
  cacheKey = defaultCacheKey,
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [liveData, setLiveData] = useState(null)
  const [adapterState, dispatch] = useReducer(
    transitionOpenMeteoDataAdapter,
    createOpenMeteoDataAdapterState(),
  )
  const requestRef = useRef(null)
  const requestVersionerRef = useRef(null)
  if (!requestVersionerRef.current) {
    requestVersionerRef.current = createLiveDataRequestVersioner()
  }
  const slowTimerRef = useRef(null)
  const timeoutTimerRef = useRef(null)
  const dataCacheRef = useRef(new Map())

  useEffect(() => {
    return () => {
      requestRef.current?.controller?.abort()
      clearActiveLoadTimers()
    }
  }, [])

  function clearActiveLoadTimers() {
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
    }
    if (timeoutTimerRef.current) {
      window.clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = null
    }
  }

  function isCurrentRequest(requestId) {
    return Boolean(requestRef.current && requestRef.current.requestId === requestId)
  }

  function beginLoad(message) {
    requestRef.current?.controller.abort()
    clearActiveLoadTimers()

    const nextId = requestVersionerRef.current.next()
    const controller = new AbortController()
    const nextRequest = { requestId: nextId, controller, timedOut: false }
    requestRef.current = nextRequest

    dispatch({
      type: "begin-load",
      requestId: nextId,
      message,
    })

    slowTimerRef.current = window.setTimeout(() => {
      if (isCurrentRequest(nextId)) dispatch({ type: "set-slow", requestId: nextId })
    }, SLOW_TIMEOUT_MS)

    if (Number.isFinite(requestTimeoutMs) && requestTimeoutMs > SLOW_TIMEOUT_MS) {
      timeoutTimerRef.current = window.setTimeout(() => {
        if (!isCurrentRequest(nextId)) return
        nextRequest.timedOut = true
        nextRequest.controller.abort()
      }, requestTimeoutMs)
    }

    return nextRequest
  }

  function endLoad(requestId) {
    if (!isCurrentRequest(requestId)) return false
    const request = requestRef.current
    clearActiveLoadTimers()
    requestRef.current = null
    return request
  }

  function abortLoad() {
    const request = requestRef.current
    if (!request) return
    request.controller.abort()
    requestRef.current = null
    dispatch({ type: "abort-load", requestId: request.requestId })
    clearActiveLoadTimers()
  }

  function normalizeLoadContext(existingRequest) {
    if (
      existingRequest?.controller &&
      existingRequest.requestId != null &&
      isCurrentRequest(existingRequest.requestId)
    ) {
      return existingRequest
    }
    return beginLoad(loadingMessage)
  }

  function cacheCurrentData(nextProfile, data) {
    const key = cacheKey(nextProfile)
    if (key != null) dataCacheRef.current.set(key, data)
  }

  function readCachedData(nextProfile) {
    const key = cacheKey(nextProfile)
    return key == null ? undefined : dataCacheRef.current.get(key)
  }

  async function loadCurrentData(nextProfile, existingLoad) {
    const load = normalizeLoadContext(existingLoad)
    setProfile(nextProfile)
    setLiveData(null)

    try {
      const data = await fetchOpenMeteoExampleData(nextProfile, {
        signal: load.controller.signal,
        [fallbackKey]: buildFallback(nextProfile),
      })

      if (!endLoad(load.requestId)) return
      cacheCurrentData(nextProfile, data)
      dispatch({
        type: "set-result",
        requestId: load.requestId,
        // The response still contains live observations when its historical
        // baseline falls back to a bundled reference. Reserve `fallback` for
        // a cached/local response used after the request itself fails.
        kind: "live",
        message: liveMessage(data),
      })
      setLiveData(data)
    } catch (error) {
      const completedRequest = endLoad(load.requestId)
      if (!completedRequest) return
      if (error?.name === "AbortError" && !completedRequest.timedOut) return

      const cached = readCachedData(nextProfile)
      if (cached) {
        dispatch({
          type: "set-result",
          requestId: load.requestId,
          kind: "fallback",
          message: `${failureMessage} Showing the last cached response instead.`,
        })
        setLiveData(cached)
        return
      }

      dispatch({
        type: "set-result",
        requestId: load.requestId,
        kind: "error",
        message: failureMessage,
      })
    }
  }

  function showHistorical(
    nextProfile,
    message = OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
  ) {
    abortLoad()
    setProfile(nextProfile)
    setLiveData(null)
    dispatch({
      type: "set-view",
      requestId: requestRef.current?.requestId,
      kind: "snapshot",
      message,
    })
  }

  function replayFixture(
    nextProfile = profile,
    message = OPEN_METEO_DEFAULT_HISTORICAL_MESSAGE,
  ) {
    showHistorical(nextProfile, message)
  }

  function requestBrowserLocation() {
    if (!navigator.geolocation) {
      dispatch({
        type: "set-view",
        kind: liveData ? "live" : "snapshot",
        message: "Browser geolocation is not available.",
      })
      return
    }

    const load = beginLoad(locationLoadingMessage)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isCurrentRequest(load.requestId)) return
        const { latitude, longitude } = position.coords
        loadCurrentData(profileFromCoordinates(latitude, longitude), load)
      },
      () => {
        if (!endLoad(load.requestId)) return
        dispatch({
          type: "set-view",
          kind: liveData ? "live" : "snapshot",
          message: "Location permission was not granted. The previous data remains in view.",
        })
      },
      { maximumAge: 60_000, timeout: 6_000 },
    )
  }

  function setView(view) {
    // A manual view choice supersedes any in-flight response. Without this,
    // a late request can update `liveData` after the reducer has already
    // switched to snapshot/fallback, leaving the chart and its status banner
    // describing different data sources.
    abortLoad()
    const nextKind = mapViewKindToAdapterKind(view.kind)
    dispatch({
      type: "set-view",
      kind: nextKind,
      message: view.message,
    })
  }

  const view = useMemo(() => mapAdapterStateToView(adapterState), [adapterState])

  return {
    profile,
    liveData,
    view,
    setView,
    isSlow: adapterState.isSlow,
    isLoading: adapterState.isLoading,
    showHistorical,
    replayFixture,
    loadCurrentData,
    requestBrowserLocation,
  }
}
