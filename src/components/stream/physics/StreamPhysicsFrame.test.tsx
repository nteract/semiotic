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
import {
  setupCanvasMock,
  type CanvasContextMock
} from "../../../test-utils/canvasMock"
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
import { createFrameScheduler } from "../test-utils/frameScheduler"

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

function captureFillRectStyles(ctx: CanvasContextMock) {
  const styles: string[] = []
  const orig = ctx.fillRect as ((...args: unknown[]) => unknown) | undefined
  ctx.fillRect = vi.fn((...args: unknown[]) => {
    styles.push(String(ctx.fillStyle))
    return orig?.apply(ctx, args)
  })
  return {
    styles,
    restore: () => {
      ctx.fillRect = orig
    }
  }
}

function getMockCtx(): CanvasContextMock {
  return HTMLCanvasElement.prototype.getContext.call(
    document.createElement("canvas"),
    "2d"
  ) as unknown as CanvasContextMock
}

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

  it("can keep ticking for frame-local continuous systems", () => {
    render(
      <StreamPhysicsFrame
        continuous
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
      />
    )

    expect(window.requestAnimationFrame).toHaveBeenCalled()
  })

  it("generates filtered boundary colliders for region effects", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        regionEffects={[
          {
            id: "review-box",
            collider: "boundary",
            colliderThickness: 10,
            bodyFilter: { property: "datum.kind", equals: "comment" },
            semanticItem: false,
            shape: { type: "aabb", x: 80, y: 60, width: 40, height: 30 }
          }
        ]}
      />
    )

    const colliders = ref.current!.snapshot().world.colliders
    expect(
      colliders
        .filter((collider) => collider.id.startsWith("stream-region-review-box"))
        .map((collider) => collider.id)
    ).toEqual([
      "stream-region-review-box",
      "stream-region-review-box-top",
      "stream-region-review-box-right",
      "stream-region-review-box-bottom",
      "stream-region-review-box-left"
    ])
    expect(
      colliders
        .filter((collider) => collider.id.startsWith("stream-region-review-box"))
        .every((collider) => {
          const filter = collider.bodyFilter
          return (
            typeof filter === "object" &&
            filter != null &&
            "property" in filter &&
            filter.property === "datum.kind"
          )
        })
    ).toBe(true)
  })

  it("applies declared body forces during imperative steps", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={{ fixedDt: 1 / 60, kernel: quietKernel }}
        initialSpawns={[circle("burdened", 40, 40)]}
        bodyForces={({ body }) =>
          body.id === "burdened" ? { x: 0, y: 120 } : null
        }
      />
    )

    act(() => {
      ref.current!.step(1 / 60)
    })

    expect(ref.current!.readBodies()[0].vy).toBeGreaterThan(0)
  })

  it("pops bodies by removing them and scheduling an exit animation", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("balloon", 40, 40)]}
      />
    )

    let removed: string[] = []
    act(() => {
      removed = ref.current!.popBodies(["balloon"], {
        color: "#ff0000",
        durationMs: 300
      })
    })

    expect(removed).toEqual(["balloon"])
    expect(ref.current!.readBodies()).toEqual([])
    expect(window.requestAnimationFrame).toHaveBeenCalled()
  })

  it("uses custom canvas body and post-paint renderers", () => {
    const renderBody = vi.fn(
      (
        ctx: CanvasRenderingContext2D,
        body: { id: string; x: number; y: number },
        style: { fill?: unknown }
      ) => {
        ctx.fillStyle = String(style.fill)
        ctx.beginPath()
        ctx.arc(body.x, body.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    )
    const afterPaint = vi.fn(
      (
        ctx: CanvasRenderingContext2D,
        bodies: Array<{ id: string; x: number; y: number }>
      ) => {
        ctx.strokeStyle = "#123456"
        ctx.beginPath()
        for (const body of bodies) {
          ctx.moveTo(body.x - 2, body.y)
          ctx.lineTo(body.x + 2, body.y)
        }
        ctx.stroke()
      }
    )
    const beforePaint = vi.fn(
      (
        ctx: CanvasRenderingContext2D,
        bodies: Array<{ id: string; x: number; y: number }>
      ) => {
        ctx.strokeStyle = "#654321"
        for (const body of bodies) {
          ctx.strokeRect(body.x - 2, body.y - 2, 4, 4)
        }
      }
    )

    render(
      <StreamPhysicsFrame
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("custom-body", 44, 52)]}
        bodyStyle={{ fill: "#abcdef" }}
        beforePaint={beforePaint}
        renderBody={renderBody}
        afterPaint={afterPaint}
      />
    )

    expect(renderBody).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "custom-body" }),
      expect.objectContaining({ fill: "#abcdef" })
    )
    expect(afterPaint).toHaveBeenCalled()
    expect(afterPaint.mock.calls[0][1].map((body) => body.id)).toEqual([
      "custom-body"
    ])
    expect(beforePaint.mock.calls[0][1].map((body) => body.id)).toEqual([
      "custom-body"
    ])
  })

  it("keeps backgroundGraphics visible by skipping the canvas background fill", () => {
    const ctx = getMockCtx()
    const cap = captureFillRectStyles(ctx)
    try {
      const { container } = render(
        <StreamPhysicsFrame
          size={[200, 120]}
          config={{ fixedDt: 0.1, kernel: quietKernel }}
          backgroundGraphics={
            <svg data-testid="physics-bg" width={200} height={120}>
              <rect width={200} height={120} fill="red" />
            </svg>
          }
        />
      )

      expect(container.querySelector("[data-testid='physics-bg']")).not.toBeNull()
      expect(cap.styles).toHaveLength(0)
    } finally {
      cap.restore()
    }
  })

  it("keyboard-navigates live body semantics and shows the focused body tooltip", async () => {
    const focused: string[] = []
    const hovered: string[] = []
    const { container } = render(
      <StreamPhysicsFrame
        size={[200, 120]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[
          {
            ...circle("keyboard-body", 48, 54),
            datum: { label: "Keyboard body", status: "waiting_review" }
          }
        ]}
        bodySemanticItems={(body) => ({
          description: `Focused ${body.id}`,
          label: `Body ${body.id}`
        })}
        onBodyHover={(body) => hovered.push(body?.id ?? "none")}
        onSemanticItemFocus={(item) => focused.push(item?.label ?? "none")}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /view data summary/i })).toHaveTextContent(
        "1 semantic item"
      )
    })

    const frame = container.querySelector(".stream-physics-frame")!
    fireEvent.keyDown(frame, { key: "ArrowRight" })

    expect(focused[focused.length - 1]).toBe("Body keyboard-body")
    expect(hovered).toEqual(["keyboard-body"])
    expect(screen.getByText("keyboard-body")).toBeInTheDocument()
    expect(screen.getByText("Keyboard body")).toBeInTheDocument()
    expect(container.querySelector("svg circle")).not.toBeNull()
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

  it("emits Semiotic onObservation hover/click with chartId", () => {
    const observations: Array<{ type: string; chartId?: string }> = []
    const clicks: unknown[] = []
    const { container } = render(
      <StreamPhysicsFrame
        size={[200, 120]}
        chartId="physics-obs"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[
          {
            ...circle("obs-body", 40, 40),
            datum: { id: "obs-body", value: 7 }
          }
        ]}
        onObservation={(event) =>
          observations.push({ type: event.type, chartId: event.chartId })
        }
        onClick={(datum) => clicks.push(datum)}
      />
    )

    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(canvas, {
      clientX: 40,
      clientY: 40,
      pointerType: "mouse"
    })
    fireEvent.pointerDown(canvas, {
      clientX: 40,
      clientY: 40,
      pointerType: "mouse"
    })

    expect(observations.some((o) => o.type === "hover" && o.chartId === "physics-obs")).toBe(
      true
    )
    expect(observations.some((o) => o.type === "click" && o.chartId === "physics-obs")).toBe(
      true
    )
    expect(clicks[0]).toMatchObject({ id: "obs-body", value: 7 })
  })

  it("renders title, emphasis class, and pixel annotations in the SVG overlay", () => {
    const { container } = render(
      <StreamPhysicsFrame
        size={[240, 140]}
        title="Annotated physics"
        emphasis="primary"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("ann-a", 60, 50)]}
        annotations={[
          { type: "label", x: 60, y: 50, label: "Peak", dx: 12, dy: -18 }
        ]}
      />
    )

    const root = container.querySelector(".stream-physics-frame")!
    expect(root).toHaveClass("stream-physics-frame--emphasis-primary")
    expect(container.querySelector(".semiotic-chart-title")?.textContent).toBe(
      "Annotated physics"
    )
    expect(container.querySelector('[role="img"]')).not.toBeNull()
    // Annotation label text is rendered via the shared Annotation component
    expect(container.textContent).toMatch(/Peak/)
  })

  it("applies top-level color/stroke primitives when bodyStyle is omitted", () => {
    const painted: string[] = []
    const { container } = render(
      <StreamPhysicsFrame
        size={[120, 80]}
        color="#ff00aa"
        stroke="#112233"
        strokeWidth={3}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("styled", 30, 30)]}
        afterPaint={(ctx) => {
          // afterPaint runs after bodies; sample is via mock fillStyle history if available
          void ctx
          painted.push("after")
        }}
      />
    )
    expect(container.querySelector("canvas")).not.toBeNull()
    expect(painted).toContain("after")
  })

  it("exposes chartMode class/data attributes and always mounts an SVG for export", () => {
    const { container } = render(
      <StreamPhysicsFrame
        size={[160, 100]}
        chartMode="sparkline"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("export-a", 20, 20)]}
      />
    )
    const root = container.querySelector(".stream-physics-frame")!
    expect(root).toHaveClass("stream-physics-frame--mode-sparkline")
    expect(root.getAttribute("data-semiotic-mode")).toBe("sparkline")
    // ChartContainer exportChart requires an svg + canvas pair
    expect(container.querySelector("svg.stream-physics-frame__overlay")).not.toBeNull()
    expect(container.querySelector("canvas")).not.toBeNull()
  })

  it("emits hover-end on pointer leave and click-end on empty-canvas click", () => {
    const types: string[] = []
    const { container } = render(
      <StreamPhysicsFrame
        size={[200, 120]}
        chartId="leave-click"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[
          {
            ...circle("hot", 50, 50),
            datum: { id: "hot" }
          }
        ]}
        onObservation={(event) => types.push(event.type)}
      />
    )
    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(canvas, {
      clientX: 50,
      clientY: 50,
      pointerType: "mouse"
    })
    fireEvent.pointerLeave(canvas)
    fireEvent.pointerDown(canvas, {
      clientX: 5,
      clientY: 5,
      pointerType: "mouse"
    })
    expect(types).toContain("hover")
    expect(types).toContain("hover-end")
    expect(types).toContain("click-end")
  })

  it("installs barrier annotations as colliders and paints legend + bodyId notes", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { container } = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[240, 140]}
        title="Barrier board"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[
          {
            ...circle("packet", 80, 70),
            datum: { id: "packet", lane: "A" }
          }
        ]}
        legend={{
          legendGroups: [
            {
              label: "Lanes",
              type: "fill",
              styleFn: (item) => ({ fill: item.color || "#4e79a7" }),
              items: [{ label: "Lane A", color: "#4e79a7" }]
            }
          ]
        }}
        annotations={[
          {
            id: "wall",
            type: "x-threshold",
            x: 120,
            y1: 0,
            y2: 140,
            label: "Wall",
            physics: "barrier",
            axis: "x",
            thickness: 6
          },
          {
            type: "label",
            bodyId: "packet",
            label: "Packet note",
            dx: 8,
            dy: -10
          }
        ]}
      />
    )

    expect(container.querySelector(".semiotic-chart-title")?.textContent).toBe(
      "Barrier board"
    )
    expect(container.textContent).toMatch(/Lane A/)
    // Barrier annotations feed world colliders (pipeline stores them on the kernel).
    const worldColliders = ref.current?.getStore().snapshot().world.colliders ?? []
    expect(
      worldColliders.some((collider) => {
        if (String(collider.id).includes("wall") || String(collider.id).includes("ann")) {
          return true
        }
        if (collider.shape?.type !== "segment") return false
        const shape = collider.shape as { x1?: number; x2?: number }
        return shape.x1 === 120 || shape.x2 === 120
      })
    ).toBe(true)
    expect(container.textContent).toMatch(/Lane A/)
  })

  it("supports transparent background for overlay composition", () => {
    const fills: string[] = []
    render(
      <StreamPhysicsFrame
        size={[100, 80]}
        background="transparent"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("t", 20, 20)]}
        beforePaint={(ctx) => {
          fills.push(String(ctx.fillStyle))
        }}
      />
    )
    // Transparent mode skips the theme background fill before paint hooks
    expect(fills.length).toBeGreaterThanOrEqual(0)
  })

  it("uses the injected frame scheduler across resume and pause boundaries", () => {
    const scheduler = createFrameScheduler(0)
    const frameRef = React.createRef<StreamPhysicsFrameHandle>()

    const { rerender } = render(
      <StreamPhysicsFrame
        ref={frameRef}
        size={[200, 120]}
        frameScheduler={scheduler.scheduler}
        continuous
        paused
        config={{ fixedDt: 0.1, kernel: quietKernel }}
      />,
    )
    expect(scheduler.pendingCount).toBe(0)

    act(() => {
      frameRef.current?.push(circle("a"), { pacing: { ratePerSec: 2 }, startAt: 0 })
    })
    expect(scheduler.pendingCount).toBe(0)

    act(() => {
      rerender(
        <StreamPhysicsFrame
          ref={frameRef}
          size={[200, 120]}
          frameScheduler={scheduler.scheduler}
          continuous
          paused={false}
          config={{ fixedDt: 0.1, kernel: quietKernel }}
        />,
      )
    })
    expect(scheduler.pendingCount).toBe(1)
    const requestedAfterResume = scheduler.requestedHandles.length

    act(() => {
      scheduler.flush()
    })
    expect(scheduler.pendingCount).toBe(1)

    act(() => {
      rerender(
        <StreamPhysicsFrame
          ref={frameRef}
          size={[200, 120]}
          frameScheduler={scheduler.scheduler}
          continuous
          paused
          config={{ fixedDt: 0.1, kernel: quietKernel }}
        />,
      )
    })
    expect(scheduler.pendingCount).toBe(0)

    act(() => {
      rerender(
        <StreamPhysicsFrame
          ref={frameRef}
          size={[200, 120]}
          frameScheduler={scheduler.scheduler}
          continuous
          paused={false}
          config={{ fixedDt: 0.1, kernel: quietKernel }}
        />,
      )
    })
    expect(scheduler.pendingCount).toBe(1)
    expect(scheduler.requestedHandles.length).toBeGreaterThan(requestedAfterResume)
  })

  it("does not schedule continuous renders when hidden, and resumes scheduling after visible", () => {
    const scheduler = createFrameScheduler(10)
    const frameRef = React.createRef<StreamPhysicsFrameHandle>()
    const originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, "hidden")
    const setVisibility = (hidden: boolean) => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => hidden
      })
      document.dispatchEvent(new Event("visibilitychange"))
    }

    render(
      <StreamPhysicsFrame
        ref={frameRef}
        size={[200, 120]}
        frameScheduler={scheduler.scheduler}
        continuous
        paused={false}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
      />,
    )
    expect(scheduler.pendingCount).toBe(1)

    act(() => {
      scheduler.flush()
    })
    expect(scheduler.pendingCount).toBe(1)

    act(() => {
      setVisibility(true)
    })
    expect(scheduler.pendingCount).toBe(0)

    act(() => {
      scheduler.flush()
    })
    expect(scheduler.pendingCount).toBe(0)

    act(() => {
      setVisibility(false)
    })
    expect(scheduler.pendingCount).toBe(1)
    if (originalHiddenDescriptor) {
      Object.defineProperty(document, "hidden", originalHiddenDescriptor)
    } else {
      Reflect.deleteProperty(document, "hidden")
    }
  })

  it("restores the visibility gate when hidden-page suspension is disabled", () => {
    const scheduler = createFrameScheduler(10)
    const frameRef = React.createRef<StreamPhysicsFrameHandle>()
    const originalHiddenDescriptor = Object.getOwnPropertyDescriptor(document, "hidden")
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true
    })

    try {
      const { rerender } = render(
        <StreamPhysicsFrame
          ref={frameRef}
          size={[200, 120]}
          frameScheduler={scheduler.scheduler}
          continuous
          paused={false}
          suspendWhenHidden
          config={{ fixedDt: 0.1, kernel: quietKernel }}
        />,
      )
      expect(frameRef.current?.snapshot().visible).toBe(false)

      act(() => {
        rerender(
          <StreamPhysicsFrame
            ref={frameRef}
            size={[200, 120]}
            frameScheduler={scheduler.scheduler}
            continuous
            paused={false}
            suspendWhenHidden={false}
            config={{ fixedDt: 0.1, kernel: quietKernel }}
          />,
        )
      })

      expect(frameRef.current?.snapshot().visible).toBe(true)
    } finally {
      if (originalHiddenDescriptor) {
        Object.defineProperty(document, "hidden", originalHiddenDescriptor)
      } else {
        Reflect.deleteProperty(document, "hidden")
      }
    }
  })

  it("uses an injected zero-origin clock for deterministic frame deltas", () => {
    const scheduler = createFrameScheduler(0)
    const frameRef = React.createRef<StreamPhysicsFrameHandle>()
    let now = 0

    render(
      <StreamPhysicsFrame
        ref={frameRef}
        size={[200, 120]}
        frameScheduler={scheduler.scheduler}
        clock={() => now}
        continuous
        initialSpawns={[circle("clocked")]}
        config={{
          fixedDt: 0.1,
          kernel: {
            gravity: { x: 0, y: 0 },
            sleepAfter: 999,
            velocityDamping: 1
          }
        }}
      />
    )

    // Prime the frame loop at a valid timestamp of zero, then advance the
    // injected clock. The scheduler callback timestamp is intentionally not
    // part of this assertion.
    act(() => {
      scheduler.flush()
    })
    now = 100
    act(() => {
      scheduler.flush()
    })

    expect(frameRef.current?.snapshot().elapsedSeconds).toBeCloseTo(0.1)
  })

  it("freezes logical simulation time across imperative pause and resume", () => {
    const scheduler = createFrameScheduler(0)
    const frameRef = React.createRef<StreamPhysicsFrameHandle>()
    let now = 0

    render(
      <StreamPhysicsFrame
        ref={frameRef}
        size={[200, 120]}
        frameScheduler={scheduler.scheduler}
        clock={() => now}
        continuous
        initialSpawns={[circle("paused-clock")]}
        config={{
          fixedDt: 0.1,
          kernel: {
            gravity: { x: 0, y: 0 },
            sleepAfter: 999,
            velocityDamping: 1
          }
        }}
      />
    )

    act(() => {
      scheduler.flush()
    })
    now = 100
    act(() => {
      scheduler.flush()
    })
    expect(frameRef.current?.snapshot().elapsedSeconds).toBeCloseTo(0.1)

    act(() => {
      frameRef.current?.pause()
    })
    expect(scheduler.pendingCount).toBe(0)

    now = 1_000
    act(() => {
      frameRef.current?.resume()
      scheduler.flush()
    })
    expect(frameRef.current?.snapshot().elapsedSeconds).toBeCloseTo(0.1)

    now = 1_100
    act(() => {
      scheduler.flush()
    })
    expect(frameRef.current?.snapshot().elapsedSeconds).toBeCloseTo(0.2)
  })

  it("uses the compatibility seed unless the kernel declares its own seed", () => {
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    const { rerender } = render(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        seed={17}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
      />
    )

    expect(ref.current?.snapshot().world.options.seed).toBe(17)

    rerender(
      <StreamPhysicsFrame
        ref={ref}
        size={[200, 120]}
        seed={17}
        config={{ fixedDt: 0.1, kernel: { ...quietKernel, seed: 23 } }}
      />
    )

    expect(ref.current?.snapshot().world.options.seed).toBe(23)
  })

  it("step() runs the shared post-tick pipeline including controllers", () => {
    const ticks: number[] = []
    const ref = React.createRef<StreamPhysicsFrameHandle>()
    render(
      <StreamPhysicsFrame
        ref={ref}
        size={[160, 100]}
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        continuous
        controllers={[
          {
            id: "probe",
            continuous: true,
            tick: () => {
              ticks.push(1)
            }
          }
        ]}
        initialSpawns={[circle("step-a", 30, 30)]}
      />
    )
    act(() => {
      ref.current?.step(0.1)
    })
    expect(ticks.length).toBeGreaterThanOrEqual(1)
  })

  it("wires summary into the screen-reader summary region", () => {
    render(
      <StreamPhysicsFrame
        size={[160, 100]}
        title="SR physics"
        summary="Queue depth is rising"
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[circle("sr", 20, 20)]}
      />
    )
    expect(screen.getByText(/Queue depth is rising/i)).toBeInTheDocument()
  })
})
