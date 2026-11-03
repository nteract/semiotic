import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Each case starts with the empty registry a bare StreamNetworkFrame consumer
// can encounter, independent of other chart imports in the test process.
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

  it("preserves registered plugins while loading a different missing layout", async () => {
    const { registerLayoutPlugin, getLayoutPlugin, useEnsureNetworkLayouts } = await freshModules()
    const { sankeyLayoutPlugin } = await import("./layouts/sankeyLayoutPlugin")
    const custom = { ...sankeyLayoutPlugin, buildScene: vi.fn(sankeyLayoutPlugin.buildScene) }
    registerLayoutPlugin("sankey", custom)
    const onReady = vi.fn()
    renderHook(() => useEnsureNetworkLayouts("force", false, onReady))
    await waitFor(() => expect(onReady).toHaveBeenCalledOnce())
    expect(getLayoutPlugin("sankey")).toBe(custom)
    expect(getLayoutPlugin("force")).toBeDefined()
    const { NetworkPipelineStore } = await import("./NetworkPipelineStore")
    const store = new NetworkPipelineStore({ chartType: "sankey" })
    store.ingestBounded([{ id: "a" }, { id: "b" }], [{ source: "a", target: "b", value: 1 }], [300, 200])
    store.buildScene([300, 200])
    expect(custom.buildScene).toHaveBeenCalledOnce()
    expect(store.sceneNodes).toHaveLength(2)
  })

  it("preserves registered plugins when static network rendering is imported", async () => {
    const { registerLayoutPlugin, getLayoutPlugin } = await freshModules()
    const { sankeyLayoutPlugin } = await import("./layouts/sankeyLayoutPlugin")
    const custom = { ...sankeyLayoutPlugin, buildScene: vi.fn(sankeyLayoutPlugin.buildScene) }
    registerLayoutPlugin("sankey", custom)
    const { renderNetworkFrame } = await import("../server/staticNetwork")
    expect(getLayoutPlugin("sankey")).toBe(custom)
    expect(getLayoutPlugin("force")).toBeDefined()
    const svg = renderNetworkFrame({
      chartType: "sankey", nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ source: "a", target: "b", value: 1 }], size: [300, 200]
    })
    expect(custom.buildScene).toHaveBeenCalledOnce()
    expect(svg).toContain("<rect")
  })

  it("restores built-ins when explicitly requested", async () => {
    const { registerLayoutPlugin, getLayoutPlugin } = await freshModules()
    const { sankeyLayoutPlugin } = await import("./layouts/sankeyLayoutPlugin")
    registerLayoutPlugin("sankey", { ...sankeyLayoutPlugin })
    const { registerBuiltInNetworkLayouts } = await import("./layouts/registerBuiltIn")
    registerBuiltInNetworkLayouts()
    expect(getLayoutPlugin("sankey")).toBe(sankeyLayoutPlugin)
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
