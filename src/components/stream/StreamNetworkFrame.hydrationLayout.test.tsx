import * as React from "react"
import { act, waitFor } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import "./layouts/forceLayoutPlugin"
import StreamNetworkFrame from "./StreamNetworkFrame"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { StreamNetworkFrameHandle } from "./networkTypes"
import { _resetSharedForceLayoutSessionForTest } from "./layouts/forceLayoutWorkerClient"
import * as sparseArray from "../charts/shared/sparseArray"

class DeferredWorker {
  static instances: DeferredWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  messages: Array<{ requestId: number }> = []
  terminated = false

  constructor() {
    DeferredWorker.instances.push(this)
  }
  postMessage(request: { requestId: number }): void {
    this.messages.push(request)
  }
  terminate(): void {
    this.terminated = true
  }
}

let restoreCanvas: () => void
beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  DeferredWorker.instances = []
})
afterEach(() => {
  _resetSharedForceLayoutSessionForTest()
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
    const calls: string[] = []
    const validations: string[] = []
    const originalFilter = sparseArray.filterSparseArray
    vi.spyOn(sparseArray, "filterSparseArray").mockImplementation(
      function <T extends object>(
        input: readonly (T | null | undefined)[] | undefined | null
      ) {
        validations.push(phase)
        return originalFilter(input)
      }
    )
    const original = NetworkPipelineStore.prototype.runLayout
    vi.spyOn(NetworkPipelineStore.prototype, "runLayout").mockImplementation(
      function (this: NetworkPipelineStore, ...args) {
        calls.push(phase)
        return original.apply(this, args)
      }
    )
    const errors: unknown[] = []
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(host, chart, {
          onRecoverableError: (error) => errors.push(error)
        })
      })
      expect(errors).toEqual([])
      expect(host.firstElementChild).toBe(serverFrame)
      expect(calls).not.toContain("render")
      expect(validations.length).toBeGreaterThan(0)
      expect(validations).not.toContain("render")
      if (execution === "worker") {
        await waitFor(() =>
          expect(
            DeferredWorker.instances.some(
              (worker) => !worker.terminated && worker.messages.length > 0
            )
          ).toBe(true)
        )
        expect(calls).toEqual([])
        expect(host.querySelector("svg")).toBe(serverSVG)
        expect(host.querySelector("canvas")).toBeNull()
        expect(serverFrame).toHaveAttribute("aria-busy", "true")
        const worker = DeferredWorker.instances.findLast(
          (instance) => !instance.terminated
        )!
        const request = worker.messages.at(-1)!
        await act(async () =>
          worker.onmessage?.({
            data: {
              requestId: request.requestId,
              positions: { a: { x: 80, y: 80 }, b: { x: 180, y: 120 } }
            }
          } as MessageEvent)
        )
        expect(calls).toEqual(["commit"])
        expect(ref.current?.getTopology().nodes).toMatchObject([
          { id: "a", x: 80, y: 80 },
          { id: "b", x: 180, y: 120 }
        ])
      } else {
        expect(calls.length).toBeGreaterThan(0)
      }
      expect(host.querySelector("canvas")).not.toBeNull()
      expect(host.firstElementChild).toBe(serverFrame)
      expect(errors).toEqual([])
    } finally {
      act(() => root?.unmount())
      host.remove()
    }
  }
)
