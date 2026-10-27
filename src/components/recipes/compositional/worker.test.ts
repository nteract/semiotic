import { fixture } from "./testFixtures"
import { describe, expect, it } from "vitest"
import {
  createCompositionalWorkerEngine,
  installCompositionalWorker
} from "./worker"
import type {
  CompositionalWorkerMessage,
  CompositionalWorkerPort
} from "./worker"
import {
  compositionalDagEngine,
  CompositionalLayoutController
} from "./runtime"
import { prepareCompositionalGraph } from "./prepare"
import { compositionalLayoutOptions, routeCompositionalGraph } from "./solve"
import type { LayoutRequest } from "./types"

const request = (requestId: string): LayoutRequest => ({
  requestId,
  prepared: prepareCompositionalGraph({
    schemaVersion: "semiotic.compositional-graph.v0.1",
    graphId: "worker",
    revision: "1",
    nodes: [{ id: "isolated" }],
    edges: []
  }),
  view: {
    revision: "1",
    direction: "LR",
    nodes: [],
    constraints: [{ nodeId: "isolated", position: { x: 0, y: 0 } }]
  },
  geometry: {
    revision: "1",
    basis: "authored",
    nodes: [{ nodeId: "isolated", width: 100, height: 100, parts: [] }]
  },
  options: compositionalLayoutOptions({ mode: "route-only" })
})

type Listener = (event: MessageEvent<CompositionalWorkerMessage>) => void
function port() {
  const listeners = new Set<Listener>()
  const sent: CompositionalWorkerMessage[] = []
  return {
    listeners,
    sent,
    receive(data: CompositionalWorkerMessage) {
      listeners.forEach((listener) =>
        listener({ data } as MessageEvent<CompositionalWorkerMessage>)
      )
    },
    addEventListener: (_type: "message", listener: Listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: "message", listener: Listener) => {
      listeners.delete(listener)
    },
    postMessage: (message: CompositionalWorkerMessage) => {
      sent.push(message)
    }
  } satisfies CompositionalWorkerPort & {
    listeners: Set<Listener>
    sent: CompositionalWorkerMessage[]
    receive(data: CompositionalWorkerMessage): void
  }
}

