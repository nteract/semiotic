import { renderHook, waitFor } from "@testing-library/react"
import { getXYPlugin, resetXYPluginRegistry } from "./xyPlugins/registry"
import { registerXYPlugin } from "./xyPlugins/registry"
import { lineXYPlugin } from "./xyPlugins/linePlugin"
import { useEnsureXYPlugins } from "./useEnsureCustomXYRenderers"

describe("useEnsureXYPlugins", () => {
  afterEach(() => {
    resetXYPluginRegistry()
  })

  it("marks dirty then schedules when built-ins load for an unregistered chartType", async () => {
    resetXYPluginRegistry()
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("line", undefined, dirtyRef, scheduleRender, storeRef))
    await waitFor(() => {
      expect(getXYPlugin("line")).toBeTruthy()
    })
    expect(dirtyRef.current).toBe(true)
    expect(scheduleRender).toHaveBeenCalled()
  })

  it("does not fetch built-ins when the HOC already registered the chartType", () => {
    registerXYPlugin(lineXYPlugin)
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("line", undefined, dirtyRef, scheduleRender, storeRef))
    expect(dirtyRef.current).toBe(false)
    expect(scheduleRender).not.toHaveBeenCalled()
  })

  it("marks paint pending without dirtying geometry when custom painters load", async () => {
    registerXYPlugin(lineXYPlugin)
    const dirtyRef = { current: false }
    const scheduleRender = vi.fn()
    const storeRef = { current: { markStylePaintPending: vi.fn() } }
    renderHook(() => useEnsureXYPlugins("line", () => ({ nodes: [] }), dirtyRef, scheduleRender, storeRef))
    await waitFor(() => {
      expect(getXYPlugin("custom")).toBeTruthy()
    })
    expect(dirtyRef.current).toBe(false)
    expect(storeRef.current.markStylePaintPending).toHaveBeenCalledTimes(1)
    expect(scheduleRender).toHaveBeenCalled()
  })
})
