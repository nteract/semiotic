import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fetchOpenMeteoExampleData = vi.hoisted(() => vi.fn())

vi.mock("./openMeteoExampleData", () => ({
  fetchOpenMeteoExampleData,
}))

import { useOpenMeteoLoader } from "./useOpenMeteoLoader"

const profile = { id: "test-place", lat: 40.7, lon: -74 }
const livePayload = { hasLiveBaseline: true, climateRows: [{ day: 1 }] }

function useTestLoader(overrides = {}) {
  return useOpenMeteoLoader({
    initialProfile: profile,
    buildFallback: () => ({ rows: [] }),
    fallbackKey: "fallbackClimateRows",
    profileFromCoordinates: (lat, lon) => ({ id: `${lat},${lon}`, lat, lon }),
    loadingMessage: "Loading",
    locationLoadingMessage: "Locating",
    liveMessage: () => "Live data ready",
    failureMessage: "Live data unavailable",
    ...overrides,
  })
}

describe("useOpenMeteoLoader", () => {
  beforeEach(() => {
    fetchOpenMeteoExampleData.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("caches a successful response and uses it as an explicit fallback after a later failure", async () => {
    fetchOpenMeteoExampleData
      .mockResolvedValueOnce(livePayload)
      .mockRejectedValueOnce(new Error("network unavailable"))
    const { result } = renderHook(() => useTestLoader())

    await act(async () => {
      await result.current.loadCurrentData(profile)
    })
    expect(result.current.view).toMatchObject({ kind: "live", dataKind: "live" })
    expect(result.current.liveData).toBe(livePayload)

    await act(async () => {
      await result.current.loadCurrentData(profile)
    })
    expect(result.current.view).toMatchObject({ kind: "historical", dataKind: "fallback" })
    expect(result.current.view.message).toContain("last cached response")
    expect(result.current.liveData).toBe(livePayload)
  })

  it("keeps a successful live-observation response live when only its baseline is bundled", async () => {
    fetchOpenMeteoExampleData.mockResolvedValueOnce({
      hasLiveBaseline: false,
      climateRows: [{ day: 1 }],
    })
    const { result } = renderHook(() => useTestLoader())

    await act(async () => {
      await result.current.loadCurrentData(profile)
    })

    expect(result.current.view).toMatchObject({ kind: "live", dataKind: "live" })
  })

  it("replays the deterministic fixture as a snapshot without requesting the network", () => {
    const { result } = renderHook(() => useTestLoader())

    act(() => {
      result.current.replayFixture(profile, "Fixture replay")
    })

    expect(fetchOpenMeteoExampleData).not.toHaveBeenCalled()
    expect(result.current.view).toMatchObject({
      kind: "historical",
      dataKind: "snapshot",
      message: "Fixture replay",
    })
    expect(result.current.liveData).toBeNull()
  })

  it("aborts an active request when a manual view is chosen and ignores its late response", async () => {
    let resolveResponse
    fetchOpenMeteoExampleData.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveResponse = resolve
      }),
    )
    const { result } = renderHook(() => useTestLoader())

    let pendingLoad
    act(() => {
      pendingLoad = result.current.loadCurrentData(profile)
    })
    expect(result.current.isLoading).toBe(true)

    act(() => {
      result.current.setView({ kind: "historical", message: "Use the local reference." })
    })
    expect(result.current.view).toMatchObject({
      kind: "historical",
      dataKind: "snapshot",
      message: "Use the local reference.",
    })

    await act(async () => {
      resolveResponse(livePayload)
      await pendingLoad
    })

    expect(result.current.liveData).toBeNull()
    expect(result.current.view).toMatchObject({
      kind: "historical",
      dataKind: "snapshot",
      message: "Use the local reference.",
    })
  })

  it("turns an aborted request caused by the hard timeout into a declared error state", async () => {
    vi.useFakeTimers()
    fetchOpenMeteoExampleData.mockImplementation(
      (_nextProfile, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            const error = new Error("timed out")
            error.name = "AbortError"
            reject(error)
          })
        }),
    )
    const { result } = renderHook(() => useTestLoader({ requestTimeoutMs: 3000 }))

    let pending
    act(() => {
      pending = result.current.loadCurrentData(profile)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
      await pending
    })

    expect(result.current).toMatchObject({
      isLoading: false,
      isSlow: false,
      view: {
        kind: "historical",
        dataKind: "error",
        message: "Live data unavailable",
      },
    })
  })
})
