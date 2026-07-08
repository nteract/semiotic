import { describe, expect, it } from "vitest"
import type { PhysicsBodyState } from "./PhysicsKernel"
import {
  collidersFromPhysicsAnnotations,
  resolvePhysicsBodyAnnotations,
  summarizePhysicsAnnotations
} from "./PhysicsAnnotations"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"

function body(id: string, x: number, y: number): PhysicsBodyState {
  return {
    id,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: 0,
    angle: 0,
    mass: 1,
    shape: { type: "circle", radius: 4 },
    sleeping: false
  }
}

describe("physics annotation helpers", () => {
  it("turns x-threshold barrier annotations into segment colliders", () => {
    expect(
      collidersFromPhysicsAnnotations(
        [
          {
            id: "watermark",
            label: "Watermark",
            x: 42,
            y: 0,
            physics: "barrier"
          }
        ],
        {
          plotBounds: { x: 0, y: 10, width: 200, height: 90 },
          barrierThickness: 7,
          barrierRestitution: 0.02,
          barrierFriction: 0.18
        }
      )
    ).toEqual([
      {
        id: "watermark",
        sensor: false,
        restitution: 0.02,
        friction: 0.18,
        shape: {
          type: "segment",
          x1: 42,
          y1: 10,
          x2: 42,
          y2: 100,
          thickness: 7
        }
      }
    ])
  })

  it("turns y-threshold sensor annotations into segment sensors", () => {
    expect(
      collidersFromPhysicsAnnotations(
        [
          {
            id: "threshold",
            label: "Threshold",
            axis: "y",
            x: 0,
            y: 30,
            physics: "sensor"
          }
        ],
        {
          idPrefix: "annotation",
          plotBounds: { x: 5, y: 0, width: 95, height: 120 },
          sensorThickness: 12
        }
      )
    ).toEqual([
      {
        id: "annotation-threshold",
        sensor: true,
        shape: {
          type: "segment",
          x1: 5,
          y1: 30,
          x2: 100,
          y2: 30,
          thickness: 12
        }
      }
    ])
  })

  it("feeds sensor annotations into semantic store observations", () => {
    const colliders = collidersFromPhysicsAnnotations(
      [
        {
          id: "window-threshold",
          label: "Window threshold",
          x: 10,
          y: 0,
          y1: 0,
          y2: 30,
          physics: "sensor",
          thickness: 12
        }
      ]
    )
    const observations: string[] = []
    const store = new PhysicsPipelineStore({
      fixedDt: 1 / 60,
      colliders,
      kernel: {
        gravity: { x: 0, y: 0 },
        sleepSpeed: 100,
        sleepAfter: 0.01
      },
      observation: {
        sensors: {
          "window-threshold": {
            binId: "arrival gate",
            enterType: "physics-proximity-enter",
            exitType: "physics-proximity-exit"
          }
        },
        onObservation: (event) => observations.push(event.type)
      }
    })

    store.spawnNow({
      id: "event-1",
      x: 10,
      y: 10,
      shape: { type: "circle", radius: 4 },
      mass: 1,
      datum: { label: "Event 1" }
    })

    const result = store.tick(1 / 60)
    expect(result.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "physics-proximity-enter",
          bodyId: "event-1",
          sensorId: "window-threshold",
          binId: "arrival gate"
        })
      ])
    )
    expect(observations).toContain("physics-proximity-enter")
  })

  it("resolves body annotations from live body positions", () => {
    expect(
      resolvePhysicsBodyAnnotations(
        [
          {
            id: "selected",
            bodyId: "event-1",
            label: "Selected event",
            dx: 12,
            dy: -16
          }
        ],
        [body("event-1", 20, 30)]
      )
    ).toEqual([
      expect.objectContaining({
        id: "selected",
        bodyId: "event-1",
        label: "Selected event",
        anchorX: 20,
        anchorY: 30,
        labelX: 32,
        labelY: 14
      })
    ])
  })

  it("skips annotations whose bodies are not live", () => {
    expect(
      resolvePhysicsBodyAnnotations(
        [{ id: "missing", bodyId: "event-2", label: "Missing event" }],
        [body("event-1", 20, 30)]
      )
    ).toEqual([])
  })

  it("summarizes static and body annotation counts", () => {
    expect(
      summarizePhysicsAnnotations(
        [
          { id: "watermark", label: "Watermark", x: 10, y: 20, physics: "barrier" },
          { id: "sensor", label: "Sensor", x: 30, y: 40, physics: "sensor" },
          { id: "gutter", label: "Late gutter", x: 50, y: 60 }
        ],
        [{ id: "selected", bodyId: "event-1", label: "Selected event" }]
      )
    ).toEqual({
      bodyCount: 1,
      barrierCount: 1,
      sensorCount: 1,
      staticCount: 3,
      totalCount: 4
    })
  })
})
