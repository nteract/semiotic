import * as React from "react"
import { act, waitFor } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import type { NetworkPipelineStore as NetworkStore } from "./NetworkPipelineStore"
import type { StreamNetworkFrameHandle } from "./networkTypes"

const DeferredWorker = vi.fn(class {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn<(request: { requestId: number }) => void>()
  terminate = vi.fn()
})

let restoreCanvas: () => void
let StreamNetworkFrame: typeof import("./StreamNetworkFrame")["default"]
let NetworkPipelineStore: typeof import("./NetworkPipelineStore")["NetworkPipelineStore"]
let sparseArray: typeof import("../charts/shared/sparseArray")
beforeEach(async () => {
  vi.resetModules()
  const [frame, store, sparse, registry, force] = await Promise.all([
    import("./StreamNetworkFrame"),
    import("./NetworkPipelineStore"),
    import("../charts/shared/sparseArray"),
    import("./layouts/registry"),
    import("./layouts/forceLayoutPlugin")
  ])
  StreamNetworkFrame = frame.default
  NetworkPipelineStore = store.NetworkPipelineStore
  sparseArray = sparse
  registry.registerLayoutPlugin("force", force.forceLayoutPlugin)
  restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  DeferredWorker.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  restoreCanvas()
})

it.each(["worker", "sync", "fallback"] as const)(
  "hydrates in StrictMode with %s layout only after commit",
  async (execution) => {
    if (execution === "worker") vi.stubGlobal("Worker", DeferredWorker)
    if (execution === "fallback")
      vi.stubGlobal(
        "Worker",
        class {
          constructor() {
            throw new Error("Worker blocked by CSP")
          }
        }
      )
    const nodes = [{ id: "a" }, { id: "b" }]
    const edges = [{ source: "a", target: "b" }]
    const ref = React.createRef<StreamNetworkFrameHandle>()
    let phase = "render"
    function Probe() {
      phase = "render"
      React.useInsertionEffect(() => {
        phase = "commit"
      })
      return (
        <StreamNetworkFrame
          ref={ref}
          chartType="force"
          nodes={nodes}
          edges={edges}
          layoutExecution={execution === "sync" ? "sync" : "worker"}
          animate={false}
          title="Hydrated graph"
        />
      )
    }
    const chart = (
      <React.StrictMode>
        <Probe />
      </React.StrictMode>
    )
    const host = document.createElement("div")
    host.innerHTML = renderToString(chart)
    document.body.appendChild(host)
    const serverFrame = host.firstElementChild
    const serverSVG = host.querySelector("svg")
    expect(host.querySelectorAll("svg circle").length).toBeGreaterThan(0)
    const calls = vi.fn<(phase: string) => void>()
    const validations = vi.fn<(phase: string) => void>()
    const originalFilter = sparseArray.filterSparseArray
    vi.spyOn(sparseArray, "filterSparseArray").mockImplementation(
      function <T extends object>(
        input: readonly (T | null | undefined)[] | undefined | null
      ) {
        validations(phase)
        return originalFilter(input)
      }
    )
    const original = NetworkPipelineStore.prototype.runLayout
    vi.spyOn(NetworkPipelineStore.prototype, "runLayout").mockImplementation(
      function (this: NetworkStore, ...args) {
        calls(phase)
        return original.apply(this, args)
      }
    )
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(host, chart, {
          onRecoverableError
        })
      })
      expect(onRecoverableError).not.toHaveBeenCalled()
      expect(host.firstElementChild).toBe(serverFrame)
      expect(calls).not.toHaveBeenCalledWith("render")
      expect(validations).toHaveBeenCalled()
      expect(validations).not.toHaveBeenCalledWith("render")
      if (execution === "worker") {
        await waitFor(() =>
          expect(
            DeferredWorker.mock.instances.some(
              (worker) => worker.terminate.mock.calls.length === 0 && worker.postMessage.mock.calls.length > 0
            )
          ).toBe(true)
        )
        expect(calls).not.toHaveBeenCalled()
        expect(host.querySelector("svg")).toBe(serverSVG)
        expect(host.querySelector("canvas")).toBeNull()
        expect(serverFrame).toHaveAttribute("aria-busy", "true")
        const worker = DeferredWorker.mock.instances.findLast(
          (instance) => instance.terminate.mock.calls.length === 0
        )!
        const request = worker.postMessage.mock.lastCall![0]
        await act(async () =>
          worker.onmessage?.({
            data: {
              requestId: request.requestId,
              positions: { a: { x: 80, y: 80 }, b: { x: 180, y: 120 } }
            }
          } as MessageEvent)
        )
        expect(calls).toHaveBeenCalledExactlyOnceWith("commit")
        expect(ref.current?.getTopology().nodes).toMatchObject([
          { id: "a", x: 80, y: 80 },
          { id: "b", x: 180, y: 120 }
        ])
      } else {
        expect(calls).toHaveBeenCalled()
      }
      expect(host.querySelector("canvas")).not.toBeNull()
      expect(host.firstElementChild).toBe(serverFrame)
      expect(onRecoverableError).not.toHaveBeenCalled()
    } finally {
      act(() => root?.unmount())
      host.remove()
    }
  }
)
