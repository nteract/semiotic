import { renderHook, waitFor } from "@testing-library/react"
let registry: typeof import("./xyPlugins/registry")
let lineXYPlugin: typeof import("./xyPlugins/linePlugin")["lineXYPlugin"]
let useEnsureXYPlugins: typeof import("./useEnsureCustomXYRenderers")["useEnsureXYPlugins"]
let registerServerXYPlugins: typeof import("../server/registerServerXYPlugins")["registerServerXYPlugins"]

beforeEach(async () => {
  vi.resetModules()
  registry = await import("./xyPlugins/registry")
  ;({ lineXYPlugin } = await import("./xyPlugins/linePlugin"))
  ;({ useEnsureXYPlugins } = await import("./useEnsureCustomXYRenderers"))
  ;({ registerServerXYPlugins } = await import("../server/registerServerXYPlugins"))
})

describe("useEnsureXYPlugins", () => {
  it.each([false, true])("loads painters after server-only registration (custom=%s)", async (custom) => {
    registerServerXYPlugins()
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("line", custom ? () => ({ nodes: [] }) : undefined, dirtyRef, scheduleRender, storeRef))
    await waitFor(() => {
      expect(registry.getXYPlugin(custom ? "custom" : "line")?.canvasRenderers.length).toBeGreaterThan(0)
      expect(scheduleRender).toHaveBeenCalled()
    })
  })

  it("marks dirty then schedules when built-ins load for an unregistered chartType", async () => {
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("line", undefined, dirtyRef, scheduleRender, storeRef))
    await waitFor(() => {
      expect(registry.getXYPlugin("line")).toBeTruthy()
    })
    expect(dirtyRef.current).toBe(true)
    expect(scheduleRender).toHaveBeenCalled()
  })

  it("does not fetch built-ins when the HOC already registered the chartType", () => {
    registry.registerXYPlugin(lineXYPlugin)
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("line", undefined, dirtyRef, scheduleRender, storeRef))
    expect(dirtyRef.current).toBe(false)
    expect(scheduleRender).not.toHaveBeenCalled()
  })

  it("marks paint pending without dirtying geometry when custom painters load", async () => {
    registry.registerXYPlugin(lineXYPlugin)
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("line", () => ({ nodes: [] }), dirtyRef, scheduleRender, storeRef))
    await waitFor(() => {
      expect(registry.getXYPlugin("custom")).toBeTruthy()
    })
    expect(dirtyRef.current).toBe(false)
    expect(storeRef.current.markStylePaintPending).toHaveBeenCalledTimes(1)
    expect(scheduleRender).toHaveBeenCalled()
  })

  it("preserves a custom plugin when a different missing chart type loads", async () => {
    const custom = { ...lineXYPlugin, buildScene: vi.fn(lineXYPlugin.buildScene) }
    registry.registerXYPlugin(custom)
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("area", undefined, dirtyRef, scheduleRender, storeRef))
    await waitFor(() => expect(scheduleRender).toHaveBeenCalled())
    expect(registry.getXYPlugin("line")).toBe(custom)
    expect(registry.getXYPlugin("area")?.canvasRenderers.length).toBeGreaterThan(0)
  })

  it("leaves an intentionally SVG-only custom plugin alone", async () => {
    const custom = { ...lineXYPlugin, canvasRenderers: [] }
    registry.registerXYPlugin(custom)
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("line", undefined, dirtyRef, scheduleRender, storeRef))
    await vi.dynamicImportSettled()
    expect(registry.getXYPlugin("line")).toBe(custom)
    expect(scheduleRender).not.toHaveBeenCalled()
    expect(dirtyRef.current).toBe(false)
  })
})
