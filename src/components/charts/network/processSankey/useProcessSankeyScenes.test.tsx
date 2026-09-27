import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as scenes from "./buildScenes"
import * as worker from "./processSankeyLayoutWorkerClient"
import { useProcessSankeyScenes } from "./useProcessSankeyScenes"
import type { BuildScenesInput } from "./buildScenes"

const input = (value = 1): BuildScenesInput => ({
  nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
  edges: [{ id: "flow", source: "a", target: "b", value, startTime: 2, endTime: 8 }],
  domain: [0, 10], plotW: 600, plotH: 300, ribbonLane: "both",
  edgeOpacity: 0.35, colorOf: () => "red", layoutOpts: { packing: "off", laneOrder: "crossing-min" },
})
afterEach(() => vi.restoreAllMocks())

describe("ProcessSankey analysis lifecycle", () => {
  it("computes once and restyles current records across inline props and timeline resizing", () => {
    const prepare = vi.spyOn(scenes, "prepareProcessSankeyLayout")
    const view = renderHook(({ data }) => useProcessSankeyScenes(data, { execution: "sync" }),
      { initialProps: { data: input() } })
    expect(prepare).toHaveBeenCalledTimes(1)
    const layout = view.result.current.layout
    const path = view.result.current.layoutConfig.ribbons[0].pathD
    const next = { ...input(), plotW: 800, edgeOpacity: () => 0.8, colorOf: () => "blue" }
    next.nodes[0] = { id: "a", label: "Current", __raw: { id: "a", label: "Current" } }
    view.rerender({ data: next })
    expect(prepare).toHaveBeenCalledTimes(1)
    expect(view.result.current.layout).toBe(layout)
    expect(view.result.current.layoutConfig.ribbons[0]).toMatchObject({ fill: "blue", opacity: 0.8 })
    expect(view.result.current.layoutConfig.ribbons[0].pathD).not.toBe(path)
    expect(view.result.current.layoutConfig.bands[0]).toMatchObject({ labelText: "Current", rawDatum: next.nodes[0].__raw })
    view.rerender({ data: { ...next, plotH: 400 } })
    expect(prepare).toHaveBeenCalledTimes(2)
    view.rerender({ data: input(2) })
    expect(prepare).toHaveBeenCalledTimes(3)
  })

  it("falls back to current geometry if a worker fails", async () => {
    vi.spyOn(worker, "canUseProcessSankeyWorker").mockReturnValue(true)
    vi.spyOn(worker, "runProcessSankeyLayoutWorker").mockRejectedValue(new Error("worker failed"))
    const view = renderHook(() => useProcessSankeyScenes(input(7), { execution: "worker" }))
    await act(async () => {})
    expect(view.result.current.status).toBe("ready")
    expect(view.result.current.layoutConfig.ribbons[0].rawDatum).toMatchObject({ value: 7 })
    expect(view.result.current.error).toBeNull()
  })

  it("keeps the latest sync scene pending, aborts superseded work, and styles worker geometry on the host", async () => {
    vi.spyOn(worker, "canUseProcessSankeyWorker").mockReturnValue(true)
    const requests: Array<{ input: BuildScenesInput; signal: AbortSignal; resolve: (result: worker.ProcessSankeyWorkerResponse) => void }> = []
    vi.spyOn(worker, "runProcessSankeyLayoutWorker").mockImplementation((request, signal) =>
      new Promise((resolve) => requests.push({ input: { ...request.input, colorOf: () => "red" }, signal: signal!, resolve })))
    const respond = (index: number) => requests[index].resolve({
      ...scenes.buildProcessSankeyScenes(requests[index].input), domain: [0, 10], timelineExtent: 1,
    })
    const view = renderHook(({ data, execution }: { data: BuildScenesInput; execution: "sync" | "worker" }) =>
      useProcessSankeyScenes(data, { execution }), { initialProps: { data: input(), execution: "sync" } })
    view.rerender({ data: input(2), execution: "sync" })
    const latest = view.result.current.layout
    view.rerender({ data: { ...input(3), edgeOpacity: () => 0.9 }, execution: "worker" })
    expect(view.result.current.status).toBe("pending")
    expect(view.result.current.layout).toBe(latest)
    expect(requests).toHaveLength(1)
    expect(typeof requests[0].input.edgeOpacity).toBe("number")
    view.rerender({ data: { ...input(4), edgeOpacity: () => 0.7 }, execution: "worker" })
    expect(requests[0].signal.aborted).toBe(true)
    expect(requests).toHaveLength(2)
    view.rerender({ data: { ...input(4), edgeOpacity: () => 0.6, colorOf: () => "green" }, execution: "worker" })
    expect(requests).toHaveLength(2)
    await act(async () => respond(0))
    expect(view.result.current.status).toBe("pending")
    expect(view.result.current.layout).toBe(latest)
    await act(async () => respond(1))
    expect(view.result.current.status).toBe("ready")
    expect(view.result.current.layoutConfig.ribbons[0]).toMatchObject({ fill: "green", opacity: 0.6 })
    expect(view.result.current.layoutConfig.ribbons[0].rawDatum).toMatchObject({ value: 4 })
  })
})
