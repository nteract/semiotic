import { act, renderHook, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { bootstrap, useGuideHost } from "./useGuideHost"
import { buildGuidePacket } from "./packet"
import { stateSearch } from "./state"
import type { ReservoirSnapshot } from "./types"
import { checkForUpdate, loadSnapshot, saveOffline } from "./host"

vi.mock("./host", () => ({
  loadSnapshot: vi.fn(),
  checkForUpdate: vi.fn(),
  saveOffline: vi.fn(),
  download: vi.fn(),
}))
vi.mock("./export-runtime", () => ({
  exportSelection: vi.fn(() => ({ html: "<html>Saved selection</html>", packet: {} })),
}))

const snapshot = JSON.parse(
  readFileSync(
    `docs/public/stories/reservoir-guide/${bootstrap.header.editionId}/snapshot.json`,
    "utf8",
  ),
) as ReservoirSnapshot
const nextState = { ...bootstrap.guide.state, monthDay: "07-29" }

beforeEach(() => {
  window.history.replaceState(null, "", "/")
  vi.mocked(loadSnapshot).mockResolvedValue(snapshot)
})
afterEach(() => vi.resetAllMocks())

function navigate() {
  act(() => {
    window.history.replaceState(null, "", stateSearch(nextState))
    window.dispatchEvent(new PopStateEvent("popstate"))
  })
}

describe("reservoir guide operation ownership", () => {
  it("ignores an obsolete initial load after retry even when it ignores abort", async () => {
    const old = Promise.withResolvers<ReservoirSnapshot>()
    const next = Promise.withResolvers<ReservoirSnapshot>()
    vi.mocked(loadSnapshot).mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
    const { result } = renderHook(useGuideHost)
    act(() => result.current.retry())
    expect(vi.mocked(loadSnapshot).mock.calls[0][1]?.aborted).toBe(true)
    await act(async () => {
      old.resolve(snapshot)
      await old.promise
    })
    expect(result.current.snapshot).toBeNull()
    await act(async () => {
      next.resolve(snapshot)
      await next.promise
    })
    expect(result.current.snapshot).toBe(snapshot)
  })

  it("does not apply an imported selection after browser navigation", async () => {
    const { result } = renderHook(useGuideHost)
    await waitFor(() => expect(result.current.snapshot).toBe(snapshot))
    const content = Promise.withResolvers<string>()
    const file = new File([], "selection.json")
    const text = vi.fn(() => content.promise)
    Object.defineProperty(file, "text", { value: text })
    let importing: Promise<void>
    act(() => {
      importing = result.current.importPacket(file)
    })
    await waitFor(() => expect(text).toHaveBeenCalledOnce())
    navigate()
    expect(result.current.busy).toBe(false)
    await act(async () => {
      content.resolve(JSON.stringify(buildGuidePacket(snapshot, bootstrap.guide.state)))
      await importing
    })
    expect(result.current.state).toEqual(nextState)
    expect(result.current.status).not.toContain("packet verified")
  })

  it("does not publish an old offline address or release a newer refresh", async () => {
    const { result } = renderHook(useGuideHost)
    await waitFor(() => expect(result.current.snapshot).toBe(snapshot))
    const saved = Promise.withResolvers<string>()
    const refreshed = Promise.withResolvers<null>()
    vi.mocked(saveOffline).mockReturnValue(saved.promise)
    vi.mocked(checkForUpdate).mockReturnValue(refreshed.promise)
    let saving: Promise<void>
    act(() => {
      saving = result.current.exportView("offline")
    })
    await waitFor(() => expect(saveOffline).toHaveBeenCalledOnce())
    navigate()
    let refreshing: Promise<void>
    act(() => {
      refreshing = result.current.refresh()
    })
    await act(async () => {
      saved.resolve("/obsolete-selection")
      await saving
    })
    expect(result.current.savedURL).toBe("")
    expect(result.current.busy).toBe(true)
    await act(async () => {
      refreshed.resolve(null)
      await refreshing
    })
    expect(result.current.busy).toBe(false)
    expect(result.current.status).toContain("No newer edition")
  })

  it("revokes refresh publication on navigation", async () => {
    const { result } = renderHook(useGuideHost)
    await waitFor(() => expect(result.current.snapshot).toBe(snapshot))
    const refreshed = Promise.withResolvers<null>()
    vi.mocked(checkForUpdate).mockReturnValue(refreshed.promise)
    let refreshing: Promise<void>
    act(() => {
      refreshing = result.current.refresh()
    })
    const status = result.current.status
    navigate()
    expect(vi.mocked(checkForUpdate).mock.calls[0][2]?.aborted).toBe(true)
    await act(async () => {
      refreshed.resolve(null)
      await refreshing
    })
    expect(result.current.status).toBe(status)
    expect(result.current.busy).toBe(false)
  })
})
