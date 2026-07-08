import { describe, expect, it } from "vitest"
import {
  buildPhysicsNavigationTree,
  buildPhysicsSettledProjection,
  physicsObservationAnnouncement
} from "./PhysicsAccessibility"
import type { PhysicsBodyState } from "./PhysicsKernel"

function body(id: string, windowIndex: number, label = id): PhysicsBodyState {
  return {
    id,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    mass: 1,
    shape: { type: "circle", radius: 4 },
    sleeping: false,
    datum: { windowIndex, label }
  }
}

function windowContainerId(state: PhysicsBodyState): string | undefined {
  const datum = state.datum as { windowIndex?: number } | undefined
  return datum?.windowIndex == null ? undefined : `window-${datum.windowIndex}`
}

describe("physics accessibility helpers", () => {
  it("builds settled projection rows from aggregate containers plus live bodies", () => {
    const rows = buildPhysicsSettledProjection(
      [
        {
          id: "window-0",
          label: "0-12s",
          count: 3,
          secondary: 1,
          secondaryLabel: "late"
        },
        { id: "window-1", label: "12-24s", count: 1 }
      ],
      {
        bodies: [
          body("a", 0, "Order A"),
          body("b", 0, "Order B"),
          body("c", 1, "Order C")
        ],
        getContainerId: windowContainerId,
        recentBodyLimit: 1
      }
    )

    expect(rows.map((row) => [row.id, row.count, row.bodyIds])).toEqual([
      ["window-0", 3, ["a", "b"]],
      ["window-1", 1, ["c"]]
    ])
    expect(rows[0].share).toBeCloseTo(0.75)
    expect(rows[0].recentBodies).toEqual([
      {
        id: "b",
        label: "Order B",
        datum: { windowIndex: 0, label: "Order B" }
      }
    ])
  })

  it("builds a container-first navigation tree with recent bodies as leaves", () => {
    const rows = buildPhysicsSettledProjection(
      [
        { id: "window-0", label: "0-12s", count: 2, observed: 4 },
        { id: "window-1", label: "12-24s", count: 0 }
      ],
      {
        bodies: [body("a", 0, "Event A"), body("b", 0, "Event B")],
        getContainerId: windowContainerId
      }
    )
    const tree = buildPhysicsNavigationTree(rows, {
      chartId: "watermark",
      chartType: "EventDropChart",
      projectionLabel: "event-time window table"
    })

    expect(tree).toMatchObject({
      id: "watermark",
      role: "chart",
      level: 1
    })
    expect(tree.label).toContain("EventDropChart")
    expect(tree.children?.[0]).toMatchObject({
      id: "window-0",
      role: "series",
      level: 2,
      value: 2
    })
    expect(tree.children?.[0].label).toContain("2 bodies")
    expect(tree.children?.[0].label).toContain("4 observed")
    expect(tree.children?.[0].children?.map((child) => child.label)).toEqual([
      "Event A",
      "Event B"
    ])
  })

  it("formats live-region announcements from semantic observations", () => {
    const message = physicsObservationAnnouncement(
      {
        type: "physics-bin-enter",
        chartId: "chart",
        chartType: "EventDropChart",
        timestamp: 10,
        bodyId: "event-1",
        datum: { label: "Event 1" },
        sensorId: "sensor-0",
        binId: "0-12s"
      },
      {
        getDatumLabel: (datum) =>
          datum && typeof datum === "object"
            ? `${(datum as { label?: string }).label} data point`
            : undefined
      }
    )

    expect(message).toBe("Event 1 data point entered 0-12s.")
  })

  it("formats EventDrop domain observation announcements", () => {
    expect(
      physicsObservationAnnouncement({
        type: "physics-late",
        chartId: "chart",
        chartType: "EventDropChart",
        timestamp: 12,
        bodyId: "event-1",
        datum: { label: "Event 1" },
        binId: "0-12s"
      })
    ).toBe("Event 1 arrived late for 0-12s.")

    expect(
      physicsObservationAnnouncement({
        type: "physics-barrier-cross",
        chartId: "chart",
        chartType: "EventDropChart",
        timestamp: 14,
        barrierId: "watermark",
        barrierValue: 12,
        binId: "0-12s"
      })
    ).toBe("Watermark crossed 0-12s.")
  })

  it("formats proximity sensor announcements", () => {
    expect(
      physicsObservationAnnouncement({
        type: "physics-proximity-enter",
        chartId: "chart",
        chartType: "EventDropChart",
        timestamp: 15,
        bodyId: "event-1",
        datum: { label: "Event 1" },
        sensorId: "proximity-signal",
        binId: "arrival gate"
      })
    ).toBe("Event 1 entered proximity sensor arrival gate.")

    expect(
      physicsObservationAnnouncement({
        type: "physics-proximity-exit",
        chartId: "chart",
        chartType: "EventDropChart",
        timestamp: 16,
        bodyId: "event-1",
        datum: { label: "Event 1" },
        sensorId: "proximity-signal"
      })
    ).toBe("Event 1 exited proximity sensor proximity-signal.")
  })

  it("formats simulation lifecycle announcements", () => {
    expect(
      physicsObservationAnnouncement({
        type: "sim-active",
        chartId: "chart",
        chartType: "StreamPhysicsFrame",
        timestamp: 1
      })
    ).toBe("Simulation running.")
    expect(
      physicsObservationAnnouncement({
        type: "sim-idle",
        chartId: "chart",
        chartType: "StreamPhysicsFrame",
        timestamp: 2
      })
    ).toBe("Simulation settled.")
  })
})
