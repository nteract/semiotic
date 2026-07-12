import * as React from "react"
import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import {
  PhysicsCustomChart,
  type PhysicsCustomLayout
} from "./PhysicsCustomChart"

describe("PhysicsCustomChart live geometry", () => {
  let cleanupCanvas: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    cleanupCanvas()
  })

  it("updates layout geometry without re-enqueueing pushed bodies", () => {
    type GeometryDatum = { id: string }
    type GeometryConfig = { wallOffset: number }
    const offsets: number[] = []
    const ref = React.createRef<PhysicsFrameHandle>()
    const layout: PhysicsCustomLayout<GeometryDatum, GeometryConfig> = (ctx) => {
      offsets.push(ctx.config.wallOffset)
      return {
        bodies: ctx.data.map((datum, index) => ({
          id: datum.id,
          x: 30 + index * 12,
          y: 30,
          mass: 1,
          shape: { type: "circle" as const, radius: 4 },
          datum
        })),
        colliders: [
          {
            id: "adaptive-wall",
            shape: {
              type: "segment" as const,
              x1: 10,
              y1: 80 + ctx.config.wallOffset,
              x2: 220,
              y2: 80 + ctx.config.wallOffset
            }
          }
        ],
        overlays: (
          <svg
            data-testid="adaptive-physics-overlay"
            data-wall-offset={ctx.config.wallOffset}
          />
        )
      }
    }

    const { getByTestId, rerender } = render(
      <PhysicsCustomChart
        ref={ref}
        data={[{ id: "seed" }]}
        layout={layout}
        layoutConfig={{ wallOffset: 0 }}
        size={[240, 150]}
      />
    )
    ref.current?.push({ id: "runtime" })
    expect(ref.current?.getData().map((datum) => datum.id)).toEqual([
      "seed",
      "runtime"
    ])

    rerender(
      <PhysicsCustomChart
        ref={ref}
        data={[{ id: "seed" }]}
        layout={layout}
        layoutConfig={{ wallOffset: 20 }}
        size={[240, 150]}
      />
    )

    expect(getByTestId("adaptive-physics-overlay").dataset.wallOffset).toBe(
      "20"
    )
    expect(offsets).toContain(20)
    expect(ref.current?.getData().map((datum) => datum.id)).toEqual([
      "seed",
      "runtime"
    ])
  })
})
