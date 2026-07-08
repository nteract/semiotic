import * as React from "react"
import { act } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  DataSummaryProvider,
  useDataSummaryToggle
} from "../../DataSummaryContext"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import StreamPhysicsFrame, {
  type StreamPhysicsExecutionState,
  type StreamPhysicsFrameHandle
} from "./StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "./PhysicsPipelineStore"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import type {
  PhysicsWorkerRequest,
  PhysicsWorkerResponse
} from "./PhysicsWorkerProtocol"

const quietKernel = {
  gravity: { x: 0, y: 0 },
  velocityDamping: 1,
  sleepSpeed: 100,
  sleepAfter: 0.01
}

function circle(id: string, x = 30, y = 30): PhysicsQueuedSpawn {
  return {
    id,
    x,
    y,
    shape: { type: "circle", radius: 5 },
    mass: 1
  }
}

class RuntimeWorker {
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent<PhysicsWorkerResponse>) => void) | null =
    null
  runtime = createPhysicsWorkerRuntime()
  terminated = false

  postMessage(request: PhysicsWorkerRequest): void {
    Promise.resolve().then(() => {
      if (this.terminated) return
      try {
        this.onmessage?.({
          data: {
            ok: true,
            payload: this.runtime.handle(request.command),
            requestId: request.requestId
          }
        } as MessageEvent<PhysicsWorkerResponse>)
      } catch (error) {
        this.onmessage?.({
          data: {
            error: {
              message: error instanceof Error ? error.message : String(error)
            },
            ok: false,
            requestId: request.requestId
          }
        } as MessageEvent<PhysicsWorkerResponse>)
      }
    })
  }

  terminate(): void {
    this.terminated = true
  }
}

const originalWorker = globalThis.Worker

function DataSummaryToggle() {
  const toggle = useDataSummaryToggle()
  return (
    <button type="button" onClick={() => toggle?.()}>
      Toggle data summary
    </button>
  )
}

