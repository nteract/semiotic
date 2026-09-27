import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as scenes from "./buildScenes"
import { buildProcessSankeyScenes, type BuildScenesInput } from "./buildScenes"
import { useProcessSankeyScenes } from "./useProcessSankeyScenes"
import {
  _resetSharedProcessSankeyLayoutSessionForTest as reset,
  canUseProcessSankeyWorker,
  runProcessSankeyLayoutWorker,
  type ProcessSankeyWorkerRequest,
} from "./processSankeyLayoutWorkerClient"

class WorkerStub {
  static instances: WorkerStub[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  messages: Array<{ requestId: number }> = []
  terminated = false
  constructor() { WorkerStub.instances.push(this) }
  postMessage(message: { requestId: number }) { this.messages.push(message) }
  terminate() { this.terminated = true }
  reply(data: unknown) { this.onmessage?.({ data } as MessageEvent) }
}
const input = (value = 1): BuildScenesInput => ({
  nodes: [{ id: "a" }, { id: "b" }, { id: "isolated" }],
  edges: [{ id: "ab", source: "a", target: "b", value, startTime: 0, endTime: 1 }],
  domain: [0, 2], plotW: 300, plotH: 200, ribbonLane: "both", edgeOpacity: 0.5,
  colorOf: () => "red", layoutOpts: { packing: "reuse", laneOrder: "insertion" },
})
const request = (): ProcessSankeyWorkerRequest => {
  const { nodes, edges, domain, plotW, plotH, ribbonLane, layoutOpts } = input()
  return { input: { nodes, edges, domain, plotW, plotH, ribbonLane, layoutOpts, edgeOpacity: 0.5 }, colorById: {}, fallbackPalette: ["red"] }
}
function response() {
  const scene = buildProcessSankeyScenes(input())
  return { ...scene, layout: { ...scene.layout!, sides: [...scene.layout!.sides] }, domain: [0, 2], timelineExtent: 300 }
}
beforeEach(() => { reset(); WorkerStub.instances = []; vi.stubGlobal("Worker", WorkerStub) })
afterEach(() => { reset(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe("ProcessSankey worker failure recovery (#1333)", () => {
  it("caches constructor failures and renders subsequent geometry synchronously until reset", async () => {
    const prepare = vi.spyOn(scenes, "prepareProcessSankeyLayout")
    let attempts = 0
    vi.stubGlobal("Worker", class { constructor() { attempts++; throw new Error("CSP blocked") } })
    const view = renderHook(({ value }) => useProcessSankeyScenes(input(value), { execution: "worker" }),
      { initialProps: { value: 1 } })
    await waitFor(() => expect(view.result.current.status).toBe("ready"))
    expect(prepare).toHaveBeenCalledTimes(1)
    view.rerender({ value: 2 })
    expect(view.result.current.layoutConfig.ribbons[0].rawDatum).toMatchObject({ value: 2 })
    expect(attempts).toBe(1)
    expect(prepare).toHaveBeenCalledTimes(2)
    expect(canUseProcessSankeyWorker()).toBe(false)
    reset()
    view.rerender({ value: 3 })
    await waitFor(() => expect(view.result.current.status).toBe("ready"))
    expect(attempts).toBe(2)
  })

  it.each(["load", "messageerror", "malformed"])("falls back after %s failure and does not retry for the next layout key", async (failure) => {
    const view = renderHook(({ value }) => useProcessSankeyScenes(input(value), { execution: "worker" }),
      { initialProps: { value: 1 } })
    expect(view.result.current.status).toBe("pending")
    await waitFor(() => expect(WorkerStub.instances).toHaveLength(1))
    const worker = WorkerStub.instances[0]
    await act(async () => {
      if (failure === "load") worker.onerror?.({ message: "Module failed to load" } as ErrorEvent)
      else if (failure === "messageerror") worker.onmessageerror?.({} as MessageEvent)
      else worker.reply({})
    })
    expect(view.result.current.status).toBe("ready")
    expect(view.result.current.layoutConfig.ribbons).toHaveLength(1)
    expect(worker.terminated).toBe(true)
    view.rerender({ value: 9 })
    expect(view.result.current.status).toBe("ready")
    expect(view.result.current.layoutConfig.ribbons[0].rawDatum).toMatchObject({ value: 9 })
    expect(WorkerStub.instances).toHaveLength(1)
  })

  it.each([
    () => ({}), () => null, () => ({ ...response(), layout: {} }),
    () => ({ ...response(), issues: {} }),
    () => ({ ...response(), domain: [0, NaN] }),
    () => ({ ...response(), layoutConfig: { bands: "bad", ribbons: [] } }),
    () => ({ ...response(), layout: { ...response().layout, sides: [["ab", null]] } }),
    () => ({ ...response(), requestId: "bad" }),
  ])("rejects all pending consumers of malformed payloads", async (payload) => {
    const first = runProcessSankeyLayoutWorker(request())
    const second = runProcessSankeyLayoutWorker(request())
    const rejections = Promise.all([expect(first).rejects.toThrow(/malformed/i), expect(second).rejects.toThrow(/malformed/i)])
    WorkerStub.instances[0].reply(payload())
    await rejections
    expect(canUseProcessSankeyWorker()).toBe(false)
  })

  it("keeps a healthy worker available after a request-specific error", async () => {
    const first = runProcessSankeyLayoutWorker(request())
    WorkerStub.instances[0].reply({ requestId: 1, error: { message: "Invalid request" } })
    await expect(first).rejects.toThrow("Invalid request")
    expect(canUseProcessSankeyWorker()).toBe(true)
    const next = runProcessSankeyLayoutWorker(request())
    WorkerStub.instances[0].reply({ ...response(), requestId: 2 })
    await expect(next).resolves.toHaveProperty("layout")
    expect(WorkerStub.instances).toHaveLength(1)
  })

  it("accepts actual layouts, including isolated-node sentinels and revived Maps", async () => {
    const pending = runProcessSankeyLayoutWorker(request())
    WorkerStub.instances[0].reply({ ...response(), requestId: 1 })
    const result = await pending
    expect(result.layout?.sides).toBeInstanceOf(Map)
    expect(result.layout?.nodeData).toEqual(buildProcessSankeyScenes(input()).layout?.nodeData)
    expect(canUseProcessSankeyWorker()).toBe(true)
  })

  it("recreates an intentionally cancelled worker without marking it unavailable", async () => {
    const abort = new AbortController()
    const first = runProcessSankeyLayoutWorker(request(), abort.signal)
    abort.abort()
    await expect(first).rejects.toMatchObject({ name: "AbortError" })
    WorkerStub.instances[0].onerror?.({ message: "late error after termination" } as ErrorEvent)
    expect(canUseProcessSankeyWorker()).toBe(true)
    const second = runProcessSankeyLayoutWorker(request())
    expect(WorkerStub.instances).toHaveLength(2)
    WorkerStub.instances[1].reply({ ...response(), requestId: 1 })
    await expect(second).resolves.toHaveProperty("layout")
  })
})
