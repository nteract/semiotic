import * as React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"

const runWorker = vi.fn()

vi.mock("./layouts/forceLayoutWorkerClient", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./layouts/forceLayoutWorkerClient")>()
  return {
    ...actual,
    canUseForceWorker: () => true,
    runForceLayoutWorker: (...args: unknown[]) => runWorker(...args)
  }
})

import StreamNetworkFrame from "./StreamNetworkFrame"

describe("StreamNetworkFrame worker force layout", () => {
  let restoreCanvas: (() => void) | null = null

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    runWorker.mockReset()
  })

  afterEach(() => {
    restoreCanvas?.()
    restoreCanvas = null
  })

  it("shows an internal loading state and applies worker positions", async () => {
    let resolveWorker:
      | ((value: { positions: Record<string, { x: number; y: number }> }) => void)
      | undefined
    runWorker.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveWorker = resolve
        })
    )
    const onState = vi.fn()
    const { container } = render(
      <StreamNetworkFrame
        chartType="force"
        nodes={[{ id: "a" }, { id: "b" }]}
        edges={[{ source: "a", target: "b" }]}
        layoutExecution="worker"
        onLayoutStateChange={onState}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    })
    expect(onState).toHaveBeenCalledWith("pending")

    await act(async () => {
      resolveWorker?.({
        positions: {
          a: { x: 120, y: 140 },
          b: { x: 320, y: 260 }
        }
      })
    })

    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    })
    expect(onState).toHaveBeenCalledWith("ready")
  })

  it("ignores a stale worker response after graph replacement", async () => {
    const resolvers: Array<
      (value: { positions: Record<string, { x: number; y: number }> }) => void
    > = []
    runWorker.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        })
    )
    const firstNodes = [{ id: "a" }, { id: "b" }]
    const firstEdges = [{ source: "a", target: "b" }]
    const { container, rerender } = render(
      <StreamNetworkFrame
        chartType="force"
        nodes={firstNodes}
        edges={firstEdges}
        layoutExecution="worker"
      />
    )
    await waitFor(() => expect(runWorker).toHaveBeenCalledTimes(1))

    rerender(
      <StreamNetworkFrame
        chartType="force"
        nodes={[{ id: "x" }, { id: "y" }]}
        edges={[{ source: "x", target: "y" }]}
        layoutExecution="worker"
      />
    )
    await waitFor(() => expect(runWorker).toHaveBeenCalledTimes(2))

    await act(async () => {
      resolvers[0]({
        positions: {
          a: { x: 10, y: 10 },
          b: { x: 20, y: 20 }
        }
      })
    })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    await act(async () => {
      resolvers[1]({
        positions: {
          x: { x: 100, y: 100 },
          y: { x: 300, y: 240 }
        }
      })
    })
    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    })
  })

  it("invalidates a pending worker response when execution switches to sync", async () => {
    let resolveWorker:
      | ((value: { positions: Record<string, { x: number; y: number }> }) => void)
      | undefined
    runWorker.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveWorker = resolve
        })
    )
    const onState = vi.fn()
    const nodes = [{ id: "a" }, { id: "b" }]
    const edges = [{ source: "a", target: "b" }]
    const { rerender } = render(
      <StreamNetworkFrame
        chartType="force"
        nodes={nodes}
        edges={edges}
        layoutExecution="worker"
        onLayoutStateChange={onState}
      />
    )
    await waitFor(() => expect(runWorker).toHaveBeenCalledTimes(1))

    rerender(
      <StreamNetworkFrame
        chartType="force"
        nodes={nodes}
        edges={edges}
        layoutExecution="sync"
        onLayoutStateChange={onState}
      />
    )
    await waitFor(() => {
      expect(onState.mock.calls.filter(([state]) => state === "ready")).toHaveLength(1)
    })

    await act(async () => {
      resolveWorker?.({
        positions: {
          a: { x: 10, y: 10 },
          b: { x: 20, y: 20 }
        }
      })
    })
    expect(
      onState.mock.calls.filter(([state]) => state === "ready")
    ).toHaveLength(1)
  })

  it("falls back to synchronous layout after a worker error", async () => {
    runWorker.mockRejectedValue(new Error("worker unavailable"))
    const onState = vi.fn()
    const { container } = render(
      <StreamNetworkFrame
        chartType="force"
        nodes={[{ id: "a" }, { id: "b" }]}
        edges={[{ source: "a", target: "b" }]}
        layoutExecution="worker"
        onLayoutStateChange={onState}
      />
    )

    await waitFor(() => {
      expect(onState).toHaveBeenCalledWith("error")
      expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    })
  })

  it("does not run a second force layout for a custom network layout", async () => {
    const customLayout = vi.fn(() => ({
      sceneNodes: [],
      sceneEdges: [],
      labels: []
    }))
    const { container } = render(
      <StreamNetworkFrame
        chartType="force"
        nodes={[{ id: "a" }, { id: "b" }]}
        edges={[{ source: "a", target: "b" }]}
        customNetworkLayout={customLayout}
        layoutExecution="worker"
      />
    )

    await waitFor(() => expect(customLayout).toHaveBeenCalled())
    expect(runWorker).not.toHaveBeenCalled()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })
})