describe("StreamPhysicsFrame", () => {
  let cleanupCanvas: () => void
  let container: HTMLDivElement

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    cleanupCanvas()
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: originalWorker
    })
    vi.restoreAllMocks()
  })

  it("renders a canvas-backed experimental frame with an imperative control surface", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
      />
    )

    expect(document.querySelector(".stream-physics-frame canvas")).not.toBeNull()
    expect(typeof ref.current?.pushMany).toBe("function")

    act(() => {
      ref.current?.pushMany([circle("a"), circle("b")], {
        pacing: { ratePerSec: 2 },
        startAt: 0
      })
    })
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    const result = ref.current!.step(0)
    expect(result.spawned).toEqual(["a"])
    expect(ref.current!.snapshot().queue.map((spawn) => spawn.id)).toEqual([
      "b"
    ])
  })

  it("does not schedule animation frames for a settled empty frame", () => {
    render(
      <StreamPhysicsFrame
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
      />
    )

    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it("selection restyles without resetting or revising the physics world", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { rerender } = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("a")]}
        selection={{ isActive: false }}
      />
    )
    const before = ref.current!.snapshot()

    rerender(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("a")]}
        selection={{
          isActive: true,
          predicate: (body) => body.id === "a"
        }}
      />
    )

    const after = ref.current!.snapshot()
    expect(after.revision).toBe(before.revision)
    expect(after.world.bodies.map((body) => body.id)).toEqual(["a"])
  })

  it("keyboard-navigates semantic physics items instead of bodies", () => {
    const focused: string[] = []
    const activated: string[] = []
    const { container } = render(
      <StreamPhysicsFrame
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        semanticItems={[
          {
            id: "flow-a",
            label: "Flow A",
            description: "Flow A carries 12 packets",
            x: 30,
            y: 40,
            shape: "path",
            pathData: "M 20 40 L 90 40"
          },
          {
            id: "flow-b",
            label: "Flow B",
            x: 80,
            y: 70,
            shape: "rect",
            width: 48,
            height: 20
          }
        ]}
        onSemanticItemFocus={(item) => focused.push(item?.label ?? "none")}
        onSemanticItemActivate={(item) => activated.push(item.label)}
      />
    )

    const frame = container.querySelector(".stream-physics-frame")!
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    expect(focused).toEqual(["Flow A"])
    expect(container.textContent).toContain("Flow A carries 12 packets")
    expect(container.querySelector("svg path")).not.toBeNull()

    fireEvent.keyDown(frame, { key: "ArrowRight" })
    fireEvent.keyDown(frame, { key: "Enter" })
    expect(focused).toEqual(["Flow A", "Flow B"])
    expect(activated).toEqual(["Flow B"])

    fireEvent.keyDown(frame, { key: "Escape" })
    expect(focused).toEqual(["Flow A", "Flow B", "none"])
  })

  it("shows and clears the default tooltip for hovered physics bodies", () => {
    const hovered: string[] = []
    const { container } = render(
      <StreamPhysicsFrame
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[
          {
            ...circle("hover-target", 50, 50),
            datum: { label: "Hovered packet", value: 42 }
          }
        ]}
        onBodyHover={(body) => hovered.push(body?.id ?? "none")}
      />
    )

    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(canvas, {
      clientX: 50,
      clientY: 50,
      pointerType: "mouse"
    })

    expect(screen.getByText("hover-target")).toBeInTheDocument()
    expect(screen.getByText("Hovered packet")).toBeInTheDocument()
    expect(hovered).toEqual(["hover-target"])

    fireEvent.pointerLeave(canvas)
    expect(screen.queryByText("hover-target")).toBeNull()
    expect(hovered).toEqual(["hover-target", "none"])
  })

  it("does not hit-test tooltips when hover is disabled", () => {
    const { container } = render(
      <StreamPhysicsFrame
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        enableHover={false}
        initialSpawns={[circle("no-hover", 50, 50)]}
      />
    )

    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(canvas, {
      clientX: 50,
      clientY: 50,
      pointerType: "mouse"
    })

    expect(screen.queryByText("no-hover")).toBeNull()
  })

  it("renders a paged accessible data table for semantic physics items", () => {
    render(
      <StreamPhysicsFrame
        size={[200, 120]}
        title="Semantic physics"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        semanticItems={Array.from({ length: 7 }, (_, index) => ({
          id: `flow-${index}`,
          label: `Flow ${index}`,
          description: `Flow ${index} throughput`,
          x: 20 + index,
          y: 40,
          group: "flow",
          datum: { throughput: index * 10 }
        }))}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: /view data summary/i })
    )

    const region = screen.getByRole("region", {
      name: /data summary for semantic physics/i
    })
    expect(region).toHaveClass("semiotic-accessible-data-table-visible")
    expect(screen.getByRole("table")).toHaveClass(
      "semiotic-accessible-data-table-table"
    )
    expect(screen.getAllByRole("row")).toHaveLength(6)
    expect(screen.getByText(/first 5 of 7 semantic items/i)).toBeInTheDocument()
    expect(screen.getByText("Flow 0")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /show .* more rows/i }))
    expect(screen.getAllByRole("row")).toHaveLength(8)
    expect(screen.getByText(/all 7 semantic items/i)).toBeInTheDocument()
  })

  it("opens the semantic data table from the shared data-summary context", () => {
    render(
      <DataSummaryProvider>
        <DataSummaryToggle />
        <StreamPhysicsFrame
          size={[200, 120]}
          title="Context physics"
          config={{ fixedDt: 0.1, kernel: quietKernel }}
          semanticItems={[
            {
              id: "route",
              label: "Route flow",
              x: 40,
              y: 60,
              group: "flow",
              datum: { packets: 12 }
            }
          ]}
        />
      </DataSummaryProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: /toggle data summary/i }))

    expect(
      screen.getByRole("region", { name: /data summary for context physics/i })
    ).toHaveClass("semiotic-accessible-data-table-visible")
    expect(screen.getAllByText("Route flow")).toHaveLength(2)
  })

  it("renders SVG on the server and hydrates to the canvas frame without mismatch warnings", () => {
    const props = {
      size: [200, 120] as [number, number],
      title: "Physics hydration",
      config: { fixedDt: 0.1, kernel: quietKernel },
      initialSpawns: [circle("a")]
    }
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const html = renderToString(<StreamPhysicsFrame {...props} />)

    expect(html).toContain("<svg")
    expect(html).not.toContain("<canvas")
    container.innerHTML = html

    let root: ReturnType<typeof hydrateRoot> | null = null
    act(() => {
      root = hydrateRoot(container, <StreamPhysicsFrame {...props} />)
    })

    const mismatchWarnings = errorSpy.mock.calls.filter((call) => {
      const message = String(call[0] ?? "")
      return /did not match|hydration failed|hydration error/i.test(message)
    })
    expect(mismatchWarnings).toEqual([])
    expect(container.querySelector(".stream-physics-frame")?.getAttribute("role")).toBe(
      "group"
    )
    expect(container.querySelector("canvas")).not.toBeNull()

    const mountedRoot = root as ReturnType<typeof hydrateRoot> | null
    mountedRoot?.unmount()
    errorSpy.mockRestore()
  })

  it("can run the frame loop through a resident physics worker", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: RuntimeWorker
    })
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const executionStates: StreamPhysicsExecutionState[] = []
    render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("worker-a")]}
        simulationExecution="worker"
        onSimulationExecutionChange={(state) => executionStates.push(state)}
      />
    )

    await waitFor(() => {
      expect(executionStates[executionStates.length - 1]?.execution).toBe(
        "worker"
      )
      expect(ref.current?.readBodies().map((body) => body.id)).toEqual([
        "worker-a"
      ])
    })

    act(() => {
      ref.current?.pushMany([circle("worker-b")])
    })

    await waitFor(() => {
      expect(ref.current?.readBodies().map((body) => body.id)).toEqual([
        "worker-a",
        "worker-b"
      ])
    })
  })
})