describe("compositional worker transaction boundaries", () => {
  it("rejects reused IDs and ignores a cancelled response queued before the next solve", async () => {
    const host = port(),
      engine = createCompositionalWorkerEngine(host)
    const abort = new AbortController()
    const old = engine.layout(request("old"), abort.signal)
    abort.abort()
    await expect(old).rejects.toThrow("REVISION_CANCELLED")
    await expect(engine.layout(request("old"))).rejects.toThrow(
      "REVISION_REQUEST_ID"
    )
    const next = engine.layout(request("next"))
    let settled = false
    void next.then(() => {
      settled = true
    })
    host.receive({
      type: "result",
      requestId: "old",
      solved: routeCompositionalGraph(request("old"))
    })
    host.receive({ type: "error", requestId: "old", message: "late error" })
    await Promise.resolve()
    expect(settled).toBe(false)
    host.receive({
      type: "result",
      requestId: "next",
      solved: routeCompositionalGraph(request("next"))
    })
    expect((await next).requestId).toBe("next")
    await expect(engine.layout(request("next"))).rejects.toThrow(
      "REVISION_REQUEST_ID"
    )
    expect(host.sent.filter((m) => m.type === "solve")).toHaveLength(2)
    engine.dispose()
    expect(host.listeners.size).toBe(0)
  })

  it("settles cancellation and disposal even when the transport throws", async () => {
    const host = port()
    host.postMessage = (message) => {
      if (message.type === "cancel") throw new Error("transport closed")
    }
    const engine = createCompositionalWorkerEngine(host),
      abort = new AbortController()
    const first = engine.layout(request("first"), abort.signal)
    abort.abort()
    await expect(first).rejects.toThrow("REVISION_CANCELLED")
    const second = engine.layout(request("second")),
      third = engine.layout(request("third"))
    expect(() => engine.dispose()).not.toThrow()
    await expect(second).rejects.toThrow("REVISION_CANCELLED")
    await expect(third).rejects.toThrow("REVISION_CANCELLED")
    expect(host.listeners.size).toBe(0)
  })

  it("reports synchronous engine throws and lets the controller retain its accepted scene", async () => {
    const host = port(),
      worker = port()
    host.postMessage = (message) => {
      queueMicrotask(() => worker.receive(message))
    }
    worker.postMessage = (message) => {
      queueMicrotask(() => host.receive(message))
    }
    const uninstall = installCompositionalWorker(worker, {
      ...compositionalDagEngine,
      layout() {
        throw new Error("engine failed before returning a promise")
      }
    })
    const engine = createCompositionalWorkerEngine(host)
    const controller = new CompositionalLayoutController()
    expect(await controller.solve(request("accepted"))).toBe(true)
    const accepted = controller.solution
    expect(await controller.solve(request("failed"), engine)).toBe(false)
    expect(controller.solution).toBe(accepted)
    expect(controller.updating).toBe(false)
    expect(controller.diagnostics[0].message).toContain(
      "engine failed before returning a promise"
    )
    engine.dispose()
    uninstall()
    expect(host.listeners.size + worker.listeners.size).toBe(0)
  })

  it("rejects pending requests when the worker reports an error or a message cannot be read", async () => {
    for (const type of ["error", "messageerror"] as const) {
      const target = new EventTarget()
      const sent: CompositionalWorkerMessage[] = []
      const host = Object.assign(target, {
        postMessage: (message: CompositionalWorkerMessage) => {
          sent.push(message)
        }
      }) as unknown as CompositionalWorkerPort
      const engine = createCompositionalWorkerEngine(host)
      const controller = new CompositionalLayoutController()
      expect(await controller.solve(request("accepted"))).toBe(true)
      const accepted = controller.solution
      const solving = controller.solve(request(`crashed-${type}`), engine)
      expect(controller.updating).toBe(true)
      target.dispatchEvent(
        type === "error"
          ? new ErrorEvent("error", { message: "worker script failed" })
          : new Event("messageerror")
      )
      expect(await solving).toBe(false)
      expect(controller.updating).toBe(false)
      expect(controller.solution).toBe(accepted)
      expect(controller.diagnostics[0].message).toContain(
        "REVISION_WORKER_FAILED"
      )
      engine.dispose()
    }
  })

  it("reports a result the worker cannot post instead of leaving the request open", async () => {
    const host = port(),
      worker = port()
    host.postMessage = (message) => {
      queueMicrotask(() => worker.receive(message))
    }
    worker.postMessage = (message) => {
      if (message.type === "result")
        throw new Error("DataCloneError: function could not be cloned")
      queueMicrotask(() => host.receive(message))
    }
    const uninstall = installCompositionalWorker(worker)
    const engine = createCompositionalWorkerEngine(host)
    await expect(engine.layout(request("unclonable"))).rejects.toThrow(
      "DataCloneError"
    )
    engine.dispose()
    uninstall()
  })
})

it.each(["terminals", "bump"] as const)(
  "round-trips %s geometry through the worker controller",
  async (routing) => {
    const host = port(),
      worker = port()
    host.postMessage = (message) =>
      queueMicrotask(() => worker.receive(JSON.parse(JSON.stringify(message))))
    worker.postMessage = (message) =>
      queueMicrotask(() => host.receive(JSON.parse(JSON.stringify(message))))
    const remove = installCompositionalWorker(worker)
    const engine = createCompositionalWorkerEngine(host)
    const controller = new CompositionalLayoutController()
    const r = fixture()
    r.options = { ...r.options, routing }
    try {
      expect(await controller.solve(r, engine)).toBe(true)
      expect(controller.solution).toEqual(routeCompositionalGraph(r))
      expect(controller.solution!.edges).toHaveLength(3)
    } finally {
      controller.dispose()
      engine.dispose()
      remove()
    }
  }
)
