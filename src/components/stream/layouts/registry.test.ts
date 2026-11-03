import { beforeEach, describe, expect, it, vi } from "vitest"

// Global component-test setup installs the layouts. These tests need an empty
// registry so missing registration calls cannot pass on setup's work alone.
beforeEach(() => vi.resetModules())

describe("network layout registry", () => {
  it("registers sankey without registering the force layout", async () => {
    const { getLayoutPlugin, registerLayoutPlugin } = await import("./registry")
    const { sankeyLayoutPlugin } = await import("./sankeyLayoutPlugin")
    expect(getLayoutPlugin("sankey")).toBeUndefined()
    registerLayoutPlugin("sankey", sankeyLayoutPlugin)
    expect(getLayoutPlugin("sankey")).toBe(sankeyLayoutPlugin)
    expect(getLayoutPlugin("force")).toBeUndefined()
  })

  it("keeps force as a separately registered plugin", async () => {
    const { getLayoutPlugin, registerLayoutPlugin } = await import("./registry")
    const { forceLayoutPlugin } = await import("./forceLayoutPlugin")
    expect(getLayoutPlugin("force")).toBeUndefined()
    registerLayoutPlugin("force", forceLayoutPlugin)
    expect(getLayoutPlugin("force")).toBe(forceLayoutPlugin)
    expect(getLayoutPlugin("sankey")).toBeUndefined()
  })

  it("registerBuiltInNetworkLayouts installs every built-in plugin by value", async () => {
    const { getLayoutPlugin } = await import("./registry")
    const { registerBuiltInNetworkLayouts } = await import("./registerBuiltIn")
    const { sankeyLayoutPlugin } = await import("./sankeyLayoutPlugin")
    const { forceLayoutPlugin } = await import("./forceLayoutPlugin")
    const { chordLayoutPlugin } = await import("./chordLayoutPlugin")
    const { hierarchyLayoutPlugin } = await import("./hierarchyLayoutPlugin")
    const { orbitLayoutPlugin } = await import("./orbitLayoutPlugin")
    const layouts = [
      ["sankey", sankeyLayoutPlugin],
      ["force", forceLayoutPlugin],
      ["chord", chordLayoutPlugin],
      ["tree", hierarchyLayoutPlugin],
      ["cluster", hierarchyLayoutPlugin],
      ["treemap", hierarchyLayoutPlugin],
      ["circlepack", hierarchyLayoutPlugin],
      ["partition", hierarchyLayoutPlugin],
      ["orbit", orbitLayoutPlugin],
    ] as const
    for (const [name] of layouts) expect(getLayoutPlugin(name)).toBeUndefined()
    registerBuiltInNetworkLayouts()
    for (const [name, plugin] of layouts) expect(getLayoutPlugin(name)).toBe(plugin)
  })
})
