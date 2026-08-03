import { afterEach, describe, expect, it } from "vitest"
import {
  _resetSharedProcessSankeyLayoutSessionForTest,
  estimateProcessSankeyLayoutCost,
  ProcessSankeyLayoutWorkerSession,
  processSankeyStyleRulesNeedMainThread,
  reattachProcessSankeySceneDatums,
  runProcessSankeyLayoutWorker,
  shouldUseProcessSankeyWorker,
  type ProcessSankeyWorkerRequest,
  type ProcessSankeyWorkerResponse,
} from "./processSankeyLayoutWorkerClient"
import { buildProcessSankeyScenes } from "./buildScenes"

class MockWorker {
  static instances: MockWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false
  messages: unknown[] = []

  constructor() {
    MockWorker.instances.push(this)
  }

  postMessage(request: unknown): void {
    this.messages.push(request)
  }

  terminate(): void {
    this.terminated = true
  }
}

const originalWorker = globalThis.Worker

afterEach(() => {
  _resetSharedProcessSankeyLayoutSessionForTest()
  MockWorker.instances = []
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    value: originalWorker,
  })
})

describe("ProcessSankey layout worker client", () => {
  it("uses estimated work for automatic execution", () => {
    expect(shouldUseProcessSankeyWorker("sync", 1000, 1000, "reuse", "crossing-min")).toBe(false)
    expect(shouldUseProcessSankeyWorker("worker", 1, 0, "off", "insertion")).toBe(true)
    expect(shouldUseProcessSankeyWorker("auto", 4, 4, "off", "insertion")).toBe(false)
    // Dense river-scale packing + ordering exceeds the default threshold.
    expect(shouldUseProcessSankeyWorker("auto", 80, 100, "reuse", "crossing-min+inside-out")).toBe(true)
    expect(estimateProcessSankeyLayoutCost(80, 100, "reuse", "crossing-min")).toBeGreaterThan(50_000)
  })

  it("forces main thread when styleRules contain predicates", () => {
    expect(processSankeyStyleRulesNeedMainThread(undefined)).toBe(false)
    expect(processSankeyStyleRulesNeedMainThread([{ when: { gt: 1 }, style: { fill: "red" } }])).toBe(false)
    expect(processSankeyStyleRulesNeedMainThread([{ when: () => true, style: { fill: "red" } }])).toBe(true)
  })

  it("forces main thread for non-serializable accessors (processSankeyNeedsMainThread)", async () => {
    const { processSankeyNeedsMainThread } = await import("./processSankeyLayoutWorkerClient")
    expect(processSankeyNeedsMainThread({})).toBe(false)
    expect(processSankeyNeedsMainThread({
      styleRules: [{ when: { field: "status", eq: "x" }, style: { fill: "red" } }],
    })).toBe(false)
    expect(processSankeyNeedsMainThread({
      styleRules: [{ when: () => true, style: { fill: "red" } }],
    })).toBe(true)
    expect(processSankeyNeedsMainThread({
      labelPriorityAccessor: () => 1,
    })).toBe(true)
    expect(processSankeyNeedsMainThread({
      labelPriorityAccessor: "priority",
    })).toBe(false)
  })

  it("falls back when Worker is unavailable", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: undefined,
    })
    await expect(
      runProcessSankeyLayoutWorker({
        input: {
          nodes: [{ id: "A" }],
          edges: [],
          domain: [0, 1],
          plotW: 100,
          plotH: 100,
          ribbonLane: "both",
          edgeOpacity: 0.3,
          layoutOpts: {},
        },
        colorById: {},
        fallbackPalette: ["#000"],
      }),
    ).rejects.toThrow(/unavailable/i)
  })

  it("reuses a long-lived worker across layouts", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: MockWorker,
    })
    const request: ProcessSankeyWorkerRequest = {
      input: {
        nodes: [{ id: "A" }, { id: "B" }],
        edges: [{
          id: "e",
          source: "A",
          target: "B",
          value: 1,
          startTime: 0,
          endTime: 1,
        }],
        domain: [0, 2],
        plotW: 200,
        plotH: 200,
        ribbonLane: "both",
        edgeOpacity: 0.4,
        layoutOpts: { packing: "off", laneOrder: "insertion" },
      },
      colorById: { A: "#111", B: "#222" },
      fallbackPalette: ["#333"],
    }

    const first = runProcessSankeyLayoutWorker(request)
    const worker = MockWorker.instances[0]
    expect(MockWorker.instances).toHaveLength(1)
    const firstMsg = worker.messages[0] as { requestId: number }
    // Resolve with a minimal payload shaped like the worker response.
    worker.onmessage?.({
      data: {
        requestId: firstMsg.requestId,
        layout: null,
        layoutConfig: { bands: [], ribbons: [], showLabels: true },
        issues: [],
        warnings: [],
        domain: [0, 2],
        timelineExtent: 200,
      },
    } as MessageEvent)

    await expect(first).resolves.toMatchObject({
      domain: [0, 2],
      timelineExtent: 200,
    })
    expect(worker.terminated).toBe(false)

    const second = runProcessSankeyLayoutWorker(request)
    expect(MockWorker.instances).toHaveLength(1)
    const secondMsg = worker.messages[1] as { requestId: number }
    worker.onmessage?.({
      data: {
        requestId: secondMsg.requestId,
        layout: null,
        layoutConfig: { bands: [], ribbons: [], showLabels: true },
        issues: [],
        warnings: [],
        domain: [0, 2],
        timelineExtent: 200,
      },
    } as MessageEvent)
    await second
    expect(worker.terminated).toBe(false)
  })

  it("rejects with AbortError when cancelled without terminating the session", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: MockWorker,
    })
    const controller = new AbortController()
    const promise = runProcessSankeyLayoutWorker(
      {
        input: {
          nodes: [],
          edges: [],
          domain: [0, 1],
          plotW: 10,
          plotH: 10,
          ribbonLane: "both",
          edgeOpacity: 0.3,
          layoutOpts: {},
        },
        colorById: {},
        fallbackPalette: ["#000"],
      },
      controller.signal,
    )
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: "AbortError" })
    expect(MockWorker.instances[0].terminated).toBe(false)
  })

  it("reattaches raw datums and rebuilds the time scale after a worker response", () => {
    const response: ProcessSankeyWorkerResponse = {
      layout: null,
      layoutConfig: {
        bands: [{
          id: "A",
          pathD: "M0,0",
          fill: "#111",
          rawDatum: { id: "A" },
          labelX: 0,
          labelY: 0,
          labelText: "A",
        }],
        ribbons: [{
          id: "e",
          pathD: "M0,0",
          fill: "#111",
          opacity: 0.4,
          rawDatum: { id: "e" },
        }],
        showLabels: true,
      },
      issues: [],
      warnings: [],
      domain: [0, 100],
      timelineExtent: 400,
    }
    const rawNode = { id: "A", label: "Alpha" }
    const rawEdge = { id: "e", value: 3 }
    const revived = reattachProcessSankeySceneDatums(
      response,
      new Map([["A", rawNode]]),
      new Map([["e", rawEdge]]),
    )
    expect(revived.layoutConfig.bands[0].rawDatum).toBe(rawNode)
    expect(revived.layoutConfig.ribbons[0].rawDatum).toBe(rawEdge)
    // scaleTime may surface domain as Date objects; compare numeric ms.
    expect(revived.xScale.domain().map((d) => +d)).toEqual([0, 100])
    expect(revived.xScale.range()).toEqual([0, 400])
  })

  it("sync buildProcessSankeyScenes stays the source of truth for small graphs", () => {
    const common = {
      nodes: [
        { id: "A", xExtent: [0, 10] as [number, number] },
        { id: "B", xExtent: [0, 10] as [number, number] },
      ],
      edges: [{
        id: "e",
        source: "A",
        target: "B",
        value: 2,
        startTime: 2,
        endTime: 8,
      }],
      domain: [0, 10] as [number, number],
      plotW: 400,
      plotH: 300,
      ribbonLane: "both" as const,
      edgeOpacity: 0.35,
      colorOf: (id: string) => (id === "A" ? "#a" : "#b"),
      layoutOpts: {
        packing: "off" as const,
        laneOrder: "insertion" as const,
      },
    }
    const a = buildProcessSankeyScenes(common)
    const b = buildProcessSankeyScenes(common)
    expect(a.layoutConfig.bands.map((band) => band.pathD)).toEqual(
      b.layoutConfig.bands.map((band) => band.pathD),
    )
    expect(a.layout?.centerlines).toEqual(b.layout?.centerlines)
  })
})
