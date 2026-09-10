import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  recordCanvasOps,
  setupCanvasMock,
  type CanvasContextMock
} from "../../../test-utils/canvasMock"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "./StreamPhysicsFrame"
import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import type {
  PhysicsWorkerRequest,
  PhysicsWorkerResponse
} from "./PhysicsWorkerProtocol"

class RuntimeWorker {
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent<PhysicsWorkerResponse>) => void) | null =
    null
  runtime = createPhysicsWorkerRuntime()
  terminated = false

  postMessage(request: PhysicsWorkerRequest) {
    queueMicrotask(() => {
      if (!this.terminated) {
        this.onmessage?.({
          data: {
            ok: true,
            payload: this.runtime.handle(request.command),
            requestId: request.requestId
          }
        } as MessageEvent<PhysicsWorkerResponse>)
      }
    })
  }

  terminate() {
    this.terminated = true
  }
}

const BODY_COLOR = "#104f70"
const POP_COLOR = "#ff00cc"
const config = {
  fixedDt: 0.1,
  kernel: {
    gravity: { x: 0, y: 0 },
    velocityDamping: 1,
    sleepSpeed: 100,
    sleepAfter: 0.01
  }
}
const initialSpawns = ["keep", "remove"].map((id, index) => ({
  id,
  x: 30 + index * 60,
  y: 30,
  mass: 1,
  shape: { type: "circle" as const, radius: 5 }
}))

describe.each(["sync", "worker"] as const)(
  "physics removal emphasis (%s)",
  (execution) => {
    let cleanupCanvas: () => void
    let matches: boolean
    let listeners: Set<(event: MediaQueryListEvent) => void>

    beforeEach(() => {
      cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
      matches = false
      listeners = new Set()
      vi.stubGlobal(
        "matchMedia",
        vi.fn((media: string) => ({
          get matches() {
            return matches
          },
          media,
          addEventListener: (
            _: string,
            listener: (event: MediaQueryListEvent) => void
          ) => listeners.add(listener),
          removeEventListener: (
            _: string,
            listener: (event: MediaQueryListEvent) => void
          ) => listeners.delete(listener)
        }))
      )
      vi.stubGlobal("Worker", RuntimeWorker)
    })

    afterEach(() => {
      cleanup()
      cleanupCanvas()
      vi.unstubAllGlobals()
    })

    async function mount(reducedMotion: boolean) {
      matches = reducedMotion
      const ref = React.createRef<StreamPhysicsFrameHandle>()
      const scheduler = createFrameScheduler()
      let now = 0
      let activeExecution = "sync"
      const ctx = document
        .createElement("canvas")
        .getContext("2d") as unknown as CanvasContextMock
      const ops = recordCanvasOps(ctx)
      render(
        <StreamPhysicsFrame
          ref={ref}
          size={[200, 120]}
          config={config}
          initialSpawns={initialSpawns}
          bodyStyle={{ fill: BODY_COLOR }}
          clock={() => now}
          frameScheduler={scheduler.scheduler}
          simulationExecution={execution}
          onSimulationExecutionChange={(state) => {
            activeExecution = state.execution
          }}
        />
      )
      await act(async () => {
        scheduler.flush()
      })
      expect(activeExecution).toBe(execution)
      expect(ref.current!.readBodies().map((body) => body.id)).toEqual([
        "keep",
        "remove"
      ])

      return {
        ref,
        scheduler,
        ops,
        clearPaint() {
          ops.fillStyles.length = 0
          ops.strokeStyles.length = 0
        },
        async advance(time: number) {
          now = time
          await act(async () => {
            scheduler.flush()
          })
        },
        async setReducedMotion(value: boolean) {
          await act(async () => {
            matches = value
            for (const listener of listeners) {
              listener({ matches: value } as MediaQueryListEvent)
            }
          })
        },
        async pop() {
          let removed: string[] = []
          await act(async () => {
            removed = ref.current!.popBodies(["remove"], {
              color: POP_COLOR,
              durationMs: 900
            })
            scheduler.flush()
          })
          expect(removed).toEqual(["remove"])
          expect(ref.current!.readBodies().map((body) => body.id)).toEqual([
            "keep"
          ])
        }
      }
    }

    it("removes bodies immediately without a frozen burst under reduced motion", async () => {
      const frame = await mount(true)
      frame.clearPaint()
      await frame.pop()
      expect(frame.ops.fillStyles).toContain(BODY_COLOR)
      expect(frame.ops.strokeStyles).not.toContain(POP_COLOR)
      expect(frame.scheduler.pendingCount).toBe(0)

      frame.clearPaint()
      await frame.setReducedMotion(false)
      await frame.advance(100)
      expect(frame.ops.strokeStyles).not.toContain(POP_COLOR)
    })

    it("clears an active burst when reduced motion is enabled and does not revive it", async () => {
      const frame = await mount(false)
      await frame.pop()
      expect(frame.ops.strokeStyles).toContain(POP_COLOR)

      frame.clearPaint()
      await frame.setReducedMotion(true)
      expect(frame.ops.fillStyles).toContain(BODY_COLOR)
      expect(frame.ops.strokeStyles).not.toContain(POP_COLOR)
      expect(frame.scheduler.pendingCount).toBe(0)

      frame.clearPaint()
      await frame.setReducedMotion(false)
      await frame.advance(100)
      expect(frame.ops.strokeStyles).not.toContain(POP_COLOR)
      expect(frame.ref.current!.readBodies().map((body) => body.id)).toEqual([
        "keep"
      ])
    })

    it("retains and expires removal emphasis when motion is allowed", async () => {
      const frame = await mount(false)
      await frame.pop()
      expect(frame.ops.strokeStyles).toContain(POP_COLOR)
      expect(frame.scheduler.pendingCount).toBe(1)

      frame.clearPaint()
      await frame.advance(1000)
      expect(frame.ops.fillStyles).toContain(BODY_COLOR)
      expect(frame.ops.strokeStyles).not.toContain(POP_COLOR)
      expect(frame.scheduler.pendingCount).toBe(0)
    })
  }
)
