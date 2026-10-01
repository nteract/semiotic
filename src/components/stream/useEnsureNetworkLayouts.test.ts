import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// setupTests registers every layout globally; reset the module graph so each
// case starts from an empty registry, as a bare StreamNetworkFrame consumer does.
async function freshModules() {
  vi.resetModules()
  const registry = await import("./layouts/registry")
  const { useEnsureNetworkLayouts } = await import("./useEnsureNetworkLayouts")
  return { ...registry, useEnsureNetworkLayouts }
}

describe("useEnsureNetworkLayouts", () => {
  afterEach(() => {
    vi.doUnmock("./layouts/registerBuiltIn")
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("loads built-in layouts and reruns the layout for an unregistered chartType", async () => {
    const { getLayoutPlugin, useEnsureNetworkLayouts } = await freshModules()
    expect(getLayoutPlugin("force")).toBeUndefined()
    const onReady = vi.fn()
    renderHook(() => useEnsureNetworkLayouts("force", false, onReady))
    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1)
    })
    expect(getLayoutPlugin("force")).toBeTruthy()
    expect(getLayoutPlugin("sankey")).toBeTruthy()
  })

  it("does nothing when the chart already registered its layout", async () => {
    const { registerLayoutPlugin, useEnsureNetworkLayouts } = await freshModules()
    const { sankeyLayoutPlugin } = await import("./layouts/sankeyLayoutPlugin")
    registerLayoutPlugin("sankey", sankeyLayoutPlugin)
    const onReady = vi.fn()
    renderHook(() => useEnsureNetworkLayouts("sankey", false, onReady))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(onReady).not.toHaveBeenCalled()
  })

  it("leaves custom layouts alone", async () => {
    const { getLayoutPlugin, useEnsureNetworkLayouts } = await freshModules()
    const onReady = vi.fn()
    renderHook(() => useEnsureNetworkLayouts("force", true, onReady))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(onReady).not.toHaveBeenCalled()
    expect(getLayoutPlugin("force")).toBeUndefined()
  })

  it("reports failed chunk imports instead of leaving an unhandled rejection", async () => {
    const failure = new Error("network layout chunk unavailable")
    vi.doMock("./layouts/registerBuiltIn", () => { throw failure })
    const { useEnsureNetworkLayouts } = await freshModules()
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const onReady = vi.fn()
    renderHook(() => useEnsureNetworkLayouts("force", false, onReady))
    await waitFor(() => {
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('StreamNetworkFrame layout "force"'),
        expect.any(Error)
      )
    })
    expect(onReady).not.toHaveBeenCalled()
  })
})
