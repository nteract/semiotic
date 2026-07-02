import { useEffect, useRef, useState } from "react"
import { fetchOpenMeteoExampleData } from "./openMeteoExampleData"

export const HISTORICAL_READY_MESSAGE = "A local 1991–2020 reference is ready to explore."

/**
 * The shared Open-Meteo loading state machine behind the two Climate example
 * pages (Point Climate Anomaly, Point Climate Radial): abortable request
 * lifecycle, a slow-request escalation after 2.5s, the historical-fallback
 * path, and browser geolocation. The pages keep what genuinely differs —
 * their fallback generators, their coordinate→profile mappings, and their
 * banner/controls art direction — and pass those in.
 *
 * @param {object} options
 * @param {object} options.initialProfile        First preset profile.
 * @param {(profile) => unknown} options.buildFallback  Local fallback payload for a profile.
 * @param {string} options.fallbackKey           Option key `fetchOpenMeteoExampleData`
 *                                               expects the fallback under
 *                                               (`"fallbackClimateRows"` / `"fallbackWeather"`).
 * @param {(lat, lon) => object} options.profileFromCoordinates  Page-specific mapping.
 * @param {string} options.loadingMessage        Copy while a direct load is in flight.
 * @param {string} options.locationLoadingMessage Copy while waiting on geolocation.
 * @param {(data) => string} options.liveMessage  Copy for a successful live load.
 * @param {string} options.failureMessage        Copy when Open-Meteo is unavailable.
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
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [liveData, setLiveData] = useState(null)
  const [view, setView] = useState({ kind: "historical", message: HISTORICAL_READY_MESSAGE })
  const [isSlow, setIsSlow] = useState(false)
  const requestRef = useRef(null)
  const slowTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      requestRef.current?.abort()
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current)
    }
  }, [])

  function beginLoading(message) {
    requestRef.current?.abort()
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current)

    const controller = new AbortController()
    requestRef.current = controller
    setIsSlow(false)
    setView({ kind: "loading", message })
    slowTimerRef.current = window.setTimeout(() => {
      if (requestRef.current === controller) setIsSlow(true)
    }, 2500)
    return controller
  }

  function finishLoading(controller) {
    if (requestRef.current !== controller) return false
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current)
    slowTimerRef.current = null
    requestRef.current = null
    setIsSlow(false)
    return true
  }

  function showHistorical(nextProfile, message = HISTORICAL_READY_MESSAGE) {
    requestRef.current?.abort()
    if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current)
    requestRef.current = null
    slowTimerRef.current = null
    setIsSlow(false)
    setProfile(nextProfile)
    setLiveData(null)
    setView({ kind: "historical", message })
  }

  async function loadCurrentData(nextProfile, controller = beginLoading(loadingMessage)) {
    setProfile(nextProfile)
    setLiveData(null)
    try {
      const data = await fetchOpenMeteoExampleData(nextProfile, {
        signal: controller.signal,
        [fallbackKey]: buildFallback(nextProfile),
      })
      if (!finishLoading(controller)) return
      setLiveData(data)
      setView({ kind: "live", message: liveMessage(data) })
    } catch (error) {
      if (error.name === "AbortError" || !finishLoading(controller)) return
      setView({ kind: "historical", message: failureMessage })
    }
  }

  function requestBrowserLocation() {
    if (!navigator.geolocation) {
      setView({
        kind: liveData ? "live" : "historical",
        message: "Browser geolocation is not available.",
      })
      return
    }

    const controller = beginLoading(locationLoadingMessage)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        loadCurrentData(profileFromCoordinates(latitude, longitude), controller)
      },
      () => {
        if (!finishLoading(controller)) return
        setView({
          kind: liveData ? "live" : "historical",
          message: "Location permission was not granted. The previous data remains in view.",
        })
      },
      { maximumAge: 60_000, timeout: 6_000 },
    )
  }

  return {
    profile,
    liveData,
    view,
    setView,
    isSlow,
    isLoading: view.kind === "loading",
    showHistorical,
    loadCurrentData,
    requestBrowserLocation,
  }
}
